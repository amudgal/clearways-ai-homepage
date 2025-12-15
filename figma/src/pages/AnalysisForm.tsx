import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calculator, Download, Save } from 'lucide-react';

interface FormData {
  mstrLicensingCost: string;
  ancillaryLicensingPercentage: string;
  numberOfInstances: string;
  hostingEnvironment: string;
  tierSelection: string;
  cloudPersonnelCosts: string;
  mstrSupportCosts: string;
  computeGB: string;
  infrastructureGB: string;
  storageGB: string;
  egressGB: string;
}

export default function AnalysisForm() {
  const { id } = useParams();
  const isNewAnalysis = id === 'new';

  const [formData, setFormData] = useState<FormData>({
    mstrLicensingCost: '',
    ancillaryLicensingPercentage: '',
    numberOfInstances: '',
    hostingEnvironment: 'AWS',
    tierSelection: '',
    cloudPersonnelCosts: '',
    mstrSupportCosts: '0.00',
    computeGB: '',
    infrastructureGB: '',
    storageGB: '',
    egressGB: '',
  });

  const [showResults, setShowResults] = useState(false);
  const [analysisTitle, setAnalysisTitle] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowResults(true);
    // Scroll to results
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSave = () => {
    alert('Analysis saved successfully!');
    // In production, save to database
  };

  // Calculate all the costs
  const calculateCosts = () => {
    const mstrLicensing = Number(formData.mstrLicensingCost || 0) * Number(formData.numberOfInstances || 0);
    const ancillaryLicensing = mstrLicensing * (Number(formData.ancillaryLicensingPercentage || 0) / 100);
    const cloudPersonnel = Number(formData.cloudPersonnelCosts || 0);
    const mstrSupport = Number(formData.mstrSupportCosts || 0);
    
    // Cloud Infrastructure Costs (mock calculations based on GB usage)
    const computeCost = Number(formData.computeGB || 0) * 0.12; // $0.12 per GB
    const infrastructureCost = Number(formData.infrastructureGB || 0) * 0.08; // $0.08 per GB
    const storageCost = Number(formData.storageGB || 0) * 0.023; // $0.023 per GB
    const egressCost = Number(formData.egressGB || 0) * 0.09; // $0.09 per GB
    const totalCloudInfra = computeCost + infrastructureCost + storageCost + egressCost;
    
    const totalCurrentState = mstrLicensing + ancillaryLicensing + cloudPersonnel + mstrSupport + totalCloudInfra;
    
    // ClearWays Managed Model (30% savings on infrastructure, 40% on personnel)
    const clearwaysMstrLicensing = mstrLicensing;
    const clearwaysAncillary = ancillaryLicensing;
    const clearwaysCloudInfra = totalCloudInfra * 0.7; // 30% savings
    const clearwaysPersonnel = cloudPersonnel * 0.6; // 40% savings
    const clearwaysMstrSupport = mstrSupport;
    const totalClearways = clearwaysMstrLicensing + clearwaysAncillary + clearwaysCloudInfra + clearwaysPersonnel + clearwaysMstrSupport;
    
    const totalSavings = totalCurrentState - totalClearways;
    const savingsPercentage = totalCurrentState > 0 ? (totalSavings / totalCurrentState) * 100 : 0;
    
    return {
      currentState: {
        mstrLicensing,
        ancillaryLicensing,
        cloudPersonnel,
        mstrSupport,
        computeCost,
        infrastructureCost,
        storageCost,
        egressCost,
        totalCloudInfra,
        total: totalCurrentState,
      },
      clearways: {
        mstrLicensing: clearwaysMstrLicensing,
        ancillaryLicensing: clearwaysAncillary,
        cloudInfra: clearwaysCloudInfra,
        cloudPersonnel: clearwaysPersonnel,
        mstrSupport: clearwaysMstrSupport,
        total: totalClearways,
      },
      savings: {
        amount: totalSavings,
        percentage: savingsPercentage,
      },
    };
  };

  const costs = showResults ? calculateCosts() : null;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">
            {isNewAnalysis ? 'Create New Analysis' : 'Edit Analysis'}
          </h1>
          <p className="text-gray-600">
            Enter your MSTR deployment details for cost analysis
          </p>
        </div>

        {/* Analysis Title */}
        {isNewAnalysis && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <label htmlFor="title" className="block text-gray-700 mb-2">
              Analysis Title
            </label>
            <input
              type="text"
              id="title"
              value={analysisTitle}
              onChange={(e) => setAnalysisTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
              placeholder="e.g., AWS Enterprise Deployment - Q4 2024"
            />
          </div>
        )}

        {/* Analysis Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-gray-900 mb-6">Analysis Inputs</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MSTR Licensing Cost */}
            <div>
              <label htmlFor="mstrLicensingCost" className="block text-gray-700 mb-2">
                MSTR Licensing Cost (Per Instance) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  id="mstrLicensingCost"
                  name="mstrLicensingCost"
                  value={formData.mstrLicensingCost}
                  onChange={handleInputChange}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {/* Ancillary Licensing % */}
            <div>
              <label htmlFor="ancillaryLicensingPercentage" className="block text-gray-700 mb-2">
                Ancillary Licensing % (of MSTR licensing) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="ancillaryLicensingPercentage"
                  name="ancillaryLicensingPercentage"
                  value={formData.ancillaryLicensingPercentage}
                  onChange={handleInputChange}
                  className="w-full pr-8 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                  placeholder="0"
                  min="0"
                  max="100"
                  required
                />
                <span className="absolute right-3 top-2 text-gray-500">%</span>
              </div>
            </div>

            {/* Number of Instances */}
            <div>
              <label htmlFor="numberOfInstances" className="block text-gray-700 mb-2">
                Number of Instances *
              </label>
              <input
                type="number"
                id="numberOfInstances"
                name="numberOfInstances"
                value={formData.numberOfInstances}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                placeholder="1"
                min="1"
                required
              />
            </div>

            {/* Hosting Environment */}
            <div>
              <label htmlFor="hostingEnvironment" className="block text-gray-700 mb-2">
                Hosting Environment *
              </label>
              <select
                id="hostingEnvironment"
                name="hostingEnvironment"
                value={formData.hostingEnvironment}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                required
              >
                <option value="AWS">AWS</option>
                <option value="GCP">GCP</option>
                <option value="Azure">Azure</option>
              </select>
            </div>

            {/* Tier Selection */}
            <div>
              <label htmlFor="tierSelection" className="block text-gray-700 mb-2">
                Tier Selection *
              </label>
              <input
                type="text"
                id="tierSelection"
                name="tierSelection"
                value={formData.tierSelection}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                placeholder="e.g., Standard, Premium, Enterprise"
                required
              />
            </div>

            {/* Cloud Personnel Costs */}
            <div>
              <label htmlFor="cloudPersonnelCosts" className="block text-gray-700 mb-2">
                Cloud Personnel Costs (Annual) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  id="cloudPersonnelCosts"
                  name="cloudPersonnelCosts"
                  value={formData.cloudPersonnelCosts}
                  onChange={handleInputChange}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {/* MSTR Support Costs */}
            <div>
              <label htmlFor="mstrSupportCosts" className="block text-gray-700 mb-2">
                MSTR Support Costs (Annual)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  id="mstrSupportCosts"
                  name="mstrSupportCosts"
                  value={formData.mstrSupportCosts}
                  onChange={handleInputChange}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent bg-gray-50"
                  placeholder="0.00"
                  step="0.01"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Resource Usage Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-gray-900 mb-6">Resource Usage (GB)</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Compute */}
              <div>
                <label htmlFor="computeGB" className="block text-gray-700 mb-2">
                  Compute (GB) *
                </label>
                <input
                  type="number"
                  id="computeGB"
                  name="computeGB"
                  value={formData.computeGB}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* Infrastructure */}
              <div>
                <label htmlFor="infrastructureGB" className="block text-gray-700 mb-2">
                  Infrastructure (GB) *
                </label>
                <input
                  type="number"
                  id="infrastructureGB"
                  name="infrastructureGB"
                  value={formData.infrastructureGB}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* Storage */}
              <div>
                <label htmlFor="storageGB" className="block text-gray-700 mb-2">
                  Storage (GB) *
                </label>
                <input
                  type="number"
                  id="storageGB"
                  name="storageGB"
                  value={formData.storageGB}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* Egress */}
              <div>
                <label htmlFor="egressGB" className="block text-gray-700 mb-2">
                  Egress (GB) *
                </label>
                <input
                  type="number"
                  id="egressGB"
                  name="egressGB"
                  value={formData.egressGB}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex gap-4">
            <button
              type="submit"
              className="flex items-center gap-2 bg-[#17A2B8] text-white px-8 py-3 rounded-lg hover:bg-[#138C9E] transition-colors shadow-sm"
            >
              <Calculator size={20} />
              Generate Analysis
            </button>
            {showResults && (
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <Save size={20} />
                Save Analysis
              </button>
            )}
          </div>
        </form>

        {/* Results Section */}
        {showResults && costs && (
          <div id="results" className="space-y-8">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-gray-900">Cost Analysis Report</h2>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 text-[#17A2B8] hover:text-[#138C9E] transition-colors"
                >
                  <Download size={20} />
                  Export Report
                </button>
              </div>

              {/* Instance Configuration */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-gray-900 mb-4">Instance Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Hosting Environment</div>
                    <div className="text-gray-900 mt-1">{formData.hostingEnvironment}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Number of Instances</div>
                    <div className="text-gray-900 mt-1">{formData.numberOfInstances}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Tier Selection</div>
                    <div className="text-gray-900 mt-1">{formData.tierSelection}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 1. Negotiated Annual Licensing Costs (Static) */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#2C5F7C] text-white px-6 py-4">
                <h3>1. Negotiated Annual Licensing Costs (Static)</h3>
                <p className="text-sm opacity-90 mt-1 italic">
                  Fixed, contractually committed software costs that do not change with usage once licensing terms are set.
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Nature of Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Cost Sensitivity</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Confidence Score</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 italic mb-2">
                          MSTR negotiated Licensing rates (Per instance) - Annual, contractually negotiated MicroStrategy platform licensing cost per deployed production instance. This cost is fixed for the contract term and independent of usage volume, user count, or query load.
                        </div>
                        <div className="text-lg text-gray-900">
                          ${costs.currentState.mstrLicensing.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Negotiated
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-green-200 text-gray-900">
                          Low
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-green-200 text-gray-900">
                          5 - Very High
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Contracted, fixed for term; risk only if instance count changes
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 italic mb-2">
                          Licensing and usage of ancillary (Supporting technologies like Zookeeper, Kafka etc.) - (Provision is given to calculate based on its contributive costs) - Annual licensing or subscription costs for supporting technologies required to operate and scale the MicroStrategy platform (e.g., coordination, messaging, monitoring). Costs are modeled as a percentage of the core platform spend and proportional dependency rather than standalone usage growth.
                        </div>
                        <div className="text-lg text-gray-900">
                          ${costs.currentState.ancillaryLicensing.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Negotiated
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-yellow-100 text-gray-900">
                          Low-Medium
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-green-200 text-gray-900">
                          4 - High
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Modeled as % of core spend; bounded but dependent on platform footprint
                      </td>
                    </tr>
                    <tr className="bg-[#2C5F7C] text-white">
                      <td className="px-6 py-4 text-sm" colSpan={5}>
                        <div className="flex justify-between items-center">
                          <span>Subtotal - Licensing Costs</span>
                          <span className="text-lg">${(costs.currentState.mstrLicensing + costs.currentState.ancillaryLicensing).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Metered Costs (Running Costs) */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#2C5F7C] text-white px-6 py-4">
                <h3>2. Metered Costs (Running Costs)</h3>
                <p className="text-sm opacity-90 mt-1 italic">
                  Variable, consumption-based infrastructure costs that scale with workload, data volume, and architecture decisions.
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Nature of Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Cost Sensitivity</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Confidence Score</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 italic mb-2">
                          Compute costs - Processing power and virtual machine costs based on {formData.computeGB} GB allocation @ $0.12/GB. Varies with workload intensity, number of concurrent users, query complexity, and report generation frequency.
                        </div>
                        <div className="text-lg text-gray-900">
                          ${costs.currentState.computeCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Variable
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-red-200 text-gray-900">
                          High
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-yellow-100 text-gray-900">
                          3 - Medium
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Directly tied to workload; can spike with user activity and query patterns
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 italic mb-2">
                          Infrastructure costs - Network, load balancing, and connectivity costs for {formData.infrastructureGB} GB @ $0.08/GB. Scales with traffic volume, geographic distribution, and number of concurrent connections.
                        </div>
                        <div className="text-lg text-gray-900">
                          ${costs.currentState.infrastructureCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Variable
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-orange-200 text-gray-900">
                          Medium
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-green-200 text-gray-900">
                          4 - High
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Moderate variability; grows with traffic but more predictable than compute
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 italic mb-2">
                          Storage costs - Data storage and database costs for {formData.storageGB} GB @ $0.023/GB. Grows with data retention policies, historical data accumulation, backup requirements, and archival strategies.
                        </div>
                        <div className="text-lg text-gray-900">
                          ${costs.currentState.storageCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Variable
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-orange-200 text-gray-900">
                          Medium
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-green-200 text-gray-900">
                          4 - High
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Predictable growth over time; optimization possible through retention policies
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 italic mb-2">
                          Egress costs - Data transfer out costs for {formData.egressGB} GB @ $0.09/GB. Depends on report exports, dashboard refreshes, API calls, cross-region replication, and external integrations.
                        </div>
                        <div className="text-lg text-gray-900">
                          ${costs.currentState.egressCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Variable
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-red-200 text-gray-900">
                          High
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-yellow-100 text-gray-900">
                          3 - Medium
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Highly variable based on usage patterns; architectural choices significantly impact costs
                      </td>
                    </tr>
                    <tr className="bg-[#2C5F7C] text-white">
                      <td className="px-6 py-4 text-sm" colSpan={5}>
                        <div className="flex justify-between items-center">
                          <span>Subtotal - Metered Costs</span>
                          <span className="text-lg">${costs.currentState.totalCloudInfra.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Support Costs */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#2C5F7C] text-white px-6 py-4">
                <h3>3. Support Costs (Blended - Type & Level of Support Personnel)</h3>
                <p className="text-sm opacity-90 mt-1 italic">
                  Ongoing human and vendor effort required to operate, support, and sustain the platform.
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Nature of Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Cost Sensitivity</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Confidence Score</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 italic mb-2">
                          Cloud Personnel costs - In-house staff costs including engineers, architects, and support personnel. Includes salaries, benefits, training, overhead, and opportunity costs. Fixed until hiring/termination decisions are made.
                        </div>
                        <div className="text-lg text-gray-900">
                          ${costs.currentState.cloudPersonnel.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Semi-Fixed
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-orange-200 text-gray-900">
                          Medium
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-green-200 text-gray-900">
                          4 - High
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Fixed short-term but can be adjusted through workforce planning; hiring/retention risks
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 italic mb-2">
                          MSTR Support Costs - Annual vendor support and maintenance fees for platform updates, security patches, technical assistance, and access to knowledge base. Typically 20-22% of total license value.
                        </div>
                        <div className="text-lg text-gray-900">
                          ${costs.currentState.mstrSupport.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Negotiated
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-green-200 text-gray-900">
                          Low
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-green-200 text-gray-900">
                          5 - Very High
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Contractually fixed as percentage of license costs; predictable and transparent
                      </td>
                    </tr>
                    <tr className="bg-[#2C5F7C] text-white">
                      <td className="px-6 py-4 text-sm" colSpan={5}>
                        <div className="flex justify-between items-center">
                          <span>Subtotal - Support Costs</span>
                          <span className="text-lg">${(costs.currentState.cloudPersonnel + costs.currentState.mstrSupport).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Architecture Choice Costs */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#5A6C7D] text-white px-6 py-4">
                <h3>4. Architecture Choice Costs (Opportunity Costs)</h3>
                <p className="text-sm opacity-90 mt-1 italic">
                  Costs driven by design decisions rather than vendor pricing—these are controllable but often underestimated.
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Nature of Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Cost Sensitivity</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Confidence Score</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 italic mb-2">
                          Over-Provisioning - Resources allocated "just in case" rather than right-sized for actual demand. Common in static capacity planning without auto-scaling or demand forecasting. ClearWays applies dynamic resource allocation.
                        </div>
                        <div className="text-lg text-gray-900">Impact: 15-25% waste</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Opportunity Cost
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-red-200 text-gray-900">
                          High
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-yellow-100 text-gray-900">
                          3 - Medium
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Avoidable through dynamic scaling and right-sizing; requires monitoring and automation
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 italic mb-2">
                          Inefficient Data Architecture - Poor data modeling, redundant storage, or suboptimal query patterns increase compute and storage costs. Includes unnecessary aggregates, lack of partitioning, and inefficient indexing strategies.
                        </div>
                        <div className="text-lg text-gray-900">Impact: 20-35% overhead</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Opportunity Cost
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-red-200 text-gray-900">
                          High
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-red-100 text-gray-900">
                          2 - Low
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Difficult to quantify without deep assessment; requires expert analysis and remediation
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 italic mb-2">
                          Lack of Reserved Capacity - Using on-demand pricing instead of reserved instances or committed use discounts for predictable workloads. ClearWays leverages 1-3 year commitments to reduce baseline costs significantly.
                        </div>
                        <div className="text-lg text-gray-900">Impact: 30-50% premium</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Opportunity Cost
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-orange-200 text-gray-900">
                          Medium
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-green-200 text-gray-900">
                          5 - Very High
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Well-documented savings; clear pricing from vendors; low implementation risk
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 italic mb-2">
                          Multi-Region Inefficiencies - Unnecessary data replication or cross-region traffic without justification. Strategic architecture design minimizes egress costs while maintaining required availability and latency SLAs.
                        </div>
                        <div className="text-lg text-gray-900">Impact: 10-20% egress</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Opportunity Cost
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-orange-200 text-gray-900">
                          Medium
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-yellow-100 text-gray-900">
                          3 - Medium
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Requires architectural assessment to balance cost vs. performance/availability requirements
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                <div className="p-6 bg-yellow-50 border-t border-yellow-200">
                  <p className="text-sm text-gray-700">
                    <strong>Combined Impact:</strong> Architecture optimization typically reduces total infrastructure costs by 20-40% through better design decisions, resource allocation, and capacity planning. These savings compound with infrastructure optimization for maximum TCO reduction.
                  </p>
                </div>
              </div>
            </div>

            {/* 5. Assumptions */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#F59E0B] text-white px-6 py-4">
                <h3>5. Assumptions</h3>
                <p className="text-sm opacity-90 mt-1">
                  Explicit assumptions prevent misalignment later when costs vary from estimates.
                </p>
              </div>
              
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-[#F59E0B] rounded-full mt-2"></div>
                    <p className="text-sm text-gray-700">
                      <strong>Pricing Basis:</strong> Cloud infrastructure rates based on {formData.hostingEnvironment} standard pricing as of December 2024. Actual rates may vary by region and commitment level.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-[#F59E0B] rounded-full mt-2"></div>
                    <p className="text-sm text-gray-700">
                      <strong>Usage Patterns:</strong> Assumes steady-state workload. Seasonal peaks, user growth, or data volume increases will impact metered costs proportionally.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-[#F59E0B] rounded-full mt-2"></div>
                    <p className="text-sm text-gray-700">
                      <strong>Optimization Savings:</strong> Infrastructure savings (30%) based on right-sizing, reserved capacity, and architectural improvements. Requires active management and monitoring.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-[#F59E0B] rounded-full mt-2"></div>
                    <p className="text-sm text-gray-700">
                      <strong>Personnel Model:</strong> Personnel cost reduction (40%) reflects managed service model with shared expert team vs. dedicated full-time employees. Assumes equivalent coverage and expertise level.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-[#F59E0B] rounded-full mt-2"></div>
                    <p className="text-sm text-gray-700">
                      <strong>License Portability:</strong> Assumes existing MSTR licenses can transfer to managed model. Some license agreements may require renegotiation.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-[#F59E0B] rounded-full mt-2"></div>
                    <p className="text-sm text-gray-700">
                      <strong>Migration Costs:</strong> This analysis does not include one-time migration, setup, or transition costs. A separate assessment is required for initial onboarding expenses.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-[#F59E0B] rounded-full mt-2"></div>
                    <p className="text-sm text-gray-700">
                      <strong>Service Levels:</strong> Comparison assumes equivalent uptime SLAs, response times, and support quality between current and managed states.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Total Costs */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#17A2B8] to-[#2C5F7C] text-white px-6 py-4">
                <h3>6. Total Costs</h3>
                <p className="text-sm opacity-90 mt-1 italic">
                  This is the all-in cost view required for budget approval and comparison against alternatives.
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Nature of Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Cost Sensitivity</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Confidence Score</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 italic mb-2">
                          Licensing Costs (Static) - Combined MSTR and ancillary licensing. Fixed contractual obligation renewed annually. Negotiated savings possible at renewal based on user count and commitment length.
                        </div>
                        <div className="text-lg text-gray-900">
                          ${(costs.currentState.mstrLicensing + costs.currentState.ancillaryLicensing).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Negotiated
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-green-200 text-gray-900">
                          Low
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-green-200 text-gray-900">
                          5 - Very High
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Contractually fixed; minimal variance risk during contract term
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 italic mb-2">
                          Metered Costs (Running) - Variable infrastructure costs that fluctuate with usage. Highest opportunity for optimization through right-sizing, reserved capacity, and architectural improvements (30% potential savings).
                        </div>
                        <div className="text-lg text-gray-900">
                          ${costs.currentState.totalCloudInfra.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Variable
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-red-200 text-gray-900">
                          High
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-yellow-100 text-gray-900">
                          3 - Medium
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Subject to usage volatility; optimization opportunities reduce long-term variability
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 italic mb-2">
                          Support Costs (Blended) - Personnel and vendor support combined. Managed service model reduces this by 40% through shared team efficiency while maintaining 24/7 coverage and specialized expertise.
                        </div>
                        <div className="text-lg text-gray-900">
                          ${(costs.currentState.cloudPersonnel + costs.currentState.mstrSupport).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Blended
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-orange-200 text-gray-900">
                          Medium
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded text-sm bg-green-200 text-gray-900">
                          4 - High
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        Mix of fixed vendor fees and variable personnel; managed model provides cost predictability
                      </td>
                    </tr>
                    <tr className="bg-gradient-to-r from-[#17A2B8] to-[#2C5F7C] text-white">
                      <td className="px-6 py-4 text-sm" colSpan={5}>
                        <div className="flex justify-between items-center text-lg">
                          <div>
                            <div>Total Annual Cost</div>
                            <div className="text-sm opacity-90 mt-1">Projected savings: {costs.savings.percentage.toFixed(1)}% (${costs.savings.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })})</div>
                          </div>
                          <div className="text-right">
                            <div>${costs.currentState.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                            <div className="text-sm opacity-90 mt-1">Current State</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 7. Insights */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4 rounded-t-lg -mx-6 -mt-6 mb-6">
                <h3>7. Insights</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center">1</div>
                  <div>
                    <div className="text-gray-900 mb-1">Infrastructure Optimization Opportunity</div>
                    <p className="text-sm text-gray-600">
                      Your current metered costs of ${costs.currentState.totalCloudInfra.toLocaleString('en-US', { minimumFractionDigits: 2 })} can be reduced by 30% through right-sizing, auto-scaling, and reserved capacity planning, saving ${(costs.currentState.totalCloudInfra * 0.3).toLocaleString('en-US', { minimumFractionDigits: 2 })} annually.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center">2</div>
                  <div>
                    <div className="text-gray-900 mb-1">Personnel Cost Efficiency</div>
                    <p className="text-sm text-gray-600">
                      Transitioning to a managed service model replaces dedicated personnel costs with a shared expert team model, reducing annual spending from ${costs.currentState.cloudPersonnel.toLocaleString('en-US', { minimumFractionDigits: 2 })} to ${costs.clearways.cloudPersonnel.toLocaleString('en-US', { minimumFractionDigits: 2 })} while maintaining 24/7 coverage.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center">3</div>
                  <div>
                    <div className="text-gray-900 mb-1">Total Cost of Ownership (TCO) Reduction</div>
                    <p className="text-sm text-gray-600">
                      Overall TCO reduces by {costs.savings.percentage.toFixed(1)}% (${costs.savings.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} annually) through combined infrastructure optimization, personnel efficiency, and architectural improvements.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center">4</div>
                  <div>
                    <div className="text-gray-900 mb-1">Scalability & Flexibility</div>
                    <p className="text-sm text-gray-600">
                      ClearWays managed model provides elastic scaling capability to handle growth without proportional cost increases or hiring delays, enabling rapid response to business needs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 8. Terms */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-700 text-white px-6 py-4">
                <h3>8. Terms</h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-gray-900 mb-2">Static Costs</h4>
                    <p className="text-sm text-gray-600">
                      Costs that remain constant regardless of usage levels. These are typically contractual obligations with fixed annual or multi-year terms.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-gray-900 mb-2">Metered Costs</h4>
                    <p className="text-sm text-gray-600">
                      Variable costs based on actual consumption (compute hours, storage GB, data transfer). Billed based on usage patterns and can fluctuate month-to-month.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-gray-900 mb-2">Blended Support</h4>
                    <p className="text-sm text-gray-600">
                      Combination of internal personnel costs and external vendor support fees required to maintain platform operations and user assistance.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-gray-900 mb-2">Architecture Choice Costs</h4>
                    <p className="text-sm text-gray-600">
                      Hidden costs resulting from design decisions—over-provisioning, inefficient data models, or poor capacity planning that increase infrastructure spend.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-gray-900 mb-2">Reserved Instances</h4>
                    <p className="text-sm text-gray-600">
                      Commitment to use specific cloud resources over 1-3 years in exchange for significant discounts (typically 30-70% off on-demand pricing).
                    </p>
                  </div>

                  <div>
                    <h4 className="text-gray-900 mb-2">Egress Costs</h4>
                    <p className="text-sm text-gray-600">
                      Charges for data transfer out of cloud provider's network. Often overlooked but can represent 10-20% of total cloud spend in data-intensive applications.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-gray-900 mb-2">Total Cost of Ownership (TCO)</h4>
                    <p className="text-sm text-gray-600">
                      Comprehensive view of all costs—licensing, infrastructure, personnel, support, and hidden costs—required for accurate budget planning.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-gray-900 mb-2">Managed Service Model</h4>
                    <p className="text-sm text-gray-600">
                      Third-party provider assumes operational responsibility for platform management, monitoring, optimization, and support under service level agreements (SLAs).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 9. Questions & Answers */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4">
                <h3>9. Questions & Answers</h3>
              </div>
              
              <div className="p-6">
                <div className="space-y-6">
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-gray-900 mb-2">Q: How accurate are these savings projections?</h4>
                    <p className="text-sm text-gray-600">
                      <strong>A:</strong> Savings percentages are based on actual client results from similar deployments. However, your specific results will depend on current infrastructure efficiency, usage patterns, and organizational factors. We recommend a detailed technical assessment to validate projections for your environment.
                    </p>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-gray-900 mb-2">Q: What happens to our existing MSTR licenses?</h4>
                    <p className="text-sm text-gray-600">
                      <strong>A:</strong> In most cases, existing MSTR licenses can transfer to the managed model. ClearWays will work with you and MicroStrategy to ensure license portability and compliance. Some enterprise agreements may require amendment or renegotiation.
                    </p>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-gray-900 mb-2">Q: How long does migration take?</h4>
                    <p className="text-sm text-gray-600">
                      <strong>A:</strong> Typical migration timeline is 4-12 weeks depending on environment complexity, number of instances, data volume, and customization requirements. We provide a detailed migration plan with milestones during the assessment phase.
                    </p>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-gray-900 mb-2">Q: What are the upfront migration costs?</h4>
                    <p className="text-sm text-gray-600">
                      <strong>A:</strong> Migration costs are not included in this analysis and vary by project scope. These typically include assessment fees, migration services, testing, and training. We can provide a separate migration cost estimate after technical discovery.
                    </p>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-gray-900 mb-2">Q: How do you achieve 30% infrastructure savings?</h4>
                    <p className="text-sm text-gray-600">
                      <strong>A:</strong> Through a combination of right-sizing (eliminating over-provisioned resources), reserved instance/committed use pricing, auto-scaling to match demand, architectural optimization, and continuous cost monitoring. These are proven techniques applied across our client base.
                    </p>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-gray-900 mb-2">Q: Will we lose control over our MSTR environment?</h4>
                    <p className="text-sm text-gray-600">
                      <strong>A:</strong> No. You maintain full visibility and governance. ClearWays operates as an extension of your team with regular reporting, change control processes, and collaborative decision-making on architecture and optimization initiatives.
                    </p>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-gray-900 mb-2">Q: What if our usage grows significantly?</h4>
                    <p className="text-sm text-gray-600">
                      <strong>A:</strong> The managed model is designed for scalability. Costs will increase proportionally with metered resources, but optimization strategies minimize the rate of increase. We provide capacity planning and growth forecasting as part of the service.
                    </p>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-gray-900 mb-2">Q: What SLAs do you provide?</h4>
                    <p className="text-sm text-gray-600">
                      <strong>A:</strong> Standard SLAs include 99.9% uptime, 24/7 monitoring, incident response times based on severity (critical: 15 min, high: 1 hour, medium: 4 hours), and monthly performance reporting. Enterprise SLAs with higher guarantees are available.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="bg-gradient-to-br from-[#17A2B8] to-[#138C9E] rounded-lg p-8 text-white text-center">
              <h3 className="mb-2">Ready to Optimize Your MSTR Deployment?</h3>
              <p className="mb-6 opacity-90">
                Schedule a consultation with our experts to discuss your specific requirements and validate these projections.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleSave}
                  className="bg-white text-[#17A2B8] px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Save This Analysis
                </button>
                <a
                  href="tel:571-762-6973"
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-sm inline-block"
                >
                  Call 571-762-6973
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
