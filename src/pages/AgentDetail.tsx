import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import { agents } from '../data/agents';
import InvocationModal from '../components/InvocationModal';

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [excludedSources, setExcludedSources] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [estimatedRecords, setEstimatedRecords] = useState(100);

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

  const handleRun = (input: { type: string; data: string | File }) => {
    setIsModalOpen(false);
    navigate(`/agents/${agent.id}/results`, { 
      state: { input, agent } 
    });
  };

  const estimatedCost = agent.usageCost.type === 'per-record'
    ? (agent.usageCost.amount * estimatedRecords).toFixed(2)
    : agent.usageCost.amount.toFixed(2);

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
