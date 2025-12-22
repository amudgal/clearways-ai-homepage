import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type AnalysisType = 'TCO' | 'TIMELINE';

interface AnalysisTypeOption {
  type: AnalysisType;
  title: string;
  description: string;
  icon: typeof Calculator;
  color: string;
  bgColor: string;
}

const analysisTypes: AnalysisTypeOption[] = [
  {
    type: 'TCO',
    title: 'Total Cost of Ownership (TCO)',
    description: 'Comprehensive cost analysis including licensing, infrastructure, and support costs across different cloud platforms.',
    icon: Calculator,
    color: 'text-[#17A2B8]',
    bgColor: 'bg-cyan-50 hover:bg-cyan-100',
  },
  {
    type: 'TIMELINE',
    title: 'Timeline Estimate',
    description: 'Project timeline and milestone estimates for implementation and deployment phases.',
    icon: Clock,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
  },
];

export default function AnalysisTypeSelection() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedType, setSelectedType] = useState<AnalysisType | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Redirect if not logged in
  if (!authLoading && !isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handleContinue = () => {
    if (!selectedType) {
      return;
    }

    setIsCreating(true);
    // Navigate to analysis form with the selected type
    // Use 'create' as the id so it doesn't conflict with the /analysis/new route
    navigate(`/analysis/create?type=${selectedType}`);
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Analysis</h1>
          <p className="text-gray-600">
            Select the type of analysis you want to create
          </p>
        </div>

        {/* Analysis Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {analysisTypes.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedType === option.type;

            return (
              <button
                key={option.type}
                onClick={() => setSelectedType(option.type)}
                className={`${option.bgColor} border-2 rounded-lg p-6 text-left transition-all ${
                  isSelected
                    ? 'border-[#17A2B8] ring-2 ring-[#17A2B8] ring-opacity-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={isCreating}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 ${option.color}`}>
                    <Icon size={32} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {option.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {option.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-[#17A2B8] rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleBack}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedType || isCreating}
            className="px-6 py-3 bg-[#17A2B8] text-white rounded-lg hover:bg-[#138C9E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Continue
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-gray-900 mb-2 font-semibold">About Analysis Types</h3>
          <p className="text-gray-600 text-sm mb-2">
            Different analysis types provide different insights:
          </p>
          <ul className="text-gray-600 text-sm list-disc list-inside space-y-1">
            <li>
              <strong>TCO Analysis:</strong> Focuses on comprehensive cost breakdown including licensing, 
              infrastructure, and support costs across cloud platforms.
            </li>
            <li>
              <strong>Timeline Estimate:</strong> Provides project timeline and milestone estimates 
              for implementation phases.
            </li>
          </ul>
          <p className="text-gray-500 text-xs mt-3 italic">
            More analysis types will be added in the future.
          </p>
        </div>
      </div>
    </div>
  );
}

