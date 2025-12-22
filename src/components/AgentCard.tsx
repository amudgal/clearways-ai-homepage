import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Agent } from '../data/agents';

interface AgentCardProps {
  agent: Agent;
  showRating?: boolean;
}

export default function AgentCard({ agent, showRating = false }: AgentCardProps) {
  return (
    <Link
      to={`/agents/${agent.id}`}
      className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-[#17A2B8] hover:shadow-md transition-all"
    >
      <div className="space-y-3">
        <div>
          <h3 className="text-gray-900">{agent.name}</h3>
          <p className="text-gray-600 mt-1">{agent.outcome}</p>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-gray-500">Cost:</span>
            <span className="ml-2 text-gray-900">{agent.costRange}</span>
          </div>
          <div>
            <span className="text-gray-500">Confidence:</span>
            <span className="ml-2 text-gray-900">{agent.confidenceRange}</span>
          </div>
        </div>

        {showRating && agent.rating && (
          <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
            <Star size={16} className="text-[#17A2B8] fill-[#17A2B8]" />
            <span className="text-sm text-gray-900">{agent.rating}</span>
          </div>
        )}

        <div className="pt-3">
          <span className="inline-block text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded">
            View Agent
          </span>
        </div>
      </div>
    </Link>
  );
}
