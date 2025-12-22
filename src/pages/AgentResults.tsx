import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Star, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import AgentLoadingScreen from '../components/AgentLoadingScreen';

interface Result {
  id: string;
  data: Record<string, string>;
  confidence: number;
  sources: string[];
}

export default function AgentResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { input, agent } = location.state || {};
  const [rating, setRating] = useState(0);
  const [showRatingThank, setShowRatingThank] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Loading results...');

  // All sources used (including newly discovered ones)
  const allSourcesUsed = [
    ...(agent?.sources || []),
    'Public Records Archive', // Newly discovered
    'Business Directory API', // Newly discovered
  ];

  const [excludedSources, setExcludedSources] = useState<string[]>([]);
  const [showSourceManager, setShowSourceManager] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);

  // Simulate loading when component first mounts
  useEffect(() => {
    if (!agent) {
      setIsLoading(false);
      return;
    }

    // Simulate processing time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [agent]);

  // Mock results - in production, these would come from API
  const mockResults: Result[] = Array.from({ length: 5 }, (_, i) => ({
    id: `result-${i + 1}`,
    data:
      agent?.id === 'az-roc-emails'
        ? {
            'Contractor Name': `Sample Contractor ${i + 1}`,
            'Email': `contact${i + 1}@contractor.com`,
            'ROC License': `ROC${300000 + i}`,
            'Phone': `(602) 555-${1000 + i}`,
          }
        : agent?.id === 'property-comps'
        ? {
            'Address': `${1000 + i} Main St, Phoenix, AZ`,
            'Sale Price': `$${(450000 + i * 25000).toLocaleString()}`,
            'Price/SqFt': `$${(250 + i * 10)}`,
            'Beds/Baths': `${3 + (i % 2)}/${2 + (i % 2)}`,
          }
        : {
            'Record': `Data ${i + 1}`,
            'Value': `Result ${i + 1}`,
            'Status': 'Verified',
          },
    confidence: 85 + Math.floor(Math.random() * 10),
    sources: agent?.sources.slice(0, 2 + (i % 2)) || ['Source 1', 'Source 2'],
  }));

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
    if (format === 'json') {
      const dataStr = JSON.stringify(mockResults, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      const exportFileDefaultName = `${agent.id}-results.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else {
      // CSV export
      const headers = Object.keys(mockResults[0].data);
      const csvContent = [
        headers.join(','),
        ...mockResults.map((r) => headers.map((h) => r.data[h]).join(',')),
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
            {mockResults.length} results processed
          </p>
        </div>

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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {Object.keys(mockResults[0].data).map((header) => (
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
                {mockResults.map((result) => (
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
                            className="bg-[#17A2B8] h-2 rounded-full"
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