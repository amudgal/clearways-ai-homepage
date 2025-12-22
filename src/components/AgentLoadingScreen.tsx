// Loading screen component for agent execution
import { Loader2, Brain, CheckCircle2, Circle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ReasoningStep {
  step: string;
  status: 'pending' | 'active' | 'completed';
  reasoning?: string;
  details?: any;
}

interface AgentLoadingScreenProps {
  agentName: string;
  status?: string;
  reasoning?: {
    strategy?: string;
    approach?: string;
    reasoning?: string;
    searchQueries?: string[];
    prioritySources?: string[];
    steps?: ReasoningStep[];
  };
}

export default function AgentLoadingScreen({ agentName, status, reasoning }: AgentLoadingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Default steps if reasoning not provided
  const defaultSteps: ReasoningStep[] = [
    { step: 'ROC Lookup', status: 'active', reasoning: 'Querying Arizona ROC database for contractor information' },
    { step: 'Strategy Planning', status: 'pending', reasoning: 'Analyzing ROC data to plan email discovery approach' },
    { step: 'Query Generation', status: 'pending', reasoning: 'Generating intelligent search queries based on contractor type' },
    { step: 'Source Discovery', status: 'pending', reasoning: 'Searching web sources for contact information' },
    { step: 'Email Extraction', status: 'pending', reasoning: 'Extracting email addresses from discovered sources' },
    { step: 'Validation', status: 'pending', reasoning: 'Validating email addresses and computing confidence scores' },
  ];

  const steps = reasoning?.steps || defaultSteps;

  useEffect(() => {
    // Simulate step progression
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Loader2 className="w-16 h-16 text-[#17A2B8] animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Running {agentName}
          </h2>
          {status && (
            <p className="text-gray-600">{status}</p>
          )}
        </div>

        {/* Reasoning Strategy */}
        {reasoning && (
          <div className="mb-8 p-4 bg-[#17A2B8] bg-opacity-5 border border-[#17A2B8] border-opacity-20 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <Brain className="w-5 h-5 text-[#17A2B8] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Agent Reasoning & Strategy</h3>
                {reasoning.approach && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-700">Approach: </span>
                    <span className="text-sm text-gray-900 capitalize">{reasoning.approach.replace('-', ' ')}</span>
                  </div>
                )}
                {reasoning.reasoning && (
                  <p className="text-sm text-gray-700 mb-3">{reasoning.reasoning}</p>
                )}
                {reasoning.searchQueries && reasoning.searchQueries.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Planned Search Queries:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {reasoning.searchQueries.slice(0, 3).map((query, idx) => (
                        <li key={idx} className="text-sm text-gray-600">{query}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {reasoning.prioritySources && reasoning.prioritySources.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Priority Sources:</p>
                    <div className="flex flex-wrap gap-2">
                      {reasoning.prioritySources.map((source, idx) => (
                        <span key={idx} className="px-2 py-1 bg-[#17A2B8] bg-opacity-10 text-[#17A2B8] text-xs rounded">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 mb-4">Execution Steps</h3>
          {steps.map((stepItem, index) => {
            const isActive = index === currentStep || stepItem.status === 'active';
            const isCompleted = index < currentStep || stepItem.status === 'completed';
            const isPending = !isActive && !isCompleted;

            return (
              <div
                key={index}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                  isActive
                    ? 'bg-[#17A2B8] bg-opacity-5 border-[#17A2B8]'
                    : isCompleted
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Step Icon */}
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : isActive ? (
                    <Loader2 className="w-6 h-6 text-[#17A2B8] animate-spin" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300" />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{stepItem.step}</span>
                    {isActive && (
                      <span className="px-2 py-0.5 bg-[#17A2B8] text-white text-xs rounded">Active</span>
                    )}
                    {isCompleted && (
                      <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">Completed</span>
                    )}
                  </div>
                  {stepItem.reasoning && (
                    <p className={`text-sm ${isActive ? 'text-gray-700' : isCompleted ? 'text-gray-600' : 'text-gray-500'}`}>
                      {stepItem.reasoning}
                    </p>
                  )}
                  {stepItem.details && (
                    <div className="mt-2 text-xs text-gray-500">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(stepItem.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Message */}
        <p className="text-sm text-gray-500 mt-6 text-center">
          This may take a few moments. Please don't close this window.
        </p>
      </div>
    </div>
  );
}

