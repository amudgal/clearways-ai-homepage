import { useState } from 'react';
import { X, Upload, FileText, MessageSquare, Code } from 'lucide-react';
import { Agent } from '../data/agents';

interface InvocationModalProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
  onRun: (input: { type: string; data: string | File }) => void;
}

export default function InvocationModal({ agent, isOpen, onClose, onRun }: InvocationModalProps) {
  const [inputType, setInputType] = useState<'file' | 'text' | 'chat' | 'api'>('file');
  const [textInput, setTextInput] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const handleRun = () => {
    if (inputType === 'file' && fileInput) {
      onRun({ type: 'file', data: fileInput });
    } else if (inputType === 'text' || inputType === 'chat') {
      onRun({ type: inputType, data: textInput });
    } else if (inputType === 'api') {
      onRun({ type: 'api', data: apiKey });
    }
  };

  const estimatedCost = 
    inputType === 'file' && fileInput 
      ? `~$${(agent.usageCost.amount * Math.ceil(fileInput.size / 1024)).toFixed(2)}`
      : agent.usageCost.type === 'per-task'
      ? `$${agent.usageCost.amount.toFixed(2)} per task`
      : `$${agent.usageCost.amount.toFixed(2)} ${agent.usageCost.type.replace('per-', 'per ')}`;

  const canRun = 
    (inputType === 'file' && fileInput) ||
    ((inputType === 'text' || inputType === 'chat') && textInput.trim()) ||
    (inputType === 'api' && apiKey.trim());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-gray-900">Run {agent.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Input Type Selection */}
          <div>
            <label className="block text-gray-700 mb-3">Choose Input Method</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => setInputType('file')}
                className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  inputType === 'file'
                    ? 'border-[#17A2B8] bg-[#17A2B8] bg-opacity-5'
                    : 'border-gray-300 hover:border-[#17A2B8]'
                }`}
              >
                <Upload size={24} className={inputType === 'file' ? 'text-[#17A2B8]' : 'text-gray-600'} />
                <span className="text-sm text-gray-700">Upload File</span>
              </button>

              <button
                onClick={() => setInputType('text')}
                className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  inputType === 'text'
                    ? 'border-[#17A2B8] bg-[#17A2B8] bg-opacity-5'
                    : 'border-gray-300 hover:border-[#17A2B8]'
                }`}
              >
                <FileText size={24} className={inputType === 'text' ? 'text-[#17A2B8]' : 'text-gray-600'} />
                <span className="text-sm text-gray-700">Paste Text</span>
              </button>

              <button
                onClick={() => setInputType('chat')}
                className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  inputType === 'chat'
                    ? 'border-[#17A2B8] bg-[#17A2B8] bg-opacity-5'
                    : 'border-gray-300 hover:border-[#17A2B8]'
                }`}
              >
                <MessageSquare size={24} className={inputType === 'chat' ? 'text-[#17A2B8]' : 'text-gray-600'} />
                <span className="text-sm text-gray-700">Chat Prompt</span>
              </button>

              <button
                onClick={() => {
                  setInputType('api');
                  setShowAdvanced(true);
                }}
                className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  inputType === 'api'
                    ? 'border-[#17A2B8] bg-[#17A2B8] bg-opacity-5'
                    : 'border-gray-300 hover:border-[#17A2B8]'
                }`}
              >
                <Code size={24} className={inputType === 'api' ? 'text-[#17A2B8]' : 'text-gray-600'} />
                <span className="text-sm text-gray-700">API Key</span>
              </button>
            </div>
          </div>

          {/* File Upload */}
          {inputType === 'file' && (
            <div>
              <label className="block text-gray-700 mb-2">Upload File</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  onChange={(e) => setFileInput(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">Click to upload or drag and drop</p>
                  {fileInput && (
                    <p className="text-sm text-[#17A2B8] mt-2">
                      Selected: {fileInput.name}
                    </p>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* Text/Chat Input */}
          {(inputType === 'text' || inputType === 'chat') && (
            <div>
              <label className="block text-gray-700 mb-2">
                {inputType === 'text' ? 'Paste Your Data' : 'Enter Your Prompt'}
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                placeholder={
                  inputType === 'text'
                    ? 'Paste your data here...'
                    : 'Describe what you need...'
                }
              />
            </div>
          )}

          {/* API Key Input */}
          {inputType === 'api' && showAdvanced && (
            <div>
              <label className="block text-gray-700 mb-2">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                placeholder="Enter your API key..."
              />
              <p className="text-sm text-gray-500 mt-2">
                For automated workflows. Not required for manual runs.
              </p>
            </div>
          )}

          {/* Cost & Output Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated Cost:</span>
              <span className="text-gray-900">{estimatedCost}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Output Format:</span>
              <span className="text-gray-900">JSON / CSV</span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Confidence scores are provided per result. Sources are shown so you can verify output.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRun}
            disabled={!canRun}
            className={`px-6 py-2 rounded transition-colors ${
              canRun
                ? 'bg-[#17A2B8] text-white hover:bg-[#138C9E]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Run Now
          </button>
        </div>
      </div>
    </div>
  );
}
