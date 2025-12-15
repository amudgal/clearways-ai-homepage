// Admin Pricing Table - Comprehensive pricing entry for AWS, GCP, Azure
// Only accessible to ADMIN role users

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2, AlertCircle, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../components/ui/accordion';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface PricingEntry {
  service_type: string;
  tier?: string;
  region?: string;
  unit_type: 'hourly' | 'gb_month' | 'gb' | 'percentage';
  unit_price: number;
  annual_multiplier: number;
  notes?: string;
}

interface PricingCategory {
  name: string;
  services: {
    service_type: string;
    unit_type: 'hourly' | 'gb_month' | 'gb' | 'percentage';
    default_annual_multiplier: number;
    notes?: string;
  }[];
}

interface ComponentSelection {
  componentId: string;
  selectedTier: string;
  instances: number;
}

const PRICING_CATEGORIES: PricingCategory[] = [
  {
    name: 'COMPUTE PRICING',
    services: [
      { service_type: 'vCPU', unit_type: 'hourly', default_annual_multiplier: 8760, notes: 'On-demand pricing' },
      { service_type: 'vCPU (with 3-yr CUD)', unit_type: 'hourly', default_annual_multiplier: 8760, notes: '28% discount on commitment' },
      { service_type: 'Memory (RAM)', unit_type: 'hourly', default_annual_multiplier: 8760, notes: 'On-demand' },
      { service_type: 'Memory (with 3-yr CUD)', unit_type: 'hourly', default_annual_multiplier: 8760, notes: '28% discount on commitment' },
      { service_type: 'Cluster Management', unit_type: 'gb_month', default_annual_multiplier: 12, notes: 'Per cluster' },
    ],
  },
  {
    name: 'STORAGE PRICING',
    services: [
      { service_type: 'Persistent Disk (SSD)', unit_type: 'gb_month', default_annual_multiplier: 12, notes: 'Regional SSD for performance' },
      { service_type: 'Persistent Disk (Standard HDD)', unit_type: 'gb_month', default_annual_multiplier: 12, notes: 'Cost-optimized storage' },
      { service_type: 'Object Storage (Standard)', unit_type: 'gb_month', default_annual_multiplier: 12, notes: 'Object storage for backups' },
      { service_type: 'Object Storage (Archive)', unit_type: 'gb_month', default_annual_multiplier: 12, notes: 'Long-term archive storage' },
    ],
  },
  {
    name: 'NETWORK PRICING',
    services: [
      { service_type: 'Data Egress (0-1 TB)', unit_type: 'gb', default_annual_multiplier: 1, notes: 'Outbound data transfer' },
      { service_type: 'Data Egress (1-10 TB)', unit_type: 'gb', default_annual_multiplier: 1, notes: 'Volume pricing tier' },
      { service_type: 'Data Egress (10+ TB)', unit_type: 'gb', default_annual_multiplier: 1, notes: 'High-volume discount' },
      { service_type: 'Load Balancer', unit_type: 'hourly', default_annual_multiplier: 8760, notes: 'Forwarding rules included' },
      { service_type: 'Static IP Address', unit_type: 'hourly', default_annual_multiplier: 8760, notes: 'Charged when attached' },
    ],
  },
  {
    name: 'DATABASE PRICING',
    services: [
      { service_type: 'Managed SQL (4 vCPU, 15 GB RAM)', unit_type: 'hourly', default_annual_multiplier: 8760, notes: 'Standard instance' },
      { service_type: 'Managed SQL (8 vCPU, 30 GB RAM)', unit_type: 'hourly', default_annual_multiplier: 8760, notes: 'Higher-tier instance' },
      { service_type: 'NoSQL Database (Standard)', unit_type: 'gb_month', default_annual_multiplier: 12, notes: 'NoSQL for large datasets' },
    ],
  },
  {
    name: 'SUPPORT & SERVICES',
    services: [
      { service_type: 'Premium Support (Spend $0-$10K/month)', unit_type: 'percentage', default_annual_multiplier: 1, notes: 'Entry premium tier' },
      { service_type: 'Premium Support (Spend >$10K/month)', unit_type: 'percentage', default_annual_multiplier: 1, notes: 'Reduced rate at scale' },
      { service_type: 'Stackdriver Logging', unit_type: 'gb', default_annual_multiplier: 1, notes: 'Log storage & analysis' },
      { service_type: 'Stackdriver Monitoring', unit_type: 'gb', default_annual_multiplier: 1, notes: 'Metrics & alerting' },
    ],
  },
];

