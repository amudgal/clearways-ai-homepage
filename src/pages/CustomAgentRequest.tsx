import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function CustomAgentRequest() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    businessProblem: '',
    desiredOutcome: '',
    dataAvailability: 'not-sure',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to an API
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <div className="flex justify-center mb-4">
              <CheckCircle size={64} className="text-[#17A2B8]" />
            </div>
            <h2 className="text-gray-900 mb-3">Request Submitted</h2>
            <p className="text-gray-600 mb-6">
              Clearways AI reviews every request. If viable, we'll contact you with a
              timeline and cost.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/agents')}
                className="w-full bg-[#17A2B8] text-white px-6 py-3 rounded hover:bg-[#138C9E] transition-colors"
              >
                Return to Marketplace
              </button>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFormData({
                    businessProblem: '',
                    desiredOutcome: '',
                    dataAvailability: 'not-sure',
                  });
                }}
                className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded hover:bg-gray-50 transition-colors"
              >
                Submit Another Request
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/agents')}
          className="text-[#17A2B8] hover:underline mb-6"
        >
          ← Back to Marketplace
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-gray-900 mb-3">Request a Custom Agent</h1>
          <p className="text-gray-600">
            Tell us about your business need. We'll review your request and contact you if we can help.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="space-y-6">
            {/* Business Problem */}
            <div>
              <label htmlFor="businessProblem" className="block text-gray-700 mb-2">
                Business Problem
              </label>
              <textarea
                id="businessProblem"
                rows={5}
                value={formData.businessProblem}
                onChange={(e) =>
                  setFormData({ ...formData, businessProblem: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                placeholder="Describe the business problem you're trying to solve..."
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                Be specific. Include context about your industry and current process.
              </p>
            </div>

            {/* Desired Outcome */}
            <div>
              <label htmlFor="desiredOutcome" className="block text-gray-700 mb-2">
                Desired Outcome
              </label>
              <textarea
                id="desiredOutcome"
                rows={4}
                value={formData.desiredOutcome}
                onChange={(e) =>
                  setFormData({ ...formData, desiredOutcome: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                placeholder="What result do you need? What format?"
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                Example: "A daily CSV with new construction permits in Phoenix, AZ"
              </p>
            </div>

            {/* Data Availability */}
            <div>
              <label className="block text-gray-700 mb-3">
                Do you have access to the necessary data sources?
              </label>
              <div className="space-y-2">
                {[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                  { value: 'not-sure', label: 'Not Sure' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:border-[#17A2B8] transition-colors"
                  >
                    <input
                      type="radio"
                      name="dataAvailability"
                      value={option.value}
                      checked={formData.dataAvailability === option.value}
                      onChange={(e) =>
                        setFormData({ ...formData, dataAvailability: e.target.value })
                      }
                      className="accent-[#17A2B8]"
                    />
                    <span className="text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <span className="text-gray-900">What happens next:</span>
                <br />
                Our team reviews your request within 2 business days. If we can build a
                solution, we'll provide a timeline and cost estimate.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/agents')}
                className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#17A2B8] text-white px-6 py-3 rounded hover:bg-[#138C9E] transition-colors"
              >
                Submit Request
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
