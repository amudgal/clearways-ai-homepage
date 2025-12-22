import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Star, ArrowRight, RefreshCw, AlertCircle, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import AgentLoadingScreen from '../components/AgentLoadingScreen';
import { toast } from 'sonner';
import { getApiBaseUrl } from '../utils/apiConfig';

const API_BASE_URL = getApiBaseUrl();

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

interface Result {
  id: string;
  data: Record<string, string>;
  confidence: number;
  sources: string[];
}

export default function AgentResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { input, agent, reasoning, jobId, job: initialJob } = location.state || {};
  const [rating, setRating] = useState(0);
  const [showRatingThank, setShowRatingThank] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Loading results...');
  const [showReasoning, setShowReasoning] = useState(true);
  const [results, setResults] = useState<Result[]>([]);
  const [job, setJob] = useState<any>(initialJob);
  const [allSourcesUsed, setAllSourcesUsed] = useState<string[]>([]);

  const [excludedSources, setExcludedSources] = useState<string[]>([]);
  const [showSourceManager, setShowSourceManager] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);

  // Load job results from API
  useEffect(() => {
    const loadResults = async () => {
      if (!agent) {
        setIsLoading(false);
        return;
      }

      // If we have a jobId, fetch the job results
      if (jobId) {
        try {
          const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
            headers: getAuthHeaders(),
          });

          if (response.ok) {
            const jobData = await response.json();
            setJob(jobData);

            // Extract results from entities - show all contractors even if no email found
            const emailResults: Result[] = [];
            const sourcesSet = new Set<string>();
            const processedEntityIds = new Set<string>();

            if (jobData.entities && Array.isArray(jobData.entities)) {
              jobData.entities.forEach((entity: any) => {
                const entityId = entity.id || entity.rocNumber;
                
                // Collect sources from entity
                if (entity.evidence && Array.isArray(entity.evidence)) {
                  entity.evidence.forEach((ev: any) => {
                    if (ev.source) sourcesSet.add(ev.source);
                  });
                }

                // If entity has email candidates, create a result for each email
                if (entity.emailCandidates && Array.isArray(entity.emailCandidates) && entity.emailCandidates.length > 0) {
                  entity.emailCandidates.forEach((candidate: any) => {
                    // Collect sources
                    if (candidate.source) {
                      sourcesSet.add(candidate.source);
                    }
                    if (candidate.evidence && Array.isArray(candidate.evidence)) {
                      candidate.evidence.forEach((ev: any) => {
                        if (ev.source) sourcesSet.add(ev.source);
                      });
                    }

                    // Create result with email
                    emailResults.push({
                      id: candidate.id || `email-${emailResults.length}`,
                      data: {
                        'Contractor Name': entity.contractorName || entity.businessName || 'Unknown',
                        'Email': candidate.email,
                        'ROC License': entity.rocNumber || 'N/A',
                        'Phone': entity.phone || 'N/A',
                        'Business Name': entity.businessName || entity.contractorName || 'N/A',
                        'Address': entity.address || 'N/A',
                        'Website': entity.officialWebsite || 'N/A',
                        'Classification': entity.classification || 'N/A',
                        'License Status': entity.licenseStatus || 'N/A',
                      },
                      confidence: candidate.confidence || 0,
                      sources: [
                        candidate.source,
                        ...(candidate.evidence?.map((e: any) => e.source) || []),
                      ].filter(Boolean),
                    });
                  });
                  processedEntityIds.add(entityId);
                } else {
                  // No email found, but still show all other information
                  if (!processedEntityIds.has(entityId)) {
                    emailResults.push({
                      id: `entity-${entityId}-no-email`,
                      data: {
                        'Contractor Name': entity.contractorName || entity.businessName || 'Unknown',
                        'Email': 'Not Found',
                        'ROC License': entity.rocNumber || 'N/A',
                        'Phone': entity.phone || 'N/A',
                        'Business Name': entity.businessName || entity.contractorName || 'N/A',
                        'Address': entity.address || 'N/A',
                        'Website': entity.officialWebsite || 'N/A',
                        'Classification': entity.classification || 'N/A',
                        'License Status': entity.licenseStatus || 'N/A',
                      },
                      confidence: 0,
                      sources: entity.evidence?.map((e: any) => e.source).filter(Boolean) || [],
                    });
                    processedEntityIds.add(entityId);
                  }
                }
              });
            }

            // Also check contractorRows to ensure all input contractors are represented
            if (jobData.contractorRows && Array.isArray(jobData.contractorRows)) {
              jobData.contractorRows.forEach((row: any) => {
                const rowId = row.rocNumber || row.id;
                // Check if we already have a result for this contractor
                const hasResult = emailResults.some(r => 
                  r.data['ROC License'] === row.rocNumber || 
                  r.data['Contractor Name'] === row.contractorName
                );

                if (!hasResult) {
                  // No result found for this contractor - add it with "Not Found" email
                  emailResults.push({
                    id: `row-${row.rowIndex || row.id}-no-email`,
                    data: {
                      'Contractor Name': row.contractorName || 'Unknown',
                      'Email': 'Not Found',
                      'ROC License': row.rocNumber || 'N/A',
                      'Phone': row.phone || 'N/A',
                      'Business Name': row.contractorName || 'N/A',
                      'Address': row.city ? `${row.city}, AZ` : 'N/A',
                      'Website': row.website || 'N/A',
                      'Classification': row.classification || 'N/A',
                      'License Status': row.licenseStatus || 'N/A',
                    },
                    confidence: 0,
                    sources: [],
                  });
                }
              });
            }

            setResults(emailResults);
            setAllSourcesUsed([
              ...(agent.sources || []),
              ...Array.from(sourcesSet),
            ]);
          } else {
            console.error('Failed to load job results');
            toast.error('Failed to load results');
          }
        } catch (error) {
          console.error('Error loading results:', error);
          toast.error('Error loading results');
        }
      } else {
        // No jobId - use mock data for demo
        setResults([]);
        setAllSourcesUsed(agent.sources || []);
      }

      setIsLoading(false);
    };

    loadResults();
  }, [agent, jobId]);

  // Show loading screen while processing
  if (isLoading && agent) {
    return <AgentLoadingScreen agentName={agent.name} status={loadingStatus} />;
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-gray-900 mb-4">No results to display</h2>
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
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const handleRerun = () => {
    setIsRerunning(true);
    // Simulate API call
    setTimeout(() => {
      setIsRerunning(false);
      // In production, this would re-fetch with excluded sources
    }, 1500);
  };

  const handleRating = (stars: number) => {
    setRating(stars);
    setShowRatingThank(true);
    setTimeout(() => setShowRatingThank(false), 3000);
  };

  const exportResults = (format: 'json' | 'csv') => {
    if (results.length === 0) {
      toast.error('No results to export');
      return;
    }

    if (format === 'json') {
      const dataStr = JSON.stringify(results, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      const exportFileDefaultName = `${agent.id}-results.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else {
      // CSV export
      const headers = Object.keys(results[0].data);
      const csvContent = [
        headers.join(','),
        ...results.map((r) => headers.map((h) => r.data[h]).join(',')),
      ].join('\n');
      const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
      const exportFileDefaultName = `${agent.id}-results.csv`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  // Identify newly discovered sources
  const newlyDiscoveredSources = allSourcesUsed.filter(
    (source) => !agent.sources.includes(source)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/agents/${agent.id}`)}
            className="text-[#17A2B8] hover:underline mb-4"
          >
            ← Back to Agent
          </button>
          <h1 className="text-gray-900 mb-2">{agent.name} Results</h1>
          <p className="text-gray-600">
            {results.length} email{results.length !== 1 ? 's' : ''} found
            {job?.contractorRows && ` from ${job.contractorRows.length} contractor${job.contractorRows.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Agent Reasoning Section */}
        {reasoning && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-[#17A2B8]" />
                <h2 className="text-gray-900 font-semibold">Agent Reasoning & Strategy</h2>
              </div>
              {showReasoning ? (
                <ChevronUp className="text-gray-600" />
              ) : (
                <ChevronDown className="text-gray-600" />
              )}
            </button>

            {showReasoning && (
              <div className="space-y-4">
                {reasoning.approach && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Discovery Approach: </span>
                    <span className="text-sm text-gray-900 capitalize font-semibold">{reasoning.approach.replace('-', ' ')}</span>
                  </div>
                )}

                {reasoning.reasoning && (
                  <div className="p-4 bg-[#17A2B8] bg-opacity-5 border border-[#17A2B8] border-opacity-20 rounded-lg">
                    <p className="text-sm text-gray-700 font-medium mb-2">Reasoning:</p>
                    <p className="text-sm text-gray-700">{reasoning.reasoning}</p>
                  </div>
                )}

                {reasoning.searchQueries && reasoning.searchQueries.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Search Queries Generated:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      {reasoning.searchQueries.map((query: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-600">{query}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {reasoning.prioritySources && reasoning.prioritySources.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Priority Sources:</p>
                    <div className="flex flex-wrap gap-2">
                      {reasoning.prioritySources.map((source: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-[#17A2B8] bg-opacity-10 text-[#17A2B8] text-sm rounded">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {reasoning.steps && reasoning.steps.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Execution Steps:</p>
                    <div className="space-y-2">
                      {reasoning.steps.map((step: any, idx: number) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-3 p-3 rounded border ${
                            step.status === 'completed'
                              ? 'bg-green-50 border-green-200'
                              : step.status === 'active'
                              ? 'bg-[#17A2B8] bg-opacity-5 border-[#17A2B8]'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <span className={`text-sm font-medium ${
                            step.status === 'completed' ? 'text-green-700' :
                            step.status === 'active' ? 'text-[#17A2B8]' :
                            'text-gray-500'
                          }`}>
                            {idx + 1}.
                          </span>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              step.status === 'completed' ? 'text-green-900' :
                              step.status === 'active' ? 'text-[#17A2B8]' :
                              'text-gray-700'
                            }`}>
                              {step.step}
                            </p>
                            {step.reasoning && (
                              <p className="text-xs text-gray-600 mt-1">{step.reasoning}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sources Manager */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-gray-900">Sources Used</h2>
              <p className="text-sm text-gray-600 mt-1">
                This agent discovered {allSourcesUsed.length} sources. Exclude sources and re-run to refine results.
              </p>
            </div>
            <button
              onClick={() => setShowSourceManager(!showSourceManager)}
              className="text-[#17A2B8] hover:underline text-sm"
            >
              {showSourceManager ? 'Hide' : 'Manage Sources'}
            </button>
          </div>

          {/* Newly Discovered Sources Alert */}
          {newlyDiscoveredSources.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-[#17A2B8] bg-opacity-5 border border-[#17A2B8] border-opacity-20 rounded-lg mb-4">
              <AlertCircle size={20} className="text-[#17A2B8] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900">
                  Agent discovered {newlyDiscoveredSources.length} new {newlyDiscoveredSources.length === 1 ? 'source' : 'sources'}:
                  <span className="ml-1 text-[#17A2B8]">
                    {newlyDiscoveredSources.join(', ')}
                  </span>
                </p>
              </div>
            </div>
          )}

          {showSourceManager && (
            <div className="space-y-2">
              {allSourcesUsed.map((source) => {
                const isExcluded = excludedSources.includes(source);
                const isNewlyDiscovered = newlyDiscoveredSources.includes(source);
                
                return (
                  <div
                    key={source}
                    className={`flex items-center justify-between p-3 border rounded transition-colors ${
                      isExcluded
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={isExcluded ? 'text-gray-500 line-through' : 'text-gray-700'}>
                        {source}
                      </span>
                      {isNewlyDiscovered && (
                        <span className="px-2 py-0.5 text-xs bg-[#17A2B8] text-white rounded">
                          New
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleSource(source)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        isExcluded
                          ? 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                          : 'bg-[#17A2B8] bg-opacity-10 text-[#17A2B8] hover:bg-opacity-20'
                      }`}
                    >
                      {isExcluded ? 'Include' : 'Exclude'}
                    </button>
                  </div>
                );
              })}

              {excludedSources.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
                  <p className="text-sm text-gray-600">
                    {excludedSources.length} {excludedSources.length === 1 ? 'source' : 'sources'} excluded
                  </p>
                  <button
                    onClick={handleRerun}
                    disabled={isRerunning}
                    className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                      isRerunning
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#17A2B8] text-white hover:bg-[#138C9E]'
                    }`}
                  >
                    <RefreshCw size={16} className={isRerunning ? 'animate-spin' : ''} />
                    {isRerunning ? 'Re-running...' : 'Re-run Agent'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Output Preview */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-gray-900">Output Preview</h2>
            <div className="flex gap-3">
              <button
                onClick={() => exportResults('json')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download size={18} />
                JSON
              </button>
              <button
                onClick={() => exportResults('csv')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download size={18} />
                CSV
              </button>
            </div>
          </div>

          {/* Results Table */}
          {results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {Object.keys(results[0].data).map((header) => (
                      <th
                        key={header}
                        className="px-6 py-3 text-left text-gray-700"
                      >
                        {header}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-gray-700">
                      Confidence
                    </th>
                    <th className="px-6 py-3 text-left text-gray-700">
                      Sources
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      {Object.values(result.data).map((value, idx) => (
                        <td key={idx} className="px-6 py-4 text-gray-700">
                          {value}
                        </td>
                      ))}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                            <div
                              className={`h-2 rounded-full ${
                                result.confidence >= 80
                                  ? 'bg-green-600'
                                  : result.confidence >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${result.confidence}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-700">
                            {result.confidence}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {result.sources.join(', ')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No results found</p>
              <p className="text-sm text-gray-500">
                The agent is still processing or no emails were discovered.
              </p>
            </div>
          )}
        </div>

        {/* Rating Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-6">
          <h2 className="text-gray-900 mb-4">Rate This Agent</h2>
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                className="transition-colors"
              >
                <Star
                  size={32}
                  className={
                    star <= rating
                      ? 'text-[#17A2B8] fill-[#17A2B8]'
                      : 'text-gray-300'
                  }
                />
              </button>
            ))}
          </div>
          {showRatingThank && (
            <p className="text-sm text-[#17A2B8]">Thank you for your rating!</p>
          )}
        </div>

        {/* Custom Agent Request CTA */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <h2 className="text-gray-900 mb-3">Need a Custom Agent?</h2>
          <p className="text-gray-600 mb-6">
            If this agent doesn't fit your needs, tell us what you're looking for.
          </p>
          <button
            onClick={() => navigate('/agents/request')}
            className="bg-[#17A2B8] text-white px-6 py-3 rounded hover:bg-[#138C9E] transition-colors inline-flex items-center gap-2"
          >
            Request a Custom Agent
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}