// Architecture sections for cost calculator
const ARCHITECTURE_SECTIONS = [
  {
    id: 'compute',
    name: 'Compute (GKE)',
    components: [
      { id: 'compute-gke', name: 'Compute (GKE)', tierOptions: ['vCPU', 'vCPU (with 3-yr CUD)'] },
    ],
  },
  {
    id: 'cluster-management',
    name: 'GKE Cluster Management',
    components: [
      { id: 'cluster-mgmt', name: 'GKE Cluster Management', tierOptions: ['Cluster Management'] },
    ],
  },
  {
    id: 'memory',
    name: 'Memory (RAM)',
    components: [
      { id: 'memory-ram', name: 'Memory (RAM)', tierOptions: ['Memory (RAM)', 'Memory (with 3-yr CUD)'] },
    ],
  },
  {
    id: 'storage',
    name: 'Cloud Storage',
    components: [
      { id: 'storage-ssd', name: 'Persistent Disk (SSD)', tierOptions: ['Persistent Disk (SSD)'] },
      { id: 'storage-hdd', name: 'Persistent Disk (Standard HDD)', tierOptions: ['Persistent Disk (Standard HDD)'] },
      { id: 'storage-object', name: 'Object Storage (Standard)', tierOptions: ['Object Storage (Standard)'] },
      { id: 'storage-archive', name: 'Object Storage (Archive)', tierOptions: ['Object Storage (Archive)'] },
    ],
  },
  {
    id: 'database',
    name: 'Database Pricing',
    components: [
      { id: 'db-sql-4vcpu', name: 'Managed SQL (4 vCPU, 15 GB RAM)', tierOptions: ['Managed SQL (4 vCPU, 15 GB RAM)'] },
      { id: 'db-sql-8vcpu', name: 'Managed SQL (8 vCPU, 30 GB RAM)', tierOptions: ['Managed SQL (8 vCPU, 30 GB RAM)'] },
      { id: 'db-nosql', name: 'NoSQL Database (Standard)', tierOptions: ['NoSQL Database (Standard)'] },
    ],
  },
  {
    id: 'network-egress',
    name: 'Network (Data Egress)',
    components: [
      { id: 'egress-0-1tb', name: 'Data Egress (0-1 TB)', tierOptions: ['Data Egress (0-1 TB)'] },
      { id: 'egress-1-10tb', name: 'Data Egress (1-10 TB)', tierOptions: ['Data Egress (1-10 TB)'] },
      { id: 'egress-10tb-plus', name: 'Data Egress (10+ TB)', tierOptions: ['Data Egress (10+ TB)'] },
    ],
  },
  {
    id: 'load-balancer',
    name: 'Cloud Load Balancer',
    components: [
      { id: 'lb', name: 'Load Balancer', tierOptions: ['Load Balancer'] },
    ],
  },
  {
    id: 'static-ip',
    name: 'Static IP Address',
    components: [
      { id: 'ip', name: 'Static IP Address', tierOptions: ['Static IP Address'] },
    ],
  },
];

