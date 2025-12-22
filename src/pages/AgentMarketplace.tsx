import { useState } from 'react';
import { agents, domains, useCases } from '../data/agents';
import AgentCard from '../components/AgentCard';

export default function AgentMarketplace() {
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [selectedUseCase, setSelectedUseCase] = useState('All');
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  const filteredAgents = agents.filter((agent) => {
    const domainMatch = selectedDomain === 'All' || agent.domain === selectedDomain;
    const useCaseMatch = selectedUseCase === 'All' || agent.useCase === selectedUseCase;
    return domainMatch && useCaseMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Agent Marketplace</h1>
          <p className="text-gray-600 mt-2">
            AI agents that complete specific business tasks. Pay only for what runs.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Domain Filter */}
            <div>
              <label className="block text-gray-700 mb-2">Domain</label>
              <div className="flex flex-wrap gap-2">
                {domains.map((domain) => (
                  <button
                    key={domain}
                    onClick={() => setSelectedDomain(domain)}
                    className={`px-4 py-2 rounded border transition-colors ${
                      selectedDomain === domain
                        ? 'bg-[#17A2B8] text-white border-[#17A2B8]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#17A2B8]'
                    }`}
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>

            {/* Use Case Filter */}
            <div>
              <label className="block text-gray-700 mb-2">Use Case</label>
              <div className="flex flex-wrap gap-2">
                {useCases.map((useCase) => (
                  <button
                    key={useCase}
                    onClick={() => setSelectedUseCase(useCase)}
                    className={`px-4 py-2 rounded border transition-colors ${
                      selectedUseCase === useCase
                        ? 'bg-[#17A2B8] text-white border-[#17A2B8]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#17A2B8]'
                    }`}
                  >
                    {useCase}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            {filteredAgents.length} {filteredAgents.length === 1 ? 'agent' : 'agents'} found
          </p>
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} showRating={isLoggedIn} />
          ))}
        </div>

        {filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No agents found matching your filters.</p>
            <button
              onClick={() => {
                setSelectedDomain('All');
                setSelectedUseCase('All');
              }}
              className="mt-4 text-[#17A2B8] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
