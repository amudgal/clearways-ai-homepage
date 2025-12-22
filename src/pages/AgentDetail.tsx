import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import { agents } from '../data/agents';
import InvocationModal from '../components/InvocationModal';
import AgentLoadingScreen from '../components/AgentLoadingScreen';
import { toast } from 'sonner';

// API configuration
const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [excludedSources, setExcludedSources] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [estimatedRecords, setEstimatedRecords] = useState(100);
  const [isRunning, setIsRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<string>('');
  const [reasoning, setReasoning] = useState<any>(null);

  const agent = agents.find((a) => a.id === id);

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-gray-900 mb-4">Agent not found</h2>
          <button
            onClick={() => navigate('/agents')}
            className="text-[#17A2B8] hover:underline"
          >
            Return to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const toggleSource = (source: string) => {
    setExcludedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  };

  const handleRun = async (input: { type: string; data: string | File }) => {
    setIsModalOpen(false);
    setIsRunning(true);
    setRunStatus('Initializing agent...');
    
    try {
      // Parse CSV if file was uploaded
      let contractorRows: any[] = [];
      if (input.type === 'file' && input.data instanceof File) {
        const text = await input.data.text();
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        contractorRows = lines.slice(1).map((line, idx) => {
          const values = line.split(',').map(v => v.trim());
          const row: any = { rowIndex: idx };
          headers.forEach((header, i) => {
            row[header.toLowerCase().replace(/\s+/g, '')] = values[i] || '';
          });
          return row;
        });
      } else if (input.type === 'text') {
        // Parse text input (one contractor per line or CSV format)
        const lines = (input.data as string).split('\n').filter(line => line.trim());
        contractorRows = lines.map((line, idx) => {
          const parts = line.split(',').map(p => p.trim());
          return {
            rowIndex: idx,
            rocNumber: parts[0] || '',
            contractorName: parts[1] || parts[0] || '',
            city: parts[2] || '',
          };
        });
      }

      if (contractorRows.length === 0) {
        toast.error('No contractor data provided');
        setIsRunning(false);
        return;
      }

      setRunStatus('Creating job...');
      
      // Create job via API
      const createJobResponse = await fetch(`${getApiBaseUrl()}/jobs/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          contractorRows: contractorRows,
          preferences: {
            useLLM: true,
            excludedDomains: [],
          },
        }),
      });

      if (!createJobResponse.ok) {
        const error = await createJobResponse.json().catch(() => ({ error: 'Failed to create job' }));
        throw new Error(error.error || 'Failed to start agent job');
      }

      const jobData = await createJobResponse.json();
      const jobId = jobData.jobId || jobData.id;

      setRunStatus('Job created. Processing contractors...');
      setReasoning({
        approach: 'roc-first',
        reasoning: 'Starting email discovery for contractors. Using LLM to plan strategy based on ROC data.',
        searchQueries: [],
        prioritySources: ['roc', 'official-website', 'linkedin', 'business-directories'],
        steps: [
          { step: 'ROC Lookup', status: 'active', reasoning: 'Querying Arizona ROC database for contractor information' },
          { step: 'Strategy Planning', status: 'pending', reasoning: 'Analyzing ROC data to plan email discovery approach' },
          { step: 'Query Generation', status: 'pending', reasoning: 'Generating intelligent search queries based on contractor type' },
          { step: 'Source Discovery', status: 'pending', reasoning: 'Searching web sources for contact information' },
          { step: 'Email Extraction', status: 'pending', reasoning: 'Extracting email addresses from discovered sources' },
          { step: 'Validation', status: 'pending', reasoning: 'Validating email addresses and computing confidence scores' },
        ]
      });

      // Poll for job completion or use SSE for real-time updates
      const pollJobStatus = async () => {
        const maxAttempts = 120; // 10 minutes max
        let attempts = 0;

        const checkStatus = async () => {
          try {
            const statusResponse = await fetch(`${getApiBaseUrl()}/jobs/${jobId}`, {
              headers: getAuthHeaders(),
            });

            if (!statusResponse.ok) {
              throw new Error('Failed to check job status');
            }

            const job = await statusResponse.json();
            
            // Update reasoning with actual strategy if available
            if (job.strategy) {
              setReasoning((prev: any) => ({
                ...prev,
                approach: job.strategy.approach,
                reasoning: job.strategy.reasoning,
                searchQueries: job.strategy.searchQueries || prev.searchQueries,
              }));
            }

            // Update status
            if (job.status === 'processing') {
              setRunStatus(`Processing ${job.processedCount || 0} of ${contractorRows.length} contractors...`);
            } else if (job.status === 'completed') {
              setIsRunning(false);
              navigate(`/agents/${agent.id}/results`, {
                state: {
                  input,
                  agent,
                  reasoning,
                  jobId,
                  job,
                },
              });
              return;
            } else if (job.status === 'failed') {
              throw new Error(job.error || 'Job failed');
            }

            attempts++;
            if (attempts < maxAttempts && job.status !== 'completed' && job.status !== 'failed') {
              setTimeout(checkStatus, 5000); // Poll every 5 seconds
            } else if (attempts >= maxAttempts) {
              throw new Error('Job timeout - taking too long');
            }
          } catch (error) {
            console.error('Error checking job status:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to check job status');
            setIsRunning(false);
          }
        };

        checkStatus();
      };

      pollJobStatus();
    } catch (error) {
      console.error('Error running agent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to run agent');
      setIsRunning(false);
    }
  };

  const estimatedCost = agent.usageCost.type === 'per-record'
    ? (agent.usageCost.amount * estimatedRecords).toFixed(2)
    : agent.usageCost.amount.toFixed(2);

  // Show loading screen while agent is running
  if (isRunning) {
    return <AgentLoadingScreen agentName={agent.name} status={runStatus} reasoning={reasoning} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/agents')}
          className="text-[#17A2B8] hover:underline mb-6"
        >
          ← Back to Marketplace
        </button>

        {/* Agent Name */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
          <h1 className="text-gray-900 mb-3">{agent.name}</h1>
          <p className="text-gray-600 text-lg">{agent.outcome}</p>
        </div>

        {/* What This Agent Does */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
          <h2 className="text-gray-900 mb-4">What This Agent Does</h2>
          <ul className="space-y-2">
            {agent.description.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-[#17A2B8] mt-1">•</span>
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* How It Works (Collapsible) */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-gray-900">How It Works</h2>
            {showHowItWorks ? (
              <ChevronUp className="text-gray-600" />
            ) : (
              <ChevronDown className="text-gray-600" />
            )}
          </button>
          
          {showHowItWorks && (
            <div className="mt-6">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-[#17A2B8] bg-opacity-10 rounded-full flex items-center justify-center mb-2">
                    <span className="text-[#17A2B8]">1</span>
                  </div>
                  <p className="text-sm text-gray-600 text-center">Input</p>
                </div>
                <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-[#17A2B8] bg-opacity-10 rounded-full flex items-center justify-center mb-2">
                    <span className="text-[#17A2B8]">2</span>
                  </div>
                  <p className="text-sm text-gray-600 text-center">Sources</p>
                </div>
                <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-[#17A2B8] bg-opacity-10 rounded-full flex items-center justify-center mb-2">
                    <span className="text-[#17A2B8]">3</span>
                  </div>
                  <p className="text-sm text-gray-600 text-center">Output</p>
                </div>
              </div>
              <p className="text-gray-600 mt-6 text-center">
                Agent processes your input, queries selected sources, and returns structured results with confidence scores.
              </p>
            </div>
          )}
        </div>

        {/* Sources Used */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
          <h2 className="text-gray-900 mb-4">Sources Used</h2>
          <div className="space-y-3">
            {agent.sources.map((source) => (
              <div
                key={source}
                className="flex items-center justify-between p-3 border border-gray-200 rounded"
              >
                <span className="text-gray-700">{source}</span>
                <button
                  onClick={() => toggleSource(source)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    excludedSources.includes(source)
                      ? 'bg-gray-200 text-gray-600'
                      : 'bg-[#17A2B8] bg-opacity-10 text-[#17A2B8]'
                  }`}
                >
                  {excludedSources.includes(source) ? 'Excluded' : 'Included'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Transparency */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
          <h2 className="text-gray-900 mb-4">Cost Transparency</h2>
          <div className="space-y-4">
            {agent.setupCost > 0 && (
              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <span className="text-gray-700">Setup Fee (One-time):</span>
                <span className="text-gray-900">${agent.setupCost.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <span className="text-gray-700">
                Usage ({agent.usageCost.type.replace('per-', 'Per ')}):
              </span>
              <span className="text-gray-900">${agent.usageCost.amount.toFixed(2)}</span>
            </div>

            {/* Cost Estimator */}
            {agent.usageCost.type === 'per-record' && (
              <div className="pt-4">
                <label className="block text-gray-700 mb-3">Estimate Your Cost</label>
                <input
                  type="range"
                  min="10"
                  max="10000"
                  step="10"
                  value={estimatedRecords}
                  onChange={(e) => setEstimatedRecords(Number(e.target.value))}
                  className="w-full accent-[#17A2B8]"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>10 records</span>
                  <span>10,000 records</span>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <div className="flex justify-between">
                    <span className="text-gray-700">{estimatedRecords.toLocaleString()} records:</span>
                    <span className="text-gray-900">${estimatedCost}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confidence & Trust */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
          <h2 className="text-gray-900 mb-4">Confidence & Trust</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-gray-700">Confidence Score:</span>
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div
                  className="bg-[#17A2B8] h-3 rounded-full"
                  style={{ width: `${agent.confidenceScore}%` }}
                ></div>
              </div>
              <span className="text-gray-900">{agent.confidenceScore}%</span>
            </div>
            <p className="text-gray-600 text-sm">{agent.confidenceExplanation}</p>
            <p className="text-gray-600 text-sm border-t border-gray-200 pt-4">
              Audit trail available after each run. You can verify sources for every result.
            </p>
          </div>
        </div>

        {/* Run Agent CTA */}
        <div className="flex justify-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#17A2B8] text-white px-8 py-3 rounded hover:bg-[#138C9E] transition-colors flex items-center gap-2"
          >
            <Play size={20} />
            Run Agent
          </button>
        </div>
      </div>

      {/* Invocation Modal */}
      <InvocationModal
        agent={agent}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRun={handleRun}
      />
    </div>
  );
}