export default function AdminPricingTable() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'AWS' | 'GCP' | 'Azure'>('GCP');
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [pricingData, setPricingData] = useState<Record<string, PricingEntry>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [initialPricingData, setInitialPricingData] = useState<Record<string, PricingEntry>>({});
  const [componentSelections, setComponentSelections] = useState<Record<string, ComponentSelection>>({});
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role !== 'ADMIN') {
      toast.error('Admin access required');
      navigate('/dashboard');
      return;
    }

    initializeOrLoadVersion();
  }, [user, isAuthenticated, navigate]);

  useEffect(() => {
    if (currentVersion) {
      loadPricingData();
    }
  }, [currentVersion, selectedProvider]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const initializeOrLoadVersion = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pricing/version/active`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const versionId = data.pricingVersion.id;
        setCurrentVersion(versionId);
        await loadPricingDataForVersion(versionId);
      } else {
        initializePricingData();
      }
    } catch (error) {
      console.error('Initialize version error:', error);
      initializePricingData();
    }
  };

  const loadPricingDataForVersion = async (versionId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/pricing/${versionId}/${selectedProvider}`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) {
        initializePricingData();
        return;
      }

      const data = await response.json();
      const pricingMap: Record<string, PricingEntry> = {};
      
      (data.pricing || []).forEach((entry: any) => {
        pricingMap[entry.service_type] = {
          service_type: entry.service_type,
          tier: entry.tier,
          region: entry.region,
          unit_type: entry.unit_type,
          unit_price: parseFloat(entry.unit_price) || 0,
          annual_multiplier: parseFloat(entry.annual_multiplier) || 1,
          notes: entry.metadata?.notes || '',
        };
      });

      PRICING_CATEGORIES.forEach(category => {
        category.services.forEach(service => {
          if (!pricingMap[service.service_type]) {
            pricingMap[service.service_type] = {
              service_type: service.service_type,
              unit_type: service.unit_type,
              unit_price: 0,
              annual_multiplier: service.default_annual_multiplier,
              notes: service.notes || '',
            };
          }
        });
      });

      setPricingData(pricingMap);
      setInitialPricingData(JSON.parse(JSON.stringify(pricingMap)));
      setHasChanges(false);
    } catch (error) {
      console.error('Load pricing data error:', error);
      initializePricingData();
    } finally {
      setLoading(false);
    }
  };

  const loadPricingData = async () => {
    if (!currentVersion) {
      await initializeOrLoadVersion();
      return;
    }
    await loadPricingDataForVersion(currentVersion);
  };

  const initializePricingData = () => {
    const initialData: Record<string, PricingEntry> = {};
    
    PRICING_CATEGORIES.forEach(category => {
      category.services.forEach(service => {
        const key = service.service_type;
        initialData[key] = {
          service_type: key,
          unit_type: service.unit_type,
          unit_price: 0,
          annual_multiplier: service.default_annual_multiplier,
          notes: service.notes || '',
        };
      });
    });

    setPricingData(initialData);
    setInitialPricingData(JSON.parse(JSON.stringify(initialData)));
  };

  const updatePricing = (serviceType: string, field: keyof PricingEntry, value: any) => {
    setPricingData(prev => {
      const updated = {
        ...prev,
        [serviceType]: {
          ...prev[serviceType],
          [field]: value,
        },
      };
      
      const hasChanges = JSON.stringify(updated) !== JSON.stringify(initialPricingData);
      setHasChanges(hasChanges);
      
      return updated;
    });
  };

  const saveAllPricing = async () => {
    setSaving(true);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const versionName = `v${timestamp}`;
      const effectiveDate = new Date().toISOString().split('T')[0];

      const versionResponse = await fetch(`${API_BASE_URL}/admin/pricing/versions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          version: versionName,
          effective_date: effectiveDate,
        }),
      });

      if (!versionResponse.ok) {
        const errorData = await versionResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to create pricing version: ${errorData.error || 'Unknown error'}`);
      }

      const versionData = await versionResponse.json();
      const newVersionId = versionData.version.id;

      const entriesToSave = Object.values(pricingData)
        .filter(entry => entry.unit_price !== undefined && entry.unit_price !== null);
      
      const savePromises = entriesToSave.map(async (entry) => {
        const payload = {
          pricing_version_id: newVersionId,
          provider: selectedProvider,
          service_type: entry.service_type,
          tier: entry.tier,
          region: entry.region,
          unit_type: entry.unit_type,
          unit_price: typeof entry.unit_price === 'string' ? parseFloat(entry.unit_price) : entry.unit_price,
          annual_multiplier: typeof entry.annual_multiplier === 'string' ? parseFloat(entry.annual_multiplier) : entry.annual_multiplier,
          metadata: entry.notes ? { notes: entry.notes } : undefined,
        };

        const response = await fetch(`${API_BASE_URL}/admin/pricing`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(`Failed to save ${entry.service_type}: ${errorData.error || 'Unknown error'}`);
        }

        return response.json();
      });

      await Promise.all(savePromises);
      
      setCurrentVersion(newVersionId);
      toast.success(`Pricing data saved successfully! New version: ${versionName}`);
      setHasChanges(false);
      await loadPricingData();
    } catch (error) {
      console.error('Save pricing error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save pricing data');
    } finally {
      setSaving(false);
    }
  };

  // Architecture Calculator Functions
  const updateComponentSelection = (componentId: string, field: keyof ComponentSelection, value: any) => {
    setComponentSelections(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        componentId,
        [field]: value,
        ...(field === 'selectedTier' ? { instances: 0 } : {}),
      },
    }));
  };

  const calculateTotalCost = (componentId: string): number => {
    const selection = componentSelections[componentId];
    if (!selection || !selection.selectedTier || !selection.instances || selection.instances <= 0) {
      return 0;
    }

    const pricing = pricingData[selection.selectedTier];
    if (!pricing || !pricing.unit_price) {
      return 0;
    }

    return pricing.unit_price * selection.instances * pricing.annual_multiplier;
  };

  const getTotalCostForSection = (section: typeof ARCHITECTURE_SECTIONS[0]): number => {
    return section.components.reduce((sum, component) => {
      return sum + calculateTotalCost(component.id);
    }, 0);
  };

  const getGrandTotal = (): number => {
    return ARCHITECTURE_SECTIONS.reduce((sum, section) => {
      return sum + getTotalCostForSection(section);
    }, 0);
  };

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cloud Pricing Management</h1>
          <p className="text-gray-600">Enter unit costs for AWS, GCP, and Azure cloud services</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cloud Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value as 'AWS' | 'GCP' | 'Azure');
                  setHasChanges(false);
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
              >
                <option value="AWS">AWS</option>
                <option value="GCP">GCP</option>
                <option value="Azure">Azure</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={saveAllPricing}
                disabled={!hasChanges || saving}
                className="w-full px-4 py-2 bg-[#17A2B8] text-white rounded-md hover:bg-[#138C9E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save All Pricing
                  </>
                )}
              </button>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setShowCalculator(!showCalculator)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <Calculator size={20} />
                {showCalculator ? 'Hide' : 'Show'} Cost Calculator
              </button>
            </div>
          </div>

          {hasChanges && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-yellow-800">You have unsaved changes</span>
            </div>
          )}
        </div>

        {/* Architecture Cost Calculator */}
        {showCalculator && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Cloud Architecture Cost Calculator</h2>
              <div className="text-right">
                <div className="text-sm text-gray-600">Grand Total</div>
                <div className="text-2xl font-bold text-[#17A2B8]">
                  ${getGrandTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            <Accordion type="multiple" className="space-y-2">
              {ARCHITECTURE_SECTIONS.map((section) => {
                const sectionTotal = getTotalCostForSection(section);
                return (
                  <AccordionItem
                    key={section.id}
                    value={section.id}
                    className="border border-gray-200 rounded-lg"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="text-sm font-semibold text-gray-900">{section.name}</span>
                        <span className="text-sm font-bold text-[#17A2B8]">
                          ${sectionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service Component</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Instances</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {section.components.map((component) => {
                              const selection = componentSelections[component.id] || {
                                componentId: component.id,
                                selectedTier: component.tierOptions[0] || '',
                                instances: 0,
                              };
                              const totalCost = calculateTotalCost(component.id);
                              const selectedPricing = selection.selectedTier ? pricingData[selection.selectedTier] : null;

                              return (
                                <tr key={component.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{component.name}</td>
                                  <td className="px-4 py-2">
                                    <select
                                      value={selection.selectedTier}
                                      onChange={(e) => updateComponentSelection(component.id, 'selectedTier', e.target.value)}
                                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                                    >
                                      {component.tierOptions.map((tier) => (
                                        <option key={tier} value={tier}>{tier}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-4 py-2">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={selection.instances || ''}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        updateComponentSelection(component.id, 'instances', value);
                                      }}
                                      className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                                      placeholder="0"
                                    />
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="text-sm font-semibold text-gray-900">
                                      ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    {selectedPricing && selection.instances > 0 && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        ${selectedPricing.unit_price.toFixed(3)} × {selection.instances} × {selectedPricing.annual_multiplier}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}

        {/* Pricing Tables */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#17A2B8] mb-4" />
            <p className="text-gray-500">Loading pricing data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {PRICING_CATEGORIES.map((category) => (
              <PricingCategoryTable
                key={category.name}
                category={category}
                provider={selectedProvider}
                pricingData={pricingData}
                onUpdate={updatePricing}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Pricing Category Table Component
function PricingCategoryTable({
  category,
  provider,
  pricingData,
  onUpdate,
}: {
  category: PricingCategory;
  provider: string;
  pricingData: Record<string, PricingEntry>;
  onUpdate: (serviceType: string, field: keyof PricingEntry, value: any) => void;
}) {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{category.name}</h2>
        <p className="text-sm text-gray-500 mt-1">{provider} Pricing</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service Component
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Annual Multiplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {category.services.map((service) => {
              const entry = pricingData[service.service_type] || {
                service_type: service.service_type,
                unit_type: service.unit_type,
                unit_price: 0,
                annual_multiplier: service.default_annual_multiplier,
                notes: service.notes,
              };

              const getUnitLabel = (serviceType: string, unitType: string): string => {
                const specificLabels: Record<string, string> = {
                  'vCPU': 'per vCPU-Hour',
                  'vCPU (with 3-yr CUD)': 'per vCPU-Hour',
                  'Memory (RAM)': 'per GB-Hour',
                  'Memory (with 3-yr CUD)': 'per GB-Hour',
                  'Cluster Management': 'per Cluster-Month',
                  'Persistent Disk (SSD)': 'per GB-Month',
                  'Persistent Disk (Standard HDD)': 'per GB-Month',
                  'Object Storage (Standard)': 'per GB-Month',
                  'Object Storage (Archive)': 'per GB-Month',
                  'Data Egress (0-1 TB)': 'per GB',
                  'Data Egress (1-10 TB)': 'per GB',
                  'Data Egress (10+ TB)': 'per GB',
                  'Load Balancer': 'per LB-Hour',
                  'Static IP Address': 'per IP-Hour',
                  'Managed SQL (4 vCPU, 15 GB RAM)': 'per Hour',
                  'Managed SQL (8 vCPU, 30 GB RAM)': 'per Hour',
                  'NoSQL Database (Standard)': 'per GB-Month',
                  'Premium Support (Spend $0-$10K/month)': '% of monthly spend',
                  'Premium Support (Spend >$10K/month)': '% of monthly spend',
                  'Stackdriver Logging': 'per GB Ingested',
                  'Stackdriver Monitoring': 'per GB',
                };

                return specificLabels[serviceType] || {
                  hourly: 'per Hour',
                  gb_month: 'per GB-Month',
                  gb: 'per GB',
                  percentage: '% of monthly spend',
                }[unitType] || unitType;
              };

              const inputKey = `${service.service_type}_unit_price`;
              const displayValue = inputValues[inputKey] !== undefined
                ? inputValues[inputKey]
                : (entry.unit_price === 0 || entry.unit_price === undefined || entry.unit_price === null
                    ? ''
                    : entry.unit_price.toString());

              return (
                <tr key={service.service_type} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{service.service_type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{getUnitLabel(service.service_type, entry.unit_type)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {entry.unit_type === 'percentage' ? (
                        <span className="text-sm text-gray-500">%</span>
                      ) : (
                        <span className="text-sm text-gray-500">$</span>
                      )}
                      <input
                        type="text"
                        inputMode="decimal"
                        value={displayValue}
                        onChange={(e) => {
                          let inputValue = e.target.value;
                          inputValue = inputValue.replace(/[^\d.]/g, '');
                          const parts = inputValue.split('.');
                          if (parts.length > 2) {
                            inputValue = parts[0] + '.' + parts.slice(1).join('');
                          }
                          if (parts.length === 2 && parts[1].length > 5) {
                            inputValue = parts[0] + '.' + parts[1].substring(0, 5);
                          }
                          setInputValues(prev => ({
                            ...prev,
                            [inputKey]: inputValue
                          }));
                          if (inputValue === '' || inputValue === '.') {
                            onUpdate(service.service_type, 'unit_price', 0);
                            return;
                          }
                          if (/^\d*\.?\d*$/.test(inputValue)) {
                            if (inputValue.endsWith('.')) {
                              const numPart = parseFloat(inputValue.slice(0, -1));
                              if (!isNaN(numPart) && numPart >= 0) {
                                onUpdate(service.service_type, 'unit_price', numPart);
                              }
                              return;
                            }
                            const value = parseFloat(inputValue);
                            if (!isNaN(value) && value >= 0 && value <= 999999.999) {
                              onUpdate(service.service_type, 'unit_price', value);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          setInputValues(prev => {
                            const newState = { ...prev };
                            delete newState[inputKey];
                            return newState;
                          });
                          const inputValue = e.target.value.trim();
                          if (inputValue === '' || inputValue === '.') {
                            onUpdate(service.service_type, 'unit_price', 0);
                            return;
                          }
                          const value = parseFloat(inputValue);
                          if (!isNaN(value) && value >= 0) {
                            const rounded = Math.round(value * 100000) / 100000;
                            onUpdate(service.service_type, 'unit_price', rounded);
                          } else {
                            onUpdate(service.service_type, 'unit_price', 0);
                          }
                        }}
                        onFocus={(e) => {
                          const currentValue = entry.unit_price === 0 || entry.unit_price === undefined || entry.unit_price === null
                            ? ''
                            : entry.unit_price.toString();
                          setInputValues(prev => ({
                            ...prev,
                            [inputKey]: currentValue
                          }));
                        }}
                        className="w-32 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                        placeholder="0.00000"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={entry.annual_multiplier || service.default_annual_multiplier}
                      onChange={(e) =>
                        onUpdate(service.service_type, 'annual_multiplier', parseFloat(e.target.value) || 1)
                      }
                      className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <textarea
                      value={entry.notes || service.notes || ''}
                      onChange={(e) => onUpdate(service.service_type, 'notes', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A2B8] resize-none"
                      placeholder={service.notes}
                      rows={2}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
