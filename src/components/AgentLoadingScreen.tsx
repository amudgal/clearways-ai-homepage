// Loading screen component for agent execution
import { Loader2 } from 'lucide-react';

interface AgentLoadingScreenProps {
  agentName: string;
  status?: string;
}

export default function AgentLoadingScreen({ agentName, status }: AgentLoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Spinner */}
        <div className="flex justify-center mb-6">
          <Loader2 className="w-16 h-16 text-[#17A2B8] animate-spin" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Running {agentName}
        </h2>

        {/* Status */}
        {status && (
          <p className="text-gray-600 mb-6">{status}</p>
        )}

        {/* Progress Steps */}
        <div className="space-y-3 text-left">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#17A2B8] flex items-center justify-center">
              <span className="text-white text-xs">1</span>
            </div>
            <span className="text-gray-700">Processing input data</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 text-xs">2</span>
            </div>
            <span className="text-gray-500">Querying sources</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 text-xs">3</span>
            </div>
            <span className="text-gray-500">Validating results</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 text-xs">4</span>
            </div>
            <span className="text-gray-500">Generating report</span>
          </div>
        </div>

        {/* Info Message */}
        <p className="text-sm text-gray-500 mt-6">
          This may take a few moments. Please don't close this window.
        </p>
      </div>
    </div>
  );
}

