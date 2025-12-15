import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Calculator, Download, Save, Edit2, X, Check, Plus, Trash2 } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../components/ui/accordion';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import logo from 'figma:asset/bc56b2cd1a0b77abaa55ba2f68f90ef6c8e0ef44.png';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface FormData {
  mstrLicensingCost: string;
  ancillaryLicensingPercentage: string;
  numberOfInstances: string;
  hostingEnvironment: string;
  mstrSupportCosts: string;
}

interface PricingEntry {
  service_type: string;
  tier?: string;
  region?: string;
  unit_type: 'hourly' | 'gb_month' | 'gb' | 'percentage';
  unit_price: number;
  annual_multiplier: number;
  notes?: string;
}

interface ComponentSelection {
  componentId: string;
  selectedTier: string;
  instances: number;
  totalDataGB?: number; // For Cloud Storage and Data Egress
}

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
      { id: 'cluster-mgmt', name: 'Cluster Management', tierOptions: ['GKE Cluster Management'] },
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
      { id: 'storage', name: 'Cloud Storage', tierOptions: ['Persistent Disk (SSD)', 'Persistent Disk (Standard HDD)', 'Object Storage (Standard)', 'Object Storage (Archive)'] },
    ],
  },
  {
    id: 'database',
    name: 'Database Pricing',
    components: [
      { id: 'database', name: 'Database', tierOptions: ['Managed SQL (4 vCPU, 15 GB RAM)', 'Managed SQL (8 vCPU, 30 GB RAM)', 'NoSQL Database (Standard)'] },
    ],
  },
  {
    id: 'network-egress',
    name: 'Network (Data Egress)',
    components: [
      { id: 'data-egress', name: 'Data Egress', tierOptions: ['Data Egress (0-1 TB)', 'Data Egress (1-10 TB)', 'Data Egress (10+ TB)'] },
    ],
  },
  {
    id: 'load-balancer',
    name: 'Cloud Load Balancer',
    components: [
      { id: 'load-balancer', name: 'Load Balancer', tierOptions: ['Load Balancer'] },
    ],
  },
  {
    id: 'static-ip',
    name: 'Static IP Address',
    components: [
      { id: 'static-ip', name: 'Static IP Address', tierOptions: ['Static IP Address'] },
    ],
  },
];

export default function AnalysisForm() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const isNewAnalysis = id === 'new';

  const [formData, setFormData] = useState<FormData>({
    mstrLicensingCost: '',
    ancillaryLicensingPercentage: '',
    numberOfInstances: '',
    hostingEnvironment: 'GCP',
    mstrSupportCosts: '0.00',
  });

  const [showResults, setShowResults] = useState(false);
  const [analysisTitle, setAnalysisTitle] = useState('');
  const [pricingData, setPricingData] = useState<Record<string, PricingEntry>>({});
  const [componentSelections, setComponentSelections] = useState<Record<string, ComponentSelection>>({});
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for editable report content - track which items are being edited
  const [editingItems, setEditingItems] = useState<Record<string, boolean>>({});
  const [editableContent, setEditableContent] = useState<{
    costRows: Record<string, Array<{
      id: string;
      costLabel: string;
      costValue: string;
      natureOfCosts: string;
      costSensitivity: string;
      confidenceScore: string;
      description: string;
    }>>;
    assumptions: string[];
    insights: { title: string; description: string }[];
    terms: { title: string; description: string }[];
    qa: { question: string; answer: string }[];
    architectureImpact: string;
  }>({
    costRows: {},
    assumptions: [],
    insights: [],
    terms: [],
    qa: [],
    architectureImpact: '',
  });
  const initializedRef = useRef(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [hasSavedResults, setHasSavedResults] = useState(false);
  const [versions, setVersions] = useState<Array<{ version_number: number; created_at: string; created_by_email: string }>>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number | null>(null);

  // Load versions for an analysis
  useEffect(() => {
    const loadVersions = async () => {
      if (!id || id === 'new') {
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/analysis/${id}/versions`, {
          headers: getAuthHeaders(),
        });

        if (response.ok) {
          const data = await response.json();
          setVersions(data.versions || []);
        }
      } catch (error) {
        console.error('Error loading versions:', error);
      }
    };

    loadVersions();
  }, [id]);

  // Load saved analysis data when viewing an existing analysis
  useEffect(() => {
    const loadAnalysis = async () => {
      if (!id || id === 'new') {
        return;
      }

      setLoadingAnalysis(true);
      try {
        const url = selectedVersion 
          ? `${API_BASE_URL}/analysis/${id}?version=${selectedVersion}`
          : `${API_BASE_URL}/analysis/${id}`;
        
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          console.error('Failed to load analysis');
          setLoadingAnalysis(false);
          return;
        }

        const data = await response.json();
        const { analysis, inputs, results, editableContent } = data;
        
        // Set current version number
        if (analysis.current_version_number) {
          setCurrentVersionNumber(analysis.current_version_number);
          if (!selectedVersion) {
            setSelectedVersion(analysis.current_version_number);
          }
        }

        // Set analysis title
        if (analysis.title) {
          setAnalysisTitle(analysis.title);
        }

        // Populate form data from inputs
        if (inputs) {
          setFormData({
            mstrLicensingCost: inputs.mstr_license_per_instance?.toString() || '',
            ancillaryLicensingPercentage: inputs.ancillary_license_pct?.toString() || '',
            numberOfInstances: inputs.instance_count?.toString() || '',
            hostingEnvironment: inputs.hosting_environment || 'GCP',
            mstrSupportCosts: inputs.mstr_support_cost?.toString() || '0.00',
          });

          // Load component selections from tier_selections
          // tier_selections is stored as JSONB, so it might be a string or already an object
          if (inputs.tier_selections) {
            let tierSelections = inputs.tier_selections;
            if (typeof tierSelections === 'string') {
              try {
                tierSelections = JSON.parse(tierSelections);
              } catch (e) {
                console.error('Error parsing tier_selections:', e);
                tierSelections = {};
              }
            }
            if (typeof tierSelections === 'object' && tierSelections !== null) {
              setComponentSelections(tierSelections);
            }
          }
        }

        // Load editable content if available (from saved version)
        if (editableContent) {
          setEditableContent(editableContent);
          initializedRef.current = true; // Mark as initialized so it doesn't get overwritten
        }

        // Mark that we have saved results (we'll show them after pricing loads)
        if (results) {
          setHasSavedResults(true);
        }
      } catch (error) {
        console.error('Error loading analysis:', error);
      } finally {
        setLoadingAnalysis(false);
      }
    };

    loadAnalysis();
  }, [id, selectedVersion]);

  // Show results after pricing data loads if we have saved results
  useEffect(() => {
    if (hasSavedResults && !loadingPricing && Object.keys(pricingData).length > 0) {
      setShowResults(true);
      // Reset initializedRef so editable content gets initialized
      initializedRef.current = false;
    }
  }, [hasSavedResults, loadingPricing, pricingData]);

  useEffect(() => {
    if (formData.hostingEnvironment) {
      loadPricingData();
    }
  }, [formData.hostingEnvironment]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadPricingData = async () => {
    setLoadingPricing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/pricing/version/active`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        return;
      }

      const versionData = await response.json();
      const versionId = versionData.pricingVersion.id;

      const pricingResponse = await fetch(
        `${API_BASE_URL}/pricing/${formData.hostingEnvironment}`,
        { headers: getAuthHeaders() }
      );

      if (!pricingResponse.ok) {
        return;
      }

      const data = await pricingResponse.json();
      const pricingMap: Record<string, PricingEntry> = {};
      
      (data.pricing || []).forEach((entry: any) => {
        // Index by tier (which is what we use for lookup in the calculator)
        // This allows us to look up "Cluster Management" directly
        // Use tier as the primary key, fallback to service_type if tier is missing
        const lookupKey = entry.tier || entry.service_type;
        if (lookupKey) {
          pricingMap[lookupKey] = {
            service_type: entry.service_type,
            tier: entry.tier,
            region: entry.region,
            unit_type: entry.unit_type,
            unit_price: parseFloat(entry.unit_price) || 0,
            annual_multiplier: parseFloat(entry.annual_multiplier) || 1,
            notes: entry.metadata?.notes || '',
          };
        }
      });

      setPricingData(pricingMap);
    } catch (error) {
      console.error('Load pricing data error:', error);
    } finally {
      setLoadingPricing(false);
    }
  };

  const updateComponentSelection = (componentId: string, field: keyof ComponentSelection, value: any) => {
    setComponentSelections(prev => ({
      ...prev,
      [componentId]: {
        componentId,
        selectedTier: field === 'selectedTier' ? value : (prev[componentId]?.selectedTier || ''),
        instances: field === 'instances' ? value : (prev[componentId]?.instances || 0),
        totalDataGB: field === 'totalDataGB' ? value : (prev[componentId]?.totalDataGB || 0),
      },
    }));
  };

  const calculateTotalCost = (componentId: string): number => {
    const selection = componentSelections[componentId];
    // Don't calculate if tier is blank/empty (user hasn't selected yet)
    if (!selection || !selection.selectedTier || selection.selectedTier === '') {
      return 0;
    }

    // For Cloud Storage and Data Egress, require totalDataGB
    const requiresDataGB = componentId === 'storage' || componentId === 'data-egress';
    if (requiresDataGB) {
      if (!selection.totalDataGB || selection.totalDataGB <= 0) {
        return 0;
      }
    } else {
      // For other components, require instances
      if (!selection.instances || selection.instances <= 0) {
        return 0;
      }
    }

    // Map display tier names to pricing lookup keys (tier names in database)
    const tierMapping: Record<string, string> = {
      'GKE Cluster Management': 'Cluster Management',
      'vCPU': 'vCPU',
      'vCPU (with 3-yr CUD)': 'vCPU (with 3-yr CUD)',
      'Memory (RAM)': 'Memory (RAM)',
      'Memory (with 3-yr CUD)': 'Memory (with 3-yr CUD)',
      'Persistent Disk (SSD)': 'Persistent Disk (SSD)',
      'Persistent Disk (Standard HDD)': 'Persistent Disk (Standard HDD)',
      'Object Storage (Standard)': 'Object Storage (Standard)',
      'Object Storage (Archive)': 'Object Storage (Archive)',
      'Managed SQL (4 vCPU, 15 GB RAM)': 'Managed SQL (4 vCPU, 15 GB RAM)',
      'Managed SQL (8 vCPU, 30 GB RAM)': 'Managed SQL (8 vCPU, 30 GB RAM)',
      'NoSQL Database (Standard)': 'NoSQL Database (Standard)',
      'Data Egress (0-1 TB)': 'Data Egress (0-1 TB)',
      'Data Egress (1-10 TB)': 'Data Egress (1-10 TB)',
      'Data Egress (10+ TB)': 'Data Egress (10+ TB)',
    };

    // Look up the actual pricing key (map display name to pricing key if needed)
    const pricingKey = tierMapping[selection.selectedTier] || selection.selectedTier;
    const pricing = pricingData[pricingKey];
    
    // Debug logging (can be removed in production)
    if (!pricing && selection.selectedTier) {
      console.log('Pricing lookup failed:', {
        selectedTier: selection.selectedTier,
        pricingKey,
        availableKeys: Object.keys(pricingData),
      });
    }
    
    if (!pricing || pricing.unit_price === undefined || pricing.unit_price === null || pricing.unit_price === 0) {
      return 0;
    }

    // Calculate based on component type:
    // For Cloud Storage: unit_price × totalDataGB × instances × annual_multiplier
    // For Data Egress: unit_price × totalDataGB × annual_multiplier
    // For other components: unit_price × instances × annual_multiplier
    if (componentId === 'storage') {
      const total = pricing.unit_price * (selection.totalDataGB || 0) * (selection.instances || 1) * pricing.annual_multiplier;
      return total;
    } else if (requiresDataGB) {
      const total = pricing.unit_price * (selection.totalDataGB || 0) * pricing.annual_multiplier;
      return total;
    } else {
      const total = pricing.unit_price * selection.instances * pricing.annual_multiplier;
      return total;
    }
  };

  const getTotalCostForSection = (section: typeof ARCHITECTURE_SECTIONS[0]): number => {
    return section.components.reduce((sum, component) => {
      return sum + calculateTotalCost(component.id);
    }, 0);
  };

  const getArchitectureTotal = (): number => {
    return ARCHITECTURE_SECTIONS.reduce((sum, section) => {
      return sum + getTotalCostForSection(section);
    }, 0);
  };

  const calculateSupportServicesCost = (): number => {
    const selection = componentSelections['support-services'];
    if (!selection || !selection.selectedTier) {
      return 0;
    }

    // Map display tier names to pricing lookup keys
    const tierMapping: Record<string, string> = {
      'GCP Premium Support (Spend $0–$10K/month)': 'Premium Support (Spend $0-$10K/month)',
      'GCP Premium Support (Spend >$10K/month)': 'Premium Support (Spend >$10K/month)',
    };
    const pricingKey = tierMapping[selection.selectedTier] || selection.selectedTier;
    const pricing = pricingData[pricingKey];
    
    if (!pricing || pricing.unit_price === undefined || pricing.unit_price === null || pricing.unit_price === 0) {
      return 0;
    }
    
    // Calculate: (unit_price as percentage) × Total Architecture Cost
    // unit_price is stored as a percentage (e.g., 5 for 5%)
    const totalArchitectureCost = getArchitectureTotal();
    const total = (pricing.unit_price / 100) * totalArchitectureCost;
    return total;
  };

  const getComputeCosts = (): number => {
    // Sum of Compute (GKE) and GKE Cluster Management costs
    const computeGkeCost = calculateTotalCost('compute-gke');
    const clusterMgmtCost = calculateTotalCost('cluster-mgmt');
    return computeGkeCost + clusterMgmtCost;
  };

  const getInfrastructureCosts = (): number => {
    // Sum of Memory (RAM), Cloud Load Balancer, and Static IP Address costs
    const memoryRamCost = calculateTotalCost('memory-ram');
    const loadBalancerCost = calculateTotalCost('load-balancer');
    const staticIpCost = calculateTotalCost('static-ip');
    return memoryRamCost + loadBalancerCost + staticIpCost;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Calculate all the costs
  const calculateCosts = () => {
    const mstrLicensing = Number(formData.mstrLicensingCost || 0) * Number(formData.numberOfInstances || 0);
    const ancillaryLicensing = Number(formData.ancillaryLicensingPercentage || 0); // Now MSTR Support Costs (Annual) - dollar amount
    const cloudPersonnel = 0; // Removed from inputs
    const mstrSupport = Number(formData.mstrSupportCosts || 0); // Now Strategy Professional Services
    
    // Cloud Infrastructure Costs from Architecture Calculator
    const totalCloudInfra = getArchitectureTotal();
    
    const totalCurrentState = mstrLicensing + ancillaryLicensing + cloudPersonnel + mstrSupport + totalCloudInfra;
    
    // ClearWays Managed Model (30% savings on infrastructure, 40% on personnel)
    const clearwaysMstrLicensing = mstrLicensing;
    const clearwaysAncillary = ancillaryLicensing;
    const clearwaysCloudInfra = totalCloudInfra * 0.7; // 30% savings
    const clearwaysPersonnel = cloudPersonnel * 0.6; // 40% savings (will be 0)
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

  const costs = useMemo(() => {
    if (!showResults) return null;
    return calculateCosts();
  }, [showResults, formData.mstrLicensingCost, formData.ancillaryLicensingPercentage, formData.numberOfInstances, formData.mstrSupportCosts, componentSelections]);

  const initializeEditableContent = (costsData: NonNullable<typeof costs>) => {
    
    const defaultAssumptions = [
      `Pricing Basis: Cloud infrastructure rates based on ${formData.hostingEnvironment} standard pricing as of December 2024. Actual rates may vary by region and commitment level.`,
      'Usage Patterns: Assumes steady-state workload. Seasonal peaks, user growth, or data volume increases will impact metered costs proportionally.',
      'Optimization Savings: Infrastructure savings (30%) based on right-sizing, reserved capacity, and architectural improvements. Requires active management and monitoring.',
      'Personnel Model: Personnel cost reduction (40%) reflects managed service model with shared expert team vs. dedicated full-time employees. Assumes equivalent coverage and expertise level.',
      'License Portability: Assumes existing MSTR licenses can transfer to managed model. Some license agreements may require renegotiation.',
      'Migration Costs: This analysis does not include one-time migration, setup, or transition costs. A separate assessment is required for initial onboarding expenses.',
      'Service Levels: Comparison assumes equivalent uptime SLAs, response times, and support quality between current and managed states.',
    ];

    const defaultInsights = [
      {
        title: 'Infrastructure Optimization Opportunity',
        description: `Your current metered costs of ${costsData.currentState.totalCloudInfra.toLocaleString('en-US', { minimumFractionDigits: 2 })} can be reduced by 30% through right-sizing, auto-scaling, and reserved capacity planning, saving ${(costsData.currentState.totalCloudInfra * 0.3).toLocaleString('en-US', { minimumFractionDigits: 2 })} annually.`,
      },
      {
        title: 'Personnel Cost Efficiency',
        description: `Transitioning to a managed service model replaces dedicated personnel costs with a shared expert team model, reducing annual spending from ${costsData.currentState.cloudPersonnel.toLocaleString('en-US', { minimumFractionDigits: 2 })} to ${costsData.clearways.cloudPersonnel.toLocaleString('en-US', { minimumFractionDigits: 2 })} while maintaining 24/7 coverage.`,
      },
      {
        title: 'Total Cost of Ownership (TCO) Reduction',
        description: `Overall TCO reduces by ${costsData.savings.percentage.toFixed(1)}% (${costsData.savings.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} annually) through combined infrastructure optimization, personnel efficiency, and architectural improvements.`,
      },
      {
        title: 'Scalability & Flexibility',
        description: 'ClearWays managed model provides elastic scaling capability to handle growth without proportional cost increases or hiring delays, enabling rapid response to business needs.',
      },
    ];

    const defaultTerms = [
      { title: 'Static Costs', description: 'Costs that remain constant regardless of usage levels. These are typically contractual obligations with fixed annual or multi-year terms.' },
      { title: 'Metered Costs', description: 'Variable costs based on actual consumption (compute hours, storage GB, data transfer). Billed based on usage patterns and can fluctuate month-to-month.' },
      { title: 'Blended Support', description: 'Combination of internal personnel costs and external vendor support fees required to maintain platform operations and user assistance.' },
      { title: 'Architecture Choice Costs', description: 'Hidden costs resulting from design decisions—over-provisioning, inefficient data models, or poor capacity planning that increase infrastructure spend.' },
      { title: 'Reserved Instances', description: 'Commitment to use specific cloud resources over 1-3 years in exchange for significant discounts (typically 30-70% off on-demand pricing).' },
      { title: 'Egress Costs', description: 'Charges for data transfer out of cloud provider\'s network. Often overlooked but can represent 10-20% of total cloud spend in data-intensive applications.' },
      { title: 'Total Cost of Ownership (TCO)', description: 'Comprehensive view of all costs—licensing, infrastructure, personnel, support, and hidden costs—required for accurate budget planning.' },
      { title: 'Managed Service Model', description: 'Third-party provider assumes operational responsibility for platform management, monitoring, optimization, and support under service level agreements (SLAs).' },
    ];

    const defaultQA = [
      { question: 'How accurate are these savings projections?', answer: 'Savings percentages are based on actual client results from similar deployments. However, your specific results will depend on current infrastructure efficiency, usage patterns, and organizational factors. We recommend a detailed technical assessment to validate projections for your environment.' },
      { question: 'What happens to our existing MSTR licenses?', answer: 'In most cases, existing MSTR licenses can transfer to the managed model. ClearWays will work with you and MicroStrategy to ensure license portability and compliance. Some enterprise agreements may require amendment or renegotiation.' },
      { question: 'How long does migration take?', answer: 'Typical migration timeline is 4-12 weeks depending on environment complexity, number of instances, data volume, and customization requirements. We provide a detailed migration plan with milestones during the assessment phase.' },
      { question: 'What are the upfront migration costs?', answer: 'Migration costs are not included in this analysis and vary by project scope. These typically include assessment fees, migration services, testing, and training. We can provide a separate migration cost estimate after technical discovery.' },
      { question: 'How do you achieve 30% infrastructure savings?', answer: 'Through a combination of right-sizing (eliminating over-provisioned resources), reserved instance/committed use pricing, auto-scaling to match demand, architectural optimization, and continuous cost monitoring. These are proven techniques applied across our client base.' },
      { question: 'Will we lose control over our MSTR environment?', answer: 'No. You maintain full visibility and governance. ClearWays operates as an extension of your team with regular reporting, change control processes, and collaborative decision-making on architecture and optimization initiatives.' },
      { question: 'What if our usage grows significantly?', answer: 'The managed model is designed for scalability. Costs will increase proportionally with metered resources, but optimization strategies minimize the rate of increase. We provide capacity planning and growth forecasting as part of the service.' },
      { question: 'What SLAs do you provide?', answer: 'Standard SLAs include 99.9% uptime, 24/7 monitoring, incident response times based on severity (critical: 15 min, high: 1 hour, medium: 4 hours), and monthly performance reporting. Enterprise SLAs with higher guarantees are available.' },
    ];

    // Initialize default rows for each table
    const defaultCostRows: Record<string, Array<{
      id: string;
      costLabel: string;
      costValue: string;
      natureOfCosts: string;
      costSensitivity: string;
      confidenceScore: string;
      description: string;
    }>> = {
      'negotiated-licensing': [
        {
          id: 'mstr-licensing',
          costLabel: 'MSTR negotiated Licensing rates (Per instance) - Annual, contractually negotiated MicroStrategy platform licensing cost per deployed production instance. This cost is fixed for the contract term and independent of usage volume, user count, or query load.',
          costValue: costsData.currentState.mstrLicensing.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          natureOfCosts: 'Negotiated',
          costSensitivity: 'Low',
          confidenceScore: '5 - Very High',
          description: 'Contracted, fixed for term; risk only if instance count changes',
        },
        {
          id: 'ancillary-licensing',
          costLabel: 'Licensing and usage of ancillary (Supporting technologies like Zookeeper, Kafka etc.) - (Provision is given to calculate based on its contributive costs) - Annual licensing or subscription costs for supporting technologies required to operate and scale the MicroStrategy platform (e.g., coordination, messaging, monitoring). Costs are modeled as a percentage of the core platform spend and proportional dependency rather than standalone usage growth.',
          costValue: costsData.currentState.ancillaryLicensing.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          natureOfCosts: 'Negotiated',
          costSensitivity: 'Low-Medium',
          confidenceScore: '4 - High',
          description: 'Modeled as % of core spend; bounded but dependent on platform footprint',
        },
      ],
      'metered-costs': [
        {
          id: 'compute-costs',
          costLabel: 'Compute costs - Processing power and virtual machine costs from Architecture Calculator (sum of Compute (GKE) and GKE Cluster Management). Varies with workload intensity, number of concurrent users, query complexity, and report generation frequency.',
          costValue: getComputeCosts().toLocaleString('en-US', { minimumFractionDigits: 2 }),
          natureOfCosts: 'Variable',
          costSensitivity: 'High',
          confidenceScore: '3 - Medium',
          description: 'Directly tied to workload; can spike with user activity and query patterns',
        },
        {
          id: 'infrastructure-costs',
          costLabel: 'Infrastructure costs - Network, load balancing, and connectivity costs from Architecture Calculator (sum of Memory (RAM), Cloud Load Balancer, and Static IP Address). Scales with traffic volume, geographic distribution, and number of concurrent connections.',
          costValue: getInfrastructureCosts().toLocaleString('en-US', { minimumFractionDigits: 2 }),
          natureOfCosts: 'Variable',
          costSensitivity: 'Medium',
          confidenceScore: '4 - High',
          description: 'Moderate variability; grows with traffic but more predictable than compute',
        },
        {
          id: 'storage-costs',
          costLabel: 'Storage costs - Data storage and database costs from Architecture Calculator. Grows with data retention policies, historical data accumulation, backup requirements, and archival strategies.',
          costValue: (costsData.currentState.totalCloudInfra * 0.25).toLocaleString('en-US', { minimumFractionDigits: 2 }),
          natureOfCosts: 'Variable',
          costSensitivity: 'Medium',
          confidenceScore: '4 - High',
          description: 'Predictable growth over time; optimization possible through retention policies',
        },
        {
          id: 'egress-costs',
          costLabel: 'Egress costs - Data transfer out costs from Architecture Calculator. Depends on report exports, dashboard refreshes, API calls, cross-region replication, and external integrations.',
          costValue: (costsData.currentState.totalCloudInfra * 0.2).toLocaleString('en-US', { minimumFractionDigits: 2 }),
          natureOfCosts: 'Variable',
          costSensitivity: 'High',
          confidenceScore: '3 - Medium',
          description: 'Highly variable based on usage patterns; architectural choices significantly impact costs',
        },
      ],
      'total-costs': [
        {
          id: 'total-licensing-costs',
          costLabel: 'Licensing Costs (Static) - Combined MSTR and ancillary licensing. Fixed contractual obligation renewed annually. Negotiated savings possible at renewal based on user count and commitment length.',
          costValue: (costsData.currentState.mstrLicensing + costsData.currentState.ancillaryLicensing).toLocaleString('en-US', { minimumFractionDigits: 2 }),
          natureOfCosts: 'Negotiated',
          costSensitivity: 'Low',
          confidenceScore: '5 - Very High',
          description: 'Contractually fixed; minimal variance risk during contract term',
        },
        {
          id: 'total-metered-costs',
          costLabel: 'Metered Costs (Running) - Variable infrastructure costs that fluctuate with usage. Highest opportunity for optimization through right-sizing, reserved capacity, and architectural improvements (30% potential savings).',
          costValue: costsData.currentState.totalCloudInfra.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          natureOfCosts: 'Variable',
          costSensitivity: 'High',
          confidenceScore: '3 - Medium',
          description: 'Subject to usage volatility; optimization opportunities reduce long-term variability',
        },
        {
          id: 'total-support-costs',
          costLabel: 'Support Costs (Blended) - Personnel and vendor support combined. Managed service model reduces this by 40% through shared team efficiency while maintaining 24/7 coverage and specialized expertise.',
          costValue: (costsData.currentState.cloudPersonnel + costsData.currentState.mstrSupport).toLocaleString('en-US', { minimumFractionDigits: 2 }),
          natureOfCosts: 'Blended',
          costSensitivity: 'Medium',
          confidenceScore: '4 - High',
          description: 'Mix of fixed vendor fees and variable personnel; managed model provides cost predictability',
        },
      ],
      'support-costs': [
        {
          id: 'cloud-personnel-costs',
          costLabel: 'Cloud Personnel costs - In-house staff costs including engineers, architects, and support personnel. Includes salaries, benefits, training, overhead, and opportunity costs. Fixed until hiring/termination decisions are made.',
          costValue: costsData.currentState.cloudPersonnel.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          natureOfCosts: 'Semi-Fixed',
          costSensitivity: 'Medium',
          confidenceScore: '4 - High',
          description: 'Fixed short-term but can be adjusted through workforce planning; hiring/retention risks',
        },
        {
          id: 'mstr-support-costs',
          costLabel: 'MSTR Support Costs - Annual vendor support and maintenance fees for platform updates, security patches, technical assistance, and access to knowledge base. Typically 20-22% of total license value.',
          costValue: costsData.currentState.mstrSupport.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          natureOfCosts: 'Negotiated',
          costSensitivity: 'Low',
          confidenceScore: '5 - Very High',
          description: 'Contractually fixed as percentage of license costs; predictable and transparent',
        },
      ],
      'architecture-choice-costs': [
        {
          id: 'over-provisioning',
          costLabel: 'Over-Provisioning - Resources allocated "just in case" rather than right-sized for actual demand. Common in static capacity planning without auto-scaling or demand forecasting. ClearWays applies dynamic resource allocation.',
          costValue: 'Impact: 15-25% waste',
          natureOfCosts: 'Opportunity Cost',
          costSensitivity: 'High',
          confidenceScore: '3 - Medium',
          description: 'Avoidable through dynamic scaling and right-sizing; requires monitoring and automation',
        },
        {
          id: 'inefficient-data-architecture',
          costLabel: 'Inefficient Data Architecture - Poor data modeling, redundant storage, or suboptimal query patterns increase compute and storage costs. Includes unnecessary aggregates, lack of partitioning, and inefficient indexing strategies.',
          costValue: 'Impact: 20-35% overhead',
          natureOfCosts: 'Opportunity Cost',
          costSensitivity: 'High',
          confidenceScore: '2 - Low',
          description: 'Difficult to quantify without deep assessment; requires expert analysis and remediation',
        },
        {
          id: 'lack-reserved-capacity',
          costLabel: 'Lack of Reserved Capacity - Using on-demand pricing instead of reserved instances or committed use discounts for predictable workloads. ClearWays leverages 1-3 year commitments to reduce baseline costs significantly.',
          costValue: 'Impact: 30-50% premium',
          natureOfCosts: 'Opportunity Cost',
          costSensitivity: 'Medium',
          confidenceScore: '5 - Very High',
          description: 'Well-documented savings; clear pricing from vendors; low implementation risk',
        },
        {
          id: 'multi-region-inefficiencies',
          costLabel: 'Multi-Region Inefficiencies - Unnecessary data replication or cross-region traffic without justification. Strategic architecture design minimizes egress costs while maintaining required availability and latency SLAs.',
          costValue: 'Impact: 10-20% egress',
          natureOfCosts: 'Opportunity Cost',
          costSensitivity: 'Medium',
          confidenceScore: '3 - Medium',
          description: 'Requires architectural assessment to balance cost vs. performance/availability requirements',
        },
      ],
    };

    setEditableContent({
      costRows: defaultCostRows,
      assumptions: defaultAssumptions,
      insights: defaultInsights,
      terms: defaultTerms,
      qa: defaultQA,
      architectureImpact: 'Architecture optimization typically reduces total infrastructure costs by 20-40% through better design decisions, resource allocation, and capacity planning. These savings compound with infrastructure optimization for maximum TCO reduction.',
    });
  };

  useEffect(() => {
    if (showResults && costs && !initializedRef.current) {
      initializeEditableContent(costs);
      initializedRef.current = true;
    }
  }, [showResults, costs]);

  // Helper function to format cost value to 2 decimal places (unless it's a text like "Impact: X%")
  const formatCostValue = (value: string | number): string => {
    if (typeof value === 'string') {
      // If it's already a string with text (like "Impact: 15-25% waste"), return as is
      if (value.includes('Impact:') || value.includes('%') || isNaN(Number(value.replace(/[^0-9.-]/g, '')))) {
        return value;
      }
      // Try to parse as number
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return value;
    }
    // If it's a number, format to 2 decimal places
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Helper function to get default rows for a table (calculated on the fly)
  const getDefaultRowsForTable = (tableId: string): Array<{
    id: string;
    costLabel: string;
    costValue: string;
    natureOfCosts: string;
    costSensitivity: string;
    confidenceScore: string;
    description: string;
  }> => {
    if (!costs) return [];
    
    const defaults: Record<string, Array<{
      id: string;
      costLabel: string;
      costValue: string;
      natureOfCosts: string;
      costSensitivity: string;
      confidenceScore: string;
      description: string;
    }>> = {
      'negotiated-licensing': [
        {
          id: 'mstr-licensing',
          costLabel: 'MSTR negotiated Licensing rates (Per instance) - Annual, contractually negotiated MicroStrategy platform licensing cost per deployed production instance. This cost is fixed for the contract term and independent of usage volume, user count, or query load.',
          costValue: formatCostValue(costs.currentState.mstrLicensing),
          natureOfCosts: 'Negotiated',
          costSensitivity: 'Low',
          confidenceScore: '5 - Very High',
          description: 'Contracted, fixed for term; risk only if instance count changes',
        },
        {
          id: 'ancillary-licensing',
          costLabel: 'Licensing and usage of ancillary (Supporting technologies like Zookeeper, Kafka etc.) - (Provision is given to calculate based on its contributive costs) - Annual licensing or subscription costs for supporting technologies required to operate and scale the MicroStrategy platform (e.g., coordination, messaging, monitoring). Costs are modeled as a percentage of the core platform spend and proportional dependency rather than standalone usage growth.',
          costValue: formatCostValue(costs.currentState.ancillaryLicensing),
          natureOfCosts: 'Negotiated',
          costSensitivity: 'Low-Medium',
          confidenceScore: '4 - High',
          description: 'Modeled as % of core spend; bounded but dependent on platform footprint',
        },
      ],
      'metered-costs': [
        {
          id: 'compute-costs',
          costLabel: 'Compute costs - Processing power and virtual machine costs from Architecture Calculator (sum of Compute (GKE) and GKE Cluster Management). Varies with workload intensity, number of concurrent users, query complexity, and report generation frequency.',
          costValue: formatCostValue(getComputeCosts()),
          natureOfCosts: 'Variable',
          costSensitivity: 'High',
          confidenceScore: '3 - Medium',
          description: 'Directly tied to workload; can spike with user activity and query patterns',
        },
        {
          id: 'infrastructure-costs',
          costLabel: 'Infrastructure costs - Network, load balancing, and connectivity costs from Architecture Calculator (sum of Memory (RAM), Cloud Load Balancer, and Static IP Address). Scales with traffic volume, geographic distribution, and number of concurrent connections.',
          costValue: formatCostValue(getInfrastructureCosts()),
          natureOfCosts: 'Variable',
          costSensitivity: 'Medium',
          confidenceScore: '4 - High',
          description: 'Moderate variability; grows with traffic but more predictable than compute',
        },
        {
          id: 'storage-costs',
          costLabel: 'Storage costs - Data storage and database costs from Architecture Calculator. Grows with data retention policies, historical data accumulation, backup requirements, and archival strategies.',
          costValue: formatCostValue(costs.currentState.totalCloudInfra * 0.25),
          natureOfCosts: 'Variable',
          costSensitivity: 'Medium',
          confidenceScore: '4 - High',
          description: 'Predictable growth over time; optimization possible through retention policies',
        },
        {
          id: 'egress-costs',
          costLabel: 'Egress costs - Data transfer out costs from Architecture Calculator. Depends on report exports, dashboard refreshes, API calls, cross-region replication, and external integrations.',
          costValue: formatCostValue(costs.currentState.totalCloudInfra * 0.2),
          natureOfCosts: 'Variable',
          costSensitivity: 'High',
          confidenceScore: '3 - Medium',
          description: 'Highly variable based on usage patterns; architectural choices significantly impact costs',
        },
      ],
      'total-costs': [
        {
          id: 'total-licensing-costs',
          costLabel: 'Licensing Costs (Static) - Combined MSTR and ancillary licensing. Fixed contractual obligation renewed annually. Negotiated savings possible at renewal based on user count and commitment length.',
          costValue: formatCostValue(costs.currentState.mstrLicensing + costs.currentState.ancillaryLicensing),
          natureOfCosts: 'Negotiated',
          costSensitivity: 'Low',
          confidenceScore: '5 - Very High',
          description: 'Contractually fixed; minimal variance risk during contract term',
        },
        {
          id: 'total-metered-costs',
          costLabel: 'Metered Costs (Running) - Variable infrastructure costs that fluctuate with usage. Highest opportunity for optimization through right-sizing, reserved capacity, and architectural improvements (30% potential savings).',
          costValue: formatCostValue(costs.currentState.totalCloudInfra),
          natureOfCosts: 'Variable',
          costSensitivity: 'High',
          confidenceScore: '3 - Medium',
          description: 'Subject to usage volatility; optimization opportunities reduce long-term variability',
        },
        {
          id: 'total-support-costs',
          costLabel: 'Support Costs (Blended) - Personnel and vendor support combined. Managed service model reduces this by 40% through shared team efficiency while maintaining 24/7 coverage and specialized expertise.',
          costValue: formatCostValue(costs.currentState.cloudPersonnel + costs.currentState.mstrSupport),
          natureOfCosts: 'Blended',
          costSensitivity: 'Medium',
          confidenceScore: '4 - High',
          description: 'Mix of fixed vendor fees and variable personnel; managed model provides cost predictability',
        },
      ],
      'support-costs': [
        {
          id: 'cloud-personnel-costs',
          costLabel: 'Cloud Personnel costs - In-house staff costs including engineers, architects, and support personnel. Includes salaries, benefits, training, overhead, and opportunity costs. Fixed until hiring/termination decisions are made.',
          costValue: formatCostValue(costs.currentState.cloudPersonnel),
          natureOfCosts: 'Semi-Fixed',
          costSensitivity: 'Medium',
          confidenceScore: '4 - High',
          description: 'Fixed short-term but can be adjusted through workforce planning; hiring/retention risks',
        },
        {
          id: 'mstr-support-costs',
          costLabel: 'MSTR Support Costs - Annual vendor support and maintenance fees for platform updates, security patches, technical assistance, and access to knowledge base. Typically 20-22% of total license value.',
          costValue: formatCostValue(costs.currentState.mstrSupport),
          natureOfCosts: 'Negotiated',
          costSensitivity: 'Low',
          confidenceScore: '5 - Very High',
          description: 'Contractually fixed as percentage of license costs; predictable and transparent',
        },
      ],
      'architecture-choice-costs': [
        {
          id: 'over-provisioning',
          costLabel: 'Over-Provisioning - Resources allocated "just in case" rather than right-sized for actual demand. Common in static capacity planning without auto-scaling or demand forecasting. ClearWays applies dynamic resource allocation.',
          costValue: 'Impact: 15-25% waste',
          natureOfCosts: 'Opportunity Cost',
          costSensitivity: 'High',
          confidenceScore: '3 - Medium',
          description: 'Avoidable through dynamic scaling and right-sizing; requires monitoring and automation',
        },
        {
          id: 'inefficient-data-architecture',
          costLabel: 'Inefficient Data Architecture - Poor data modeling, redundant storage, or suboptimal query patterns increase compute and storage costs. Includes unnecessary aggregates, lack of partitioning, and inefficient indexing strategies.',
          costValue: 'Impact: 20-35% overhead',
          natureOfCosts: 'Opportunity Cost',
          costSensitivity: 'High',
          confidenceScore: '2 - Low',
          description: 'Difficult to quantify without deep assessment; requires expert analysis and remediation',
        },
        {
          id: 'lack-reserved-capacity',
          costLabel: 'Lack of Reserved Capacity - Using on-demand pricing instead of reserved instances or committed use discounts for predictable workloads. ClearWays leverages 1-3 year commitments to reduce baseline costs significantly.',
          costValue: 'Impact: 30-50% premium',
          natureOfCosts: 'Opportunity Cost',
          costSensitivity: 'Medium',
          confidenceScore: '5 - Very High',
          description: 'Well-documented savings; clear pricing from vendors; low implementation risk',
        },
        {
          id: 'multi-region-inefficiencies',
          costLabel: 'Multi-Region Inefficiencies - Unnecessary data replication or cross-region traffic without justification. Strategic architecture design minimizes egress costs while maintaining required availability and latency SLAs.',
          costValue: 'Impact: 10-20% egress',
          natureOfCosts: 'Opportunity Cost',
          costSensitivity: 'Medium',
          confidenceScore: '3 - Medium',
          description: 'Requires architectural assessment to balance cost vs. performance/availability requirements',
        },
      ],
    };
    
    return defaults[tableId] || [];
  };

  // Helper functions for managing dynamic rows
  const getTableRows = (tableId: string) => {
    const existing = editableContent.costRows[tableId];
    const defaultRows = getDefaultRowsForTable(tableId);
    
    // If no defaults available (costs not calculated yet), return existing or empty array
    if (!defaultRows || defaultRows.length === 0) {
      return existing || [];
    }
    
    if (!existing || existing.length === 0) {
      // If no existing rows, return defaults and initialize them
      setEditableContent(prev => ({
        ...prev,
        costRows: {
          ...prev.costRows,
          [tableId]: defaultRows,
        },
      }));
      return defaultRows;
    }
    // Merge defaults with existing, preserving existing rows
    // For cost values, ALWAYS use the calculated default value to ensure accuracy and match subtotals
    const merged = defaultRows.map((defaultRow, index) => {
      const existingRow = existing.find(r => r.id === defaultRow.id) || existing[index];
      if (existingRow) {
        return {
          ...defaultRow,
          costLabel: existingRow.costLabel || defaultRow.costLabel,
          // CRITICAL: Always use calculated costValue from defaults (never from existing stored values)
          // This ensures individual costs always match the subtotal calculation
          costValue: defaultRow.costValue, // This is already formatted from formatCostValue(costs.currentState.mstrLicensing)
          natureOfCosts: existingRow.natureOfCosts || defaultRow.natureOfCosts,
          costSensitivity: existingRow.costSensitivity || defaultRow.costSensitivity,
          confidenceScore: existingRow.confidenceScore || defaultRow.confidenceScore,
          description: existingRow.description || defaultRow.description,
        };
      }
      return defaultRow;
    });
    
    // Update stored rows with correct cost values to prevent stale data
    setEditableContent(prev => ({
      ...prev,
      costRows: {
        ...prev.costRows,
        [tableId]: merged,
      },
    }));
    // Add any extra rows that were added but aren't in defaults
    const extraRows = existing.filter(r => !defaultRows.find(dr => dr.id === r.id));
    return [...merged, ...extraRows];
  };

  const addRowToTable = (tableId: string) => {
    setEditableContent(prev => {
      const existing = prev.costRows[tableId] || [];
      const newRow = {
        id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        costLabel: '',
        costValue: '',
        natureOfCosts: '',
        costSensitivity: 'Medium',
        confidenceScore: '3 - Medium',
        description: '',
      };
      return {
        ...prev,
        costRows: {
          ...prev.costRows,
          [tableId]: [...existing, newRow],
        },
      };
    });
  };

  const deleteRowFromTable = (tableId: string, rowId: string) => {
    setEditableContent(prev => {
      const existing = prev.costRows[tableId] || [];
      return {
        ...prev,
        costRows: {
          ...prev.costRows,
          [tableId]: existing.filter(r => r.id !== rowId),
        },
      };
    });
  };

  // Helper functions for adding/deleting items in non-table cards (Insights, Assumptions, Terms, Q&A)
  const addInsight = () => {
    setEditableContent(prev => ({
      ...prev,
      insights: [...prev.insights, { title: '', description: '' }],
    }));
  };

  const deleteInsight = (index: number) => {
    setEditableContent(prev => ({
      ...prev,
      insights: prev.insights.filter((_, i) => i !== index),
    }));
  };

  const addAssumption = () => {
    setEditableContent(prev => ({
      ...prev,
      assumptions: [...prev.assumptions, ''],
    }));
  };

  const deleteAssumption = (index: number) => {
    setEditableContent(prev => ({
      ...prev,
      assumptions: prev.assumptions.filter((_, i) => i !== index),
    }));
  };

  const addTerm = () => {
    setEditableContent(prev => ({
      ...prev,
      terms: [...prev.terms, { title: '', description: '' }],
    }));
  };

  const deleteTerm = (index: number) => {
    setEditableContent(prev => ({
      ...prev,
      terms: prev.terms.filter((_, i) => i !== index),
    }));
  };

  const addQA = () => {
    setEditableContent(prev => ({
      ...prev,
      qa: [...prev.qa, { question: '', answer: '' }],
    }));
  };

  const deleteQA = (index: number) => {
    setEditableContent(prev => ({
      ...prev,
      qa: prev.qa.filter((_, i) => i !== index),
    }));
  };

  const updateRowData = (tableId: string, rowId: string, field: string, value: string) => {
    setEditableContent(prev => {
      const existing = prev.costRows[tableId] || [];
      return {
        ...prev,
        costRows: {
          ...prev.costRows,
          [tableId]: existing.map(row => 
            row.id === rowId ? { ...row, [field]: value } : row
          ),
        },
      };
    });
  };

  // Helper function to render a complete editable row
  const renderEditableRow = (
    tableId: string,
    row: {
      id: string;
      costLabel: string;
      costValue: string;
      natureOfCosts: string;
      costSensitivity: string;
      confidenceScore: string;
      description: string;
    },
    isSubtotal: boolean = false
  ) => {
    const sensitivityOptions = ['Low', 'Low-Medium', 'Medium', 'High'];
    const confidenceOptions = ['1 - Very Low', '2 - Low', '3 - Medium', '4 - High', '5 - Very High'];
    
    return (
      <tr key={row.id} className={isSubtotal ? "bg-[#2C5F7C] text-white" : "border-b border-gray-100 hover:bg-gray-50"}>
        <td className="px-6 py-4 align-top">
          {isEditMode ? (
            <div className="space-y-2">
              <textarea
                value={row.costLabel}
                onChange={(e) => updateRowData(tableId, row.id, 'costLabel', e.target.value)}
                className="w-full text-sm text-gray-700 italic border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17A2B8] resize-none"
                rows={2}
                placeholder="Cost label"
              />
              <input
                type="text"
                value={row.costValue}
                onChange={(e) => updateRowData(tableId, row.id, 'costValue', e.target.value)}
                className="w-full text-lg text-gray-900 border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                placeholder="Cost value"
              />
            </div>
          ) : (
            <div>
              <div className="text-sm text-gray-700 italic mb-2">{row.costLabel}</div>
              <div className="text-lg text-gray-900">
                {row.costValue.startsWith('Impact:') || row.costValue.includes('%') 
                  ? row.costValue 
                  : `$${row.costValue}`}
              </div>
            </div>
          )}
        </td>
        <td className="px-6 py-4 text-sm align-top">
          {isEditMode ? (
            <input
              type="text"
              value={row.natureOfCosts}
              onChange={(e) => updateRowData(tableId, row.id, 'natureOfCosts', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
              placeholder="Nature of costs"
            />
          ) : (
            <span className={isSubtotal ? "text-white" : "text-gray-700"}>{row.natureOfCosts}</span>
          )}
        </td>
        <td className="px-6 py-4 align-top">
          {isEditMode ? (
            <select
              value={row.costSensitivity}
              onChange={(e) => updateRowData(tableId, row.id, 'costSensitivity', e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
            >
              {sensitivityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <span className={`inline-block px-3 py-1 rounded text-sm ${
              isSubtotal ? 'text-white bg-transparent' :
              row.costSensitivity === 'Low' ? 'bg-green-200' :
              row.costSensitivity === 'Low-Medium' ? 'bg-yellow-100' :
              row.costSensitivity === 'Medium' ? 'bg-orange-200' :
              'bg-red-200'
            } text-gray-900`}>
              {row.costSensitivity}
            </span>
          )}
        </td>
        <td className="px-6 py-4 align-top">
          {isEditMode ? (
            <select
              value={row.confidenceScore}
              onChange={(e) => updateRowData(tableId, row.id, 'confidenceScore', e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
            >
              {confidenceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <span className={`inline-block px-3 py-1 rounded text-sm ${
              isSubtotal ? 'text-white bg-transparent' : 'bg-green-200'
            } text-gray-900`}>
              {row.confidenceScore}
            </span>
          )}
        </td>
        <td className="px-6 py-4 text-sm align-top overflow-hidden">
          {isEditMode ? (
            <textarea
              value={row.description}
              onChange={(e) => updateRowData(tableId, row.id, 'description', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#17A2B8] resize-none"
              rows={2}
              placeholder="Description"
            />
          ) : (
            <span className={`break-words block ${isSubtotal ? 'text-white' : 'text-gray-700'}`}>{row.description}</span>
          )}
        </td>
        {isEditMode && !isSubtotal && (
          <td className="px-6 py-4 align-top">
            <button
              onClick={() => deleteRowFromTable(tableId, row.id)}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              title="Delete row"
              type="button"
            >
              <Trash2 size={18} />
            </button>
          </td>
        )}
      </tr>
    );
  };

  const handleSubmit = () => {
    setShowResults(true);
    // Scroll to results
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleExportPDF = async () => {
    if (!costs) {
      alert('Please generate the analysis first');
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;

      // Load logo image
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = logo;
      
      await new Promise((resolve) => {
        if (logoImg.complete) {
          resolve(null);
        } else {
          logoImg.onload = () => resolve(null);
          logoImg.onerror = () => resolve(null); // Continue even if logo fails to load
        }
      });

      // Cover Page (use default first page, don't add a new one)
      // Logo
      let logoLoaded = false;
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        try {
          const logoWidth = 60;
          const logoHeight = (logoImg.naturalHeight / logoImg.naturalWidth) * logoWidth;
          const logoX = (pageWidth - logoWidth) / 2;
          const logoY = margin + 40;
          pdf.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
          logoLoaded = true;
        } catch (e) {
          console.warn('Could not add logo to PDF:', e);
        }
      }

      // Analysis Name
      pdf.setFontSize(24);
      pdf.setTextColor(23, 162, 184); // #17A2B8
      pdf.setFont('helvetica', 'bold');
      const titleY = logoLoaded ? margin + 120 : margin + 60;
      pdf.text(analysisTitle || 'Cost Analysis Report', pageWidth / 2, titleY, { align: 'center' });

      // Prepared by and Date
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      const preparedBy = user?.email || 'ClearWays AI';
      const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      pdf.text('Prepared by:', pageWidth / 2, titleY + 30, { align: 'center' });
      pdf.text(preparedBy, pageWidth / 2, titleY + 40, { align: 'center' });
      pdf.text(`Date: ${currentDate}`, pageWidth / 2, titleY + 55, { align: 'center' });

      // Second Page - Summary
      pdf.addPage();
      
      // Add header with logo
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        try {
          const logoWidth = 15;
          const logoHeight = (logoImg.naturalHeight / logoImg.naturalWidth) * logoWidth;
          pdf.addImage(logoImg, 'PNG', margin, margin + 2, logoWidth, logoHeight);
        } catch (e) {
          // Ignore logo errors
        }
      }
      
      // Header and footer space
      const headerHeight = 20;
      const footerHeight = 15;
      const maxContentHeight = pageHeight - margin - headerHeight - footerHeight - margin;
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      let yPos = margin + headerHeight + 8;
      pdf.text('Analysis Summary', margin, yPos);
      yPos += 10;

      // Analysis Inputs Summary - compact
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Analysis Inputs', margin, yPos);
      yPos += 6;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const inputs = [
        `Hosting: ${formData.hostingEnvironment}`,
        `Instances: ${formData.numberOfInstances}`,
        `MSTR License: $${Number(formData.mstrLicensingCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        `MSTR Support: $${Number(formData.ancillaryLicensingPercentage || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        `Strategy Services: $${Number(formData.mstrSupportCosts || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      ];
      
      inputs.forEach((text) => {
        if (yPos > pageHeight - margin - footerHeight - 20) return;
        pdf.text(text, margin + 5, yPos);
        yPos += 5;
      });
      yPos += 4;

      // Architecture Cost Calculator Details - compact
      if (yPos < pageHeight - margin - footerHeight - 30) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Architecture Cost Calculator', margin, yPos);
        yPos += 6;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        ARCHITECTURE_SECTIONS.forEach((section) => {
          const sectionTotal = getTotalCostForSection(section);
          if (sectionTotal > 0 && yPos < pageHeight - margin - footerHeight - 15) {
            pdf.setFont('helvetica', 'bold');
            const sectionText = `${section.name}: $${sectionTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            pdf.text(sectionText, margin + 5, yPos);
            yPos += 5;

            // Only show components if there's space
            let componentCount = 0;
            section.components.forEach((component) => {
              if (componentCount >= 2 || yPos > pageHeight - margin - footerHeight - 20) return;
              const selection = componentSelections[component.id];
              if (selection && selection.selectedTier && selection.selectedTier !== '') {
                const componentCost = calculateTotalCost(component.id);
                if (componentCost > 0) {
                  pdf.setFont('helvetica', 'normal');
                  const componentText = `  • ${component.name}: $${componentCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                  pdf.text(componentText, margin + 10, yPos);
                  yPos += 4;
                  componentCount++;
                }
              }
            });
          }
        });

        if (yPos < pageHeight - margin - footerHeight - 15) {
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Total: $${getArchitectureTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + 5, yPos);
          yPos += 8;
        }
      }

      // Strategy and Cloud Support - compact
      if (yPos < pageHeight - margin - footerHeight - 20) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Strategy and Cloud Support', margin, yPos);
        yPos += 6;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        const supportServicesCost = calculateSupportServicesCost();
        const totalSupportCost = supportServicesCost + Number(formData.mstrSupportCosts || 0);
        
        pdf.text(`Strategy Services: $${Number(formData.mstrSupportCosts || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + 5, yPos);
        yPos += 5;
        
        const supportSelection = componentSelections['support-services'];
        if (supportSelection?.selectedTier && yPos < pageHeight - margin - footerHeight - 10) {
          pdf.text(`Support: $${supportServicesCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + 5, yPos);
          yPos += 5;
        }
        
        if (yPos < pageHeight - margin - footerHeight - 10) {
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Total: $${totalSupportCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + 5, yPos);
        }
      }
      
      // Add footer to summary page
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');
      const currentPageNum = pdf.internal.pages.length - 1;
      pdf.text(
        `Page ${currentPageNum} of ${currentPageNum}`, // Will update later
        pageWidth / 2,
        pageHeight - margin + 10,
        { align: 'center' }
      );

      // Capture the results section (from Insights onwards)
      const resultsElement = document.getElementById('results');
      if (!resultsElement) {
        console.error('Results element not found!');
        alert('Results section not found. Please generate the analysis first.');
        return;
      }
      
      console.log('Results element found, starting capture...');
      
      // Hide edit buttons and other UI elements for export
      const originalDisplay = resultsElement.style.display;
      resultsElement.style.display = 'block';
      
      // Hide buttons and edit icons
      const buttons = resultsElement.querySelectorAll('button');
      const editIcons = resultsElement.querySelectorAll('[class*="opacity-0"]');
      buttons.forEach(btn => {
        (btn as HTMLElement).style.display = 'none';
      });
      editIcons.forEach(icon => {
        (icon as HTMLElement).style.display = 'none';
      });

      try {
          // Create a deep clone - keep it in the DOM with stylesheets intact
          const cloneForExport = resultsElement.cloneNode(true) as HTMLElement;
          
          // Create a container to hold the clone - visible but off-screen for html2canvas
          const hiddenContainer = document.createElement('div');
          hiddenContainer.style.position = 'absolute';
          hiddenContainer.style.left = '-99999px';
          hiddenContainer.style.top = '0';
          hiddenContainer.style.width = resultsElement.offsetWidth + 'px';
          hiddenContainer.style.height = 'auto';
          // Keep visible for html2canvas but off-screen
          hiddenContainer.style.visibility = 'visible';
          hiddenContainer.style.opacity = '1';
          hiddenContainer.style.pointerEvents = 'none';
          hiddenContainer.style.zIndex = '-9999';
          hiddenContainer.style.overflow = 'visible';
          document.body.appendChild(hiddenContainer);
          
          cloneForExport.style.position = 'relative';
          cloneForExport.style.width = resultsElement.offsetWidth + 'px';
          cloneForExport.style.height = 'auto';
          cloneForExport.style.visibility = 'visible';
          cloneForExport.style.opacity = '1';
          hiddenContainer.appendChild(cloneForExport);
          
          // Wait for clone to be in DOM so stylesheets apply
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Capture with stylesheets intact - apply computed styles as inline to avoid oklch parsing
          // First, apply all computed styles as inline styles to preserve colors and formatting
          const applyComputedStyles = (original: Element, cloned: Element) => {
            try {
              const computed = window.getComputedStyle(original);
              const clonedEl = cloned as HTMLElement;
              
              // Get all CSS properties from computed style
              const allProps: string[] = [];
              for (let i = 0; i < computed.length; i++) {
                allProps.push(computed[i]);
              }
              
              // Apply all computed style properties as inline styles (already computed to RGB)
              allProps.forEach(prop => {
                try {
                  const value = computed.getPropertyValue(prop);
                  // Special handling for background-related properties - always include gradients
                  const isBackgroundProp = prop === 'background' || prop === 'background-image' || 
                                         prop === 'backgroundImage' || prop === 'background-color' ||
                                         prop === 'backgroundColor';
                  
                  // Skip properties that are empty, 'none', 'normal', 'auto', transparent, or contain oklch
                  // BUT always include background properties (they might contain gradients)
                  if (value && 
                      (isBackgroundProp || (
                        value !== 'none' && 
                        value !== 'normal' && 
                        value !== 'auto' && 
                        value !== 'rgba(0, 0, 0, 0)' &&
                        value !== 'transparent' &&
                        !value.includes('oklch') &&
                        !value.includes('oklab')
                      ))) {
                    // Convert kebab-case to camelCase for style properties
                    const camelProp = prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    clonedEl.style.setProperty(prop, value, 'important');
                  }
                } catch (e) {
                  // Ignore errors for individual properties
                }
              });
              
              // Explicitly ensure critical visual properties are applied
              const criticalProps = {
                boxShadow: computed.boxShadow,
                borderRadius: computed.borderRadius,
                border: computed.border,
                backgroundColor: computed.backgroundColor,
                background: computed.background,
                backgroundImage: computed.backgroundImage,
                backgroundSize: computed.backgroundSize,
                backgroundPosition: computed.backgroundPosition,
                backgroundRepeat: computed.backgroundRepeat,
                backgroundClip: computed.backgroundClip,
                backgroundOrigin: computed.backgroundOrigin,
                backgroundAttachment: computed.backgroundAttachment,
                padding: computed.padding,
                paddingTop: computed.paddingTop,
                paddingRight: computed.paddingRight,
                paddingBottom: computed.paddingBottom,
                paddingLeft: computed.paddingLeft,
                margin: computed.margin,
                marginTop: computed.marginTop,
                marginRight: computed.marginRight,
                marginBottom: computed.marginBottom,
                marginLeft: computed.marginLeft,
                width: computed.width,
                height: computed.height,
                minWidth: computed.minWidth,
                minHeight: computed.minHeight,
                maxWidth: computed.maxWidth,
                maxHeight: computed.maxHeight,
                display: computed.display,
                position: computed.position,
                top: computed.top,
                left: computed.left,
                right: computed.right,
                bottom: computed.bottom,
                zIndex: computed.zIndex,
                opacity: computed.opacity,
                transform: computed.transform,
                transformOrigin: computed.transformOrigin,
                color: computed.color,
                fontSize: computed.fontSize,
                fontWeight: computed.fontWeight,
                fontFamily: computed.fontFamily,
                textAlign: computed.textAlign,
                lineHeight: computed.lineHeight,
                overflow: computed.overflow,
                overflowX: computed.overflowX,
                overflowY: computed.overflowY,
              };
              
              Object.entries(criticalProps).forEach(([prop, value]) => {
                if (value && value !== 'none' && value !== 'normal' && value !== 'auto' && 
                    value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent' &&
                    !value.includes('oklch') && !value.includes('oklab')) {
                  try {
                    // Special handling for gradients - ensure they're preserved
                    if (prop === 'background' || prop === 'backgroundImage') {
                      if (value.includes('gradient') || value.includes('linear-gradient') || value.includes('radial-gradient')) {
                        clonedEl.style.setProperty(prop, value, 'important');
                      } else if (value && value !== 'none' && value !== 'rgba(0, 0, 0, 0)') {
                        clonedEl.style.setProperty(prop, value, 'important');
                      }
                    } else {
                      clonedEl.style.setProperty(prop, value, 'important');
                    }
                  } catch (e) {
                    // Ignore errors
                  }
                }
              });
              
              // Special handling for gradient backgrounds - ensure the gradient is visible
              // Check if element has gradient classes or computed gradient
              const hasGradientInImage = computed.backgroundImage && 
                (computed.backgroundImage.includes('gradient') || 
                 computed.backgroundImage.includes('linear-gradient') ||
                 computed.backgroundImage.includes('radial-gradient'));
              
              const hasGradientInBackground = computed.background && 
                (computed.background.includes('gradient') || 
                 computed.background.includes('linear-gradient') ||
                 computed.background.includes('radial-gradient'));
              
              const hasGradient = hasGradientInImage || hasGradientInBackground;
              
              // Always apply gradient if present, even if other checks might skip it
              if (hasGradient) {
                // Force apply the gradient with all related properties
                if (computed.backgroundImage && hasGradientInImage) {
                  clonedEl.style.setProperty('background-image', computed.backgroundImage, 'important');
                }
                if (computed.background && hasGradientInBackground) {
                  clonedEl.style.setProperty('background', computed.background, 'important');
                }
                // Also apply background even if gradient is only in backgroundImage
                if (hasGradientInImage && computed.background) {
                  clonedEl.style.setProperty('background', computed.background, 'important');
                }
                if (computed.backgroundSize && computed.backgroundSize !== 'auto') {
                  clonedEl.style.setProperty('background-size', computed.backgroundSize, 'important');
                }
                if (computed.backgroundPosition && computed.backgroundPosition !== '0% 0%') {
                  clonedEl.style.setProperty('background-position', computed.backgroundPosition, 'important');
                }
                if (computed.backgroundRepeat && computed.backgroundRepeat !== 'repeat') {
                  clonedEl.style.setProperty('background-repeat', computed.backgroundRepeat, 'important');
                }
                // Ensure background-clip and background-origin are set for proper rendering
                if (computed.backgroundClip) {
                  clonedEl.style.setProperty('background-clip', computed.backgroundClip, 'important');
                }
                if (computed.backgroundOrigin) {
                  clonedEl.style.setProperty('background-origin', computed.backgroundOrigin, 'important');
                }
              }
              
              // Additional check: if element has Tailwind gradient classes, ensure gradient is applied
              // This handles cases where computed style might not show gradient yet
              const originalClasses = (original as HTMLElement).className || '';
              if (originalClasses.includes('bg-gradient-to-r') || 
                  originalClasses.includes('bg-gradient-to-l') ||
                  originalClasses.includes('bg-gradient-to-b') ||
                  originalClasses.includes('bg-gradient-to-t') ||
                  originalClasses.includes('bg-gradient-to-br') ||
                  originalClasses.includes('bg-gradient-to-bl') ||
                  originalClasses.includes('bg-gradient-to-tr') ||
                  originalClasses.includes('bg-gradient-to-tl')) {
                // If we detected gradient classes but no gradient in computed style, 
                // ensure background properties are still applied
                if (!hasGradient && computed.background) {
                  clonedEl.style.setProperty('background', computed.background, 'important');
                }
                if (!hasGradient && computed.backgroundImage) {
                  clonedEl.style.setProperty('background-image', computed.backgroundImage, 'important');
                }
              }
              
              // Recursively process children
              const originalChildren = Array.from(original.children);
              const clonedChildren = Array.from(cloned.children);
              
              for (let i = 0; i < originalChildren.length && i < clonedChildren.length; i++) {
                applyComputedStyles(originalChildren[i], clonedChildren[i]);
              }
            } catch (e) {
              // Ignore errors
            }
          };
          
          applyComputedStyles(resultsElement, cloneForExport);
          
          // Wait for styles to apply and ensure rendering
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Force a reflow to ensure styles are applied
          cloneForExport.offsetHeight;
          
          // Verify clone has content
          const cloneHeight = cloneForExport.scrollHeight || cloneForExport.offsetHeight;
          console.log('Clone dimensions:', cloneForExport.offsetWidth, 'x', cloneHeight);
          
          if (cloneHeight === 0) {
            throw new Error('Clone has no height - content may not be visible');
          }
          
          // Store original stylesheets to restore later
          const originalStylesheets: Array<{ node: Node; parent: Node | null }> = [];
          const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
          const styleTags = document.querySelectorAll('style');
          
          // Remove stylesheets to prevent oklch parsing (inline styles already applied)
          linkTags.forEach((tag) => {
            originalStylesheets.push({ node: tag, parent: tag.parentNode });
            tag.remove();
          });
          styleTags.forEach((tag) => {
            originalStylesheets.push({ node: tag, parent: tag.parentNode });
            tag.remove();
          });
          
          // Wait a bit for stylesheet removal to take effect
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Now capture - only inline styles available (already in RGB format)
          console.log('Starting html2canvas capture...');
          const canvas = await html2canvas(cloneForExport, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            foreignObjectRendering: false,
            allowTaint: true,
            removeContainer: false,
            ignoreElements: (element) => {
              // Ignore buttons and edit icons
              return element.tagName === 'BUTTON' || 
                     (element as HTMLElement).classList?.toString().includes('opacity-0');
            },
          });
          
          // Restore stylesheets immediately after capture
          originalStylesheets.forEach(({ node, parent }) => {
            if (parent) {
              parent.appendChild(node);
            }
          });
          
          console.log('Canvas created. Dimensions:', canvas.width, 'x', canvas.height);
          
          if (canvas.width === 0 || canvas.height === 0) {
            throw new Error('Canvas has zero dimensions - capture failed');
          }
          
          // Clean up clone and container
          if (hiddenContainer.parentNode) {
            document.body.removeChild(hiddenContainer);
          }
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - (margin * 2);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          // Header and footer dimensions
          const headerHeight = 20;
          const footerHeight = 15;
          const contentHeight = pageHeight - margin - headerHeight - footerHeight - margin;

          // Split image into pages
          let sourceY = 0;
          let pageAdded = false;

          console.log('Starting page split. Canvas height:', canvas.height, 'Image height:', imgHeight, 'Content height:', contentHeight);

          while (sourceY < canvas.height) {
            // Always add a new page for results section (first page is for summary)
            if (!pageAdded || sourceY > 0) {
              pdf.addPage();
              pageAdded = true;
              
              // Add header with logo
              if (logoImg.complete && logoImg.naturalWidth > 0) {
                try {
                  const logoWidth = 15;
                  const logoHeight = (logoImg.naturalHeight / logoImg.naturalWidth) * logoWidth;
                  pdf.addImage(logoImg, 'PNG', margin, margin + 2, logoWidth, logoHeight);
                } catch (e) {
                  // Ignore logo errors
                }
              }
            }

            // Calculate how much of the image fits on this page
            const pageStartY = margin + headerHeight;
            const availableHeight = contentHeight;
            const sourceHeight = Math.min(
              (availableHeight / imgHeight) * canvas.height,
              canvas.height - sourceY
            );
            const displayHeight = (sourceHeight / canvas.height) * imgHeight;

            console.log(`Page ${pdf.internal.pages.length - 1}: sourceY=${sourceY}, sourceHeight=${sourceHeight}, displayHeight=${displayHeight}`);

            // Create a temporary canvas for this page chunk
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = sourceHeight;
            const pageCtx = pageCanvas.getContext('2d');
            if (pageCtx) {
              pageCtx.drawImage(
                canvas,
                0, sourceY, canvas.width, sourceHeight,
                0, 0, canvas.width, sourceHeight
              );
              const pageImgData = pageCanvas.toDataURL('image/png');
              pdf.addImage(pageImgData, 'PNG', margin, pageStartY, imgWidth, displayHeight);
            }

            // Add footer with page number
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.setFont('helvetica', 'normal');
            const currentPage = pdf.internal.pages.length - 1;
            pdf.text(
              `Page ${currentPage} of ${currentPage}`, // Will update total later
              pageWidth / 2,
              pageHeight - margin + 10,
              { align: 'center' }
            );

            sourceY += sourceHeight;
            
            // Safety check to prevent infinite loop
            if (sourceHeight <= 0) {
              console.error('sourceHeight is 0 or negative, breaking loop');
              break;
            }
          }
          
          console.log('Finished page split. Total pages:', pdf.internal.pages.length - 1);
        } catch (error) {
          console.error('Error capturing results:', error);
          alert(`Failed to capture results section: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          // Restore original display
          resultsElement.style.display = originalDisplay;
          buttons.forEach(btn => {
            (btn as HTMLElement).style.removeProperty('display');
          });
          editIcons.forEach(icon => {
            (icon as HTMLElement).style.removeProperty('display');
          });
        }

      // Update all page numbers in footers with correct total
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        
        // Skip cover page (page 1) - no header/footer
        if (i === 1) {
          continue;
        }
        
        // Update footer with correct total page count
        // Draw a white rectangle to clear the footer area first
        pdf.setDrawColor(255, 255, 255);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, pageHeight - margin - 5, pageWidth, 15, 'F');
        
        // Add footer text
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.setFont('helvetica', 'normal');
        pdf.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - margin + 10,
          { align: 'center' }
        );
      }

      // Save the PDF
      const fileName = `${(analysisTitle || 'Cost Analysis Report').replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Export PDF error:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!costs) {
      alert('Please generate the analysis first');
      return;
    }

    setIsSaving(true);
    try {
      // Treat "new" as undefined - need to create a new analysis
      let analysisId = (id && id !== 'new') ? id : undefined;

      // If new analysis, create it first
      if (!analysisId) {
        const createResponse = await fetch(`${API_BASE_URL}/analysis`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create analysis');
        }

        const createData = await createResponse.json();
        analysisId = createData.analysis.id;
      }

      // Prepare inputs data
      const inputsData = {
        mstr_license_per_instance: Number(formData.mstrLicensingCost || 0),
        ancillary_license_pct: Number(formData.ancillaryLicensingPercentage || 0),
        instance_count: Number(formData.numberOfInstances || 0),
        hosting_environment: formData.hostingEnvironment,
        tier_selections: componentSelections,
        storage_gb: 0, // These are now calculated from component selections
        egress_gb: 0,
        compute_gb: 0,
        infrastructure_gb: 0,
        cloud_personnel_cost: 0,
        mstr_support_cost: Number(formData.mstrSupportCosts || 0),
      };

      // Update inputs (this will also recompute results)
      const updateResponse = await fetch(`${API_BASE_URL}/analysis/${analysisId}/inputs`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(inputsData),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update analysis inputs');
      }

      // Save the analysis (LIVE -> SAVED) with editable content for versioning
      const saveResponse = await fetch(`${API_BASE_URL}/analysis/${analysisId}/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: analysisTitle || 'Untitled Analysis',
          editable_content: editableContent,
        }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to save analysis');
      }

      const saveData = await saveResponse.json();
      alert(`Analysis saved successfully! Version ${saveData.version || 'N/A'} created.`);
      
      // Redirect to dashboard or update URL
      if (!id) {
        window.location.href = `/analysis/${analysisId}`;
      } else {
        // Reload the page to show the updated version
        window.location.reload();
      }
    } catch (error) {
      console.error('Save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save analysis. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingAnalysis) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-gray-600">Loading analysis...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-gray-900 mb-2">
                {isNewAnalysis ? 'Create New Analysis' : 'Edit Analysis'}
              </h1>
              <p className="text-gray-600">
                Enter your MSTR deployment details for cost analysis
              </p>
            </div>
            {!isNewAnalysis && versions.length > 0 && (
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="version-select" className="text-sm text-gray-600">
                    Version:
                  </label>
                  <select
                    id="version-select"
                    value={selectedVersion || ''}
                    onChange={(e) => {
                      const version = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedVersion(version);
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                  >
                    {versions.map((v) => (
                      <option key={v.version_number} value={v.version_number}>
                        v{v.version_number} - {new Date(v.created_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedVersion && (() => {
                  const selectedVersionData = versions.find(v => v.version_number === selectedVersion);
                  if (selectedVersionData) {
                    return (
                      <div className="text-xs text-gray-500 text-right">
                        <div>Created: {new Date(selectedVersionData.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</div>
                        <div>By: {selectedVersionData.created_by_email}</div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
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

        {/* Analysis Inputs Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-gray-900 mb-6">Analysis Inputs</h2>

          <form onSubmit={handleSubmit}>
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

            {/* MSTR Support Costs (Annual) */}
            <div>
              <label htmlFor="ancillaryLicensingPercentage" className="block text-gray-700 mb-2">
                MSTR Support Costs (Annual) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  id="ancillaryLicensingPercentage"
                  name="ancillaryLicensingPercentage"
                  value={formData.ancillaryLicensingPercentage}
                  onChange={handleInputChange}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
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

            </div>
          </form>
        </div>

        {/* Architecture Cost Calculator Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-gray-900">Architecture Cost Calculator</h3>
              <div className="text-right">
                <div className="text-sm text-gray-600">Total Architecture Cost</div>
                <div className="text-xl font-bold text-[#17A2B8]">
                  ${getArchitectureTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {loadingPricing ? (
              <div className="text-center py-8 text-gray-500">Loading pricing data...</div>
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {ARCHITECTURE_SECTIONS.map((section) => {
                  const sectionTotal = getTotalCostForSection(section);
                  return (
                    <AccordionItem
                      key={section.id}
                      value={section.id}
                      className="border border-gray-200 rounded-lg bg-white"
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
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  {section.components.some(c => c.id === 'storage')
                                    ? 'Total Data (GB) / Instances'
                                    : section.components.some(c => c.id === 'data-egress')
                                    ? 'Total Data (GB)'
                                    : 'Instances'}
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {section.components.map((component) => {
                                // Default to blank for:
                                // 1. Components with only one tier option
                                // 2. Compute (GKE) - always default to blank
                                // 3. Memory (RAM) - always default to blank
                                // 4. Cloud Storage - always default to blank
                                // 5. Database - always default to blank
                                // 6. Data Egress - always default to blank
                                const shouldDefaultToBlank = 
                                  component.tierOptions.length === 1 ||
                                  component.id === 'compute-gke' ||
                                  component.id === 'memory-ram' ||
                                  component.id === 'storage' ||
                                  component.id === 'database' ||
                                  component.id === 'data-egress';
                                
                                const defaultTier = shouldDefaultToBlank ? '' : (component.tierOptions[0] || '');
                                const requiresDataGB = component.id === 'storage' || component.id === 'data-egress';
                                const selection = componentSelections[component.id] || {
                                  componentId: component.id,
                                  selectedTier: defaultTier,
                                  instances: 0,
                                  totalDataGB: requiresDataGB ? 0 : undefined,
                                };
                                const totalCost = calculateTotalCost(component.id);
                                
                                // Map display tier names to pricing lookup keys
                                const tierMapping: Record<string, string> = {
                                  'GKE Cluster Management': 'Cluster Management',
                                  'vCPU': 'vCPU',
                                  'vCPU (with 3-yr CUD)': 'vCPU (with 3-yr CUD)',
                                  'Memory (RAM)': 'Memory (RAM)',
                                  'Memory (with 3-yr CUD)': 'Memory (with 3-yr CUD)',
                                };
                                const pricingKey = tierMapping[selection.selectedTier] || selection.selectedTier;
                                const selectedPricing = selection.selectedTier ? pricingData[pricingKey] : null;

                                return (
                                  <tr key={component.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{component.name}</td>
                                    <td className="px-4 py-2">
                                      <select
                                        value={selection.selectedTier}
                                        onChange={(e) => updateComponentSelection(component.id, 'selectedTier', e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                                      >
                                        {/* Show blank option if:
                                            1. Only one tier option
                                            2. Compute (GKE)
                                            3. Memory (RAM)
                                            4. Cloud Storage
                                            5. Database
                                            6. Data Egress */}
                                        {(component.tierOptions.length === 1 || 
                                          component.id === 'compute-gke' || 
                                          component.id === 'memory-ram' || 
                                          component.id === 'storage' ||
                                          component.id === 'database' ||
                                          component.id === 'data-egress') && (
                                          <option value="">-- Select --</option>
                                        )}
                                        {component.tierOptions.map((tier) => (
                                          <option key={tier} value={tier}>{tier}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-4 py-2">
                                      {component.id === 'storage' ? (
                                        <div className="space-y-2">
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={selection.totalDataGB || ''}
                                            onChange={(e) => {
                                              const value = parseFloat(e.target.value) || 0;
                                              updateComponentSelection(component.id, 'totalDataGB', value);
                                            }}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                                            placeholder="Total Data (GB)"
                                          />
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={selection.instances || ''}
                                            onChange={(e) => {
                                              const value = parseFloat(e.target.value) || 0;
                                              updateComponentSelection(component.id, 'instances', value);
                                            }}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                                            placeholder="Instances"
                                          />
                                        </div>
                                      ) : requiresDataGB ? (
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={selection.totalDataGB || ''}
                                          onChange={(e) => {
                                            const value = parseFloat(e.target.value) || 0;
                                            updateComponentSelection(component.id, 'totalDataGB', value);
                                          }}
                                          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                                          placeholder="Total Data (GB)"
                                        />
                                      ) : (
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
                                      )}
                                    </td>
                                    <td className="px-4 py-2">
                                      <div className="text-sm font-semibold text-gray-900">
                                        ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </div>
                                      {selectedPricing && selectedPricing.unit_price > 0 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          {component.id === 'storage' && selection.totalDataGB ? (
                                            <>
                                              ${selectedPricing.unit_price.toFixed(3)} × {selection.totalDataGB} GB × {selection.instances || 1} × {selectedPricing.annual_multiplier}
                                            </>
                                          ) : requiresDataGB && selection.totalDataGB ? (
                                            <>
                                              ${selectedPricing.unit_price.toFixed(3)} × {selection.totalDataGB} GB × {selectedPricing.annual_multiplier}
                                            </>
                                          ) : (
                                            <>
                                              ${selectedPricing.unit_price.toFixed(3)} × {selection.instances} × {selectedPricing.annual_multiplier}
                                            </>
                                          )}
                                        </div>
                                      )}
                                      {!selectedPricing && selection.selectedTier && (
                                        <div className="text-xs text-red-500 mt-1">
                                          Pricing not found for "{selection.selectedTier}"
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
            )}
        </div>

        {/* Strategy and Cloud Support Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-gray-900">Strategy and Cloud Support</h3>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Total Support Cost</div>
                  <div className="text-xl font-bold text-[#17A2B8]">
                    ${(calculateSupportServicesCost() + Number(formData.mstrSupportCosts || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Strategy Professional Services Input */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <label htmlFor="mstrSupportCosts" className="block text-gray-700 mb-2">
                  Strategy Professional Services *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    id="mstrSupportCosts"
                    name="mstrSupportCosts"
                    value={formData.mstrSupportCosts}
                    onChange={handleInputChange}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17A2B8] focus:border-transparent"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              {loadingPricing ? (
                <div className="text-center py-8 text-gray-500">Loading pricing data...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service Component</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Calculation</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">Support & Services</td>
                        <td className="px-4 py-2">
                          <select
                            value={componentSelections['support-services']?.selectedTier || ''}
                            onChange={(e) => updateComponentSelection('support-services', 'selectedTier', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                          >
                            <option value="">-- Select --</option>
                            <option value="GCP Premium Support (Spend $0–$10K/month)">GCP Premium Support (Spend $0–$10K/month)</option>
                            <option value="GCP Premium Support (Spend >$10K/month)">GCP Premium Support (Spend &gt;$10K/month)</option>
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-sm text-gray-500 italic">
                            Calculated as % of Total Architecture Cost
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-sm font-semibold text-gray-900">
                            ${calculateSupportServicesCost().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          {componentSelections['support-services']?.selectedTier && (() => {
                            const tierMapping: Record<string, string> = {
                              'GCP Premium Support (Spend $0–$10K/month)': 'Premium Support (Spend $0-$10K/month)',
                              'GCP Premium Support (Spend >$10K/month)': 'Premium Support (Spend >$10K/month)',
                            };
                            const pricingKey = tierMapping[componentSelections['support-services']!.selectedTier] || componentSelections['support-services']!.selectedTier;
                            const selectedPricing = pricingData[pricingKey];
                            const totalArchitectureCost = getArchitectureTotal();
                            return selectedPricing && selectedPricing.unit_price > 0 ? (
                              <div className="text-xs text-gray-500 mt-1">
                                {selectedPricing.unit_price.toFixed(2)}% × ${totalArchitectureCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            ) : null;
                          })()}
                          {componentSelections['support-services']?.selectedTier && (() => {
                            const tierMapping: Record<string, string> = {
                              'GCP Premium Support (Spend $0–$10K/month)': 'Premium Support (Spend $0-$10K/month)',
                              'GCP Premium Support (Spend >$10K/month)': 'Premium Support (Spend >$10K/month)',
                            };
                            const pricingKey = tierMapping[componentSelections['support-services']!.selectedTier] || componentSelections['support-services']!.selectedTier;
                            const selectedPricing = pricingData[pricingKey];
                            return !selectedPricing ? (
                              <div className="text-xs text-red-500 mt-1">
                                Pricing not found for "{componentSelections['support-services']!.selectedTier}"
                              </div>
                            ) : null;
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
        </div>

        {/* Submit Button */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-2 bg-[#17A2B8] text-white px-8 py-3 rounded-lg hover:bg-[#138C9E] transition-colors shadow-sm"
            >
              <Calculator size={20} />
              Generate Analysis
            </button>
            {showResults && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                {isSaving ? 'Saving...' : 'Save Analysis'}
              </button>
            )}
          </div>
        </div>

        {/* Results Section */}
        {showResults && costs && (
          <div id="results" className="space-y-8">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-gray-900">Cost Analysis Report</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isEditMode
                        ? 'bg-[#17A2B8] text-white hover:bg-[#138C9E]'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {isEditMode ? <X size={18} /> : <Edit2 size={18} />}
                    {isEditMode ? 'Exit Edit' : 'Edit Report'}
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 text-[#17A2B8] hover:text-[#138C9E] transition-colors"
                  >
                    <Download size={20} />
                    Export Report
                  </button>
                </div>
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
                </div>
              </div>
            </div>

            {/* 1. Insights */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4 rounded-t-lg -mx-6 -mt-6 mb-6">
                <div className="flex items-center justify-between">
                  <h3>1. Insights</h3>
                  {isEditMode && (
                    <button
                      onClick={addInsight}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-purple-600 rounded-md hover:bg-gray-100 transition-colors text-sm"
                      type="button"
                    >
                      <Plus size={16} />
                      Add Insight
                    </button>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                {editableContent.insights.map((insight, index) => {
                  const itemKey = `insight-${index}`;
                  const isEditing = isEditMode && editingItems[itemKey];
                  return (
                    <div key={index} className="flex gap-4 group">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center">{index + 1}</div>
                      <div className="flex-1 relative">
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              value={insight.title}
                              onChange={(e) => {
                                const newInsights = [...editableContent.insights];
                                newInsights[index] = { ...newInsights[index], title: e.target.value };
                                setEditableContent({ ...editableContent, insights: newInsights });
                              }}
                              className="w-full text-gray-900 mb-1 border border-gray-300 rounded-md px-3 py-1 pr-10 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                              placeholder="Insight Title"
                              autoFocus
                            />
                            <textarea
                              value={insight.description}
                              onChange={(e) => {
                                const newInsights = [...editableContent.insights];
                                newInsights[index] = { ...newInsights[index], description: e.target.value };
                                setEditableContent({ ...editableContent, insights: newInsights });
                              }}
                              className="w-full text-sm text-gray-600 border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                              rows={3}
                              placeholder="Insight Description"
                            />
                          </>
                        ) : (
                          <>
                            <div className="text-gray-900 mb-1 pr-8">{insight.title}</div>
                            <p className="text-sm text-gray-600 pr-8">{insight.description}</p>
                          </>
                        )}
                        {isEditMode && (
                          <div className="absolute top-0 right-0 flex gap-1">
                            <button
                              onClick={() => {
                                if (isEditing) {
                                  setEditingItems({ ...editingItems, [itemKey]: false });
                                } else {
                                  setEditingItems({ ...editingItems, [itemKey]: true });
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-[#17A2B8] transition-colors opacity-0 group-hover:opacity-100"
                              title={isEditing ? "Save" : "Edit"}
                            >
                              {isEditing ? <Check size={16} /> : <Edit2 size={16} />}
                            </button>
                            <button
                              onClick={() => deleteInsight(index)}
                              className="p-1 text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete"
                              type="button"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Negotiated Annual Licensing Costs (Static) */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#2C5F7C] text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3>2. Negotiated Annual Licensing Costs (Static)</h3>
                    <p className="text-sm opacity-90 mt-1 italic">
                      Fixed, contractually committed software costs that do not change with usage once licensing terms are set.
                    </p>
                  </div>
                  {isEditMode && (
                    <button
                      onClick={() => addRowToTable('negotiated-licensing')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#2C5F7C] rounded-md hover:bg-gray-100 transition-colors text-sm"
                      type="button"
                    >
                      <Plus size={16} />
                      Add Row
                    </button>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[30%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[25%]" />
                    {isEditMode && <col className="w-[5%]" />}
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Nature of Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Cost Sensitivity</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Confidence Score</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Description</th>
                      {isEditMode && <th className="px-6 py-3 text-left text-sm text-gray-700"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {getTableRows('negotiated-licensing').map((row, index) => 
                      renderEditableRow('negotiated-licensing', row, false)
                    )}
                    <tr className="bg-[#2C5F7C] text-white">
                      <td className="px-6 py-4 text-sm" colSpan={isEditMode ? 6 : 5}>
                        <div className="flex justify-between items-center">
                          <span>Subtotal - Licensing Costs</span>
                          <span className="text-lg">${formatCostValue(costs.currentState.mstrLicensing + costs.currentState.ancillaryLicensing)}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Metered Costs (Running Costs) */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#2C5F7C] text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3>3. Metered Costs (Running Costs)</h3>
                    <p className="text-sm opacity-90 mt-1 italic">
                      Variable, consumption-based infrastructure costs that scale with workload, data volume, and architecture decisions.
                    </p>
                  </div>
                  {isEditMode && (
                    <button
                      onClick={() => addRowToTable('metered-costs')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#2C5F7C] rounded-md hover:bg-gray-100 transition-colors text-sm"
                      type="button"
                    >
                      <Plus size={16} />
                      Add Row
                    </button>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[30%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[25%]" />
                    {isEditMode && <col className="w-[5%]" />}
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Nature of Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Cost Sensitivity</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Confidence Score</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Description</th>
                      {isEditMode && <th className="px-6 py-3 text-left text-sm text-gray-700"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {getTableRows('metered-costs').map((row, index) => 
                      renderEditableRow('metered-costs', row, false)
                    )}
                    <tr className="bg-[#2C5F7C] text-white">
                      <td className="px-6 py-4 text-sm" colSpan={isEditMode ? 6 : 5}>
                        <div className="flex justify-between items-center">
                          <span>Subtotal - Metered Costs</span>
                          <span className="text-lg">${formatCostValue(costs.currentState.totalCloudInfra)}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Support Costs */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#2C5F7C] text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3>4. Support Costs (Blended - Type & Level of Support Personnel)</h3>
                    <p className="text-sm opacity-90 mt-1 italic">
                      Ongoing human and vendor effort required to operate, support, and sustain the platform.
                    </p>
                  </div>
                  {isEditMode && (
                    <button
                      onClick={() => addRowToTable('support-costs')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#2C5F7C] rounded-md hover:bg-gray-100 transition-colors text-sm"
                      type="button"
                    >
                      <Plus size={16} />
                      Add Row
                    </button>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[30%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[25%]" />
                    {isEditMode && <col className="w-[5%]" />}
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Nature of Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Cost Sensitivity</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Confidence Score</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Description</th>
                      {isEditMode && <th className="px-6 py-3 text-left text-sm text-gray-700"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {getTableRows('support-costs').map((row, index) => 
                      renderEditableRow('support-costs', row, false)
                    )}
                    <tr className="bg-[#2C5F7C] text-white">
                      <td className="px-6 py-4 text-sm" colSpan={isEditMode ? 6 : 5}>
                        <div className="flex justify-between items-center">
                          <span>Subtotal - Support Costs</span>
                          <span className="text-lg">${formatCostValue(costs.currentState.cloudPersonnel + costs.currentState.mstrSupport)}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Total Costs */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#17A2B8] to-[#2C5F7C] text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3>5. Total Costs</h3>
                    <p className="text-sm opacity-90 mt-1 italic">
                      This is the all-in cost view required for budget approval and comparison against alternatives.
                    </p>
                  </div>
                  {isEditMode && (
                    <button
                      onClick={() => addRowToTable('total-costs')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#17A2B8] rounded-md hover:bg-gray-100 transition-colors text-sm"
                      type="button"
                    >
                      <Plus size={16} />
                      Add Row
                    </button>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[30%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[25%]" />
                    {isEditMode && <col className="w-[5%]" />}
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Nature of Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Cost Sensitivity</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Confidence Score</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Description</th>
                      {isEditMode && <th className="px-6 py-3 text-left text-sm text-gray-700"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {getTableRows('total-costs').map((row, index) => 
                      renderEditableRow('total-costs', row, false)
                    )}
                    <tr className="bg-gradient-to-r from-[#17A2B8] to-[#2C5F7C] text-white">
                      <td className="px-6 py-4 text-sm" colSpan={isEditMode ? 6 : 5}>
                        <div className="flex justify-between items-center text-lg">
                          <div>
                            <div>Total Annual Cost</div>
                          </div>
                          <div className="text-right">
                            <div>${formatCostValue(costs.currentState.total)}</div>
                            <div className="text-sm opacity-90 mt-1">Projection</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6. Architecture Choice Costs */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#5A6C7D] text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3>6. Architecture Choice Costs (Opportunity Costs)</h3>
                    <p className="text-sm opacity-90 mt-1 italic">
                      Costs driven by design decisions rather than vendor pricing—these are controllable but often underestimated.
                    </p>
                  </div>
                  {isEditMode && (
                    <button
                      onClick={() => addRowToTable('architecture-choice-costs')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#5A6C7D] rounded-md hover:bg-gray-100 transition-colors text-sm"
                      type="button"
                    >
                      <Plus size={16} />
                      Add Row
                    </button>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[30%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[25%]" />
                    {isEditMode && <col className="w-[5%]" />}
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Nature of Costs</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Cost Sensitivity</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Confidence Score</th>
                      <th className="px-6 py-3 text-left text-sm text-gray-700">Description</th>
                      {isEditMode && <th className="px-6 py-3 text-left text-sm text-gray-700"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {getTableRows('architecture-choice-costs').map((row, index) => 
                      renderEditableRow('architecture-choice-costs', row, false)
                    )}
                  </tbody>
                </table>
                
                <div className="p-6 bg-yellow-50 border-t border-yellow-200 relative group">
                  {isEditMode && editingItems['architecture-impact'] ? (
                    <textarea
                      value={editableContent.architectureImpact}
                      onChange={(e) => setEditableContent({ ...editableContent, architectureImpact: e.target.value })}
                      className="w-full text-sm text-gray-700 border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                      rows={3}
                      placeholder="Combined Impact description"
                      autoFocus
                    />
                  ) : (
                    <p className="text-sm text-gray-700 pr-8">
                      <strong>Combined Impact:</strong> {editableContent.architectureImpact || 'Architecture optimization typically reduces total infrastructure costs by 20-40% through better design decisions, resource allocation, and capacity planning. These savings compound with infrastructure optimization for maximum TCO reduction.'}
                    </p>
                  )}
                  {isEditMode && (
                    <button
                      onClick={() => {
                        const itemKey = 'architecture-impact';
                        if (editingItems[itemKey]) {
                          setEditingItems({ ...editingItems, [itemKey]: false });
                        } else {
                          setEditingItems({ ...editingItems, [itemKey]: true });
                        }
                      }}
                      className="absolute top-6 right-6 p-1 text-gray-400 hover:text-[#17A2B8] transition-colors opacity-0 group-hover:opacity-100"
                      title={editingItems['architecture-impact'] ? "Save" : "Edit"}
                    >
                      {editingItems['architecture-impact'] ? <Check size={16} /> : <Edit2 size={16} />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 7. Assumptions */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#F59E0B] text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3>7. Assumptions</h3>
                    <p className="text-sm opacity-90 mt-1">
                      Explicit assumptions prevent misalignment later when costs vary from estimates.
                    </p>
                  </div>
                  {isEditMode && (
                    <button
                      onClick={addAssumption}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#F59E0B] rounded-md hover:bg-gray-100 transition-colors text-sm"
                      type="button"
                    >
                      <Plus size={16} />
                      Add Assumption
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-3">
                  {editableContent.assumptions.map((assumption, index) => {
                    const itemKey = `assumption-${index}`;
                    const isEditing = isEditMode && editingItems[itemKey];
                    return (
                      <div key={index} className="flex gap-3 group">
                        <div className="flex-shrink-0 w-2 h-2 bg-[#F59E0B] rounded-full mt-2"></div>
                        <div className="flex-1 relative">
                          {isEditing ? (
                            <textarea
                              value={assumption}
                              onChange={(e) => {
                                const newAssumptions = [...editableContent.assumptions];
                                newAssumptions[index] = e.target.value;
                                setEditableContent({ ...editableContent, assumptions: newAssumptions });
                              }}
                              className="w-full text-sm text-gray-700 border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                              rows={2}
                              autoFocus
                            />
                          ) : (
                            <p className="text-sm text-gray-700 pr-8">{assumption}</p>
                          )}
                          {isEditMode && (
                            <div className="absolute top-0 right-0 flex gap-1">
                              <button
                                onClick={() => {
                                  if (isEditing) {
                                    setEditingItems({ ...editingItems, [itemKey]: false });
                                  } else {
                                    setEditingItems({ ...editingItems, [itemKey]: true });
                                  }
                                }}
                                className="p-1 text-gray-400 hover:text-[#17A2B8] transition-colors opacity-0 group-hover:opacity-100"
                                title={isEditing ? "Save" : "Edit"}
                              >
                                {isEditing ? <Check size={16} /> : <Edit2 size={16} />}
                              </button>
                              <button
                                onClick={() => deleteAssumption(index)}
                                className="p-1 text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete"
                                type="button"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 8. Questions & Answers */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3>8. Questions & Answers</h3>
                  {isEditMode && (
                    <button
                      onClick={addQA}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-green-600 rounded-md hover:bg-gray-100 transition-colors text-sm"
                      type="button"
                    >
                      <Plus size={16} />
                      Add Q&A
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-6">
                  {editableContent.qa.map((item, index) => {
                    const itemKey = `qa-${index}`;
                    const isEditing = isEditMode && editingItems[itemKey];
                    return (
                      <div key={index} className="border-l-4 border-green-500 pl-4 relative group">
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              value={item.question}
                              onChange={(e) => {
                                const newQA = [...editableContent.qa];
                                newQA[index] = { ...newQA[index], question: e.target.value };
                                setEditableContent({ ...editableContent, qa: newQA });
                              }}
                              className="w-full text-gray-900 mb-2 font-semibold border border-gray-300 rounded-md px-3 py-1 pr-10 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                              placeholder="Question"
                              autoFocus
                            />
                            <textarea
                              value={item.answer}
                              onChange={(e) => {
                                const newQA = [...editableContent.qa];
                                newQA[index] = { ...newQA[index], answer: e.target.value };
                                setEditableContent({ ...editableContent, qa: newQA });
                              }}
                              className="w-full text-sm text-gray-600 border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                              rows={3}
                              placeholder="Answer"
                            />
                          </>
                        ) : (
                          <>
                            <h4 className="text-gray-900 mb-2 pr-8">Q: {item.question}</h4>
                            <p className="text-sm text-gray-600 pr-8">
                              <strong>A:</strong> {item.answer}
                            </p>
                          </>
                        )}
                        {isEditMode && (
                          <div className="absolute top-0 right-0 flex gap-1">
                            <button
                              onClick={() => {
                                if (isEditing) {
                                  setEditingItems({ ...editingItems, [itemKey]: false });
                                } else {
                                  setEditingItems({ ...editingItems, [itemKey]: true });
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-[#17A2B8] transition-colors opacity-0 group-hover:opacity-100"
                              title={isEditing ? "Save" : "Edit"}
                            >
                              {isEditing ? <Check size={16} /> : <Edit2 size={16} />}
                            </button>
                            <button
                              onClick={() => deleteQA(index)}
                              className="p-1 text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete"
                              type="button"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 9. Terms */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-700 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3>9. Terms</h3>
                  {isEditMode && (
                    <button
                      onClick={addTerm}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-gray-700 rounded-md hover:bg-gray-100 transition-colors text-sm"
                      type="button"
                    >
                      <Plus size={16} />
                      Add Term
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {editableContent.terms.map((term, index) => {
                    const itemKey = `term-${index}`;
                    const isEditing = isEditMode && editingItems[itemKey];
                    return (
                      <div key={index} className="relative group">
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              value={term.title}
                              onChange={(e) => {
                                const newTerms = [...editableContent.terms];
                                newTerms[index] = { ...newTerms[index], title: e.target.value };
                                setEditableContent({ ...editableContent, terms: newTerms });
                              }}
                              className="w-full text-gray-900 mb-2 font-semibold border border-gray-300 rounded-md px-3 py-1 pr-10 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                              placeholder="Term Title"
                              autoFocus
                            />
                            <textarea
                              value={term.description}
                              onChange={(e) => {
                                const newTerms = [...editableContent.terms];
                                newTerms[index] = { ...newTerms[index], description: e.target.value };
                                setEditableContent({ ...editableContent, terms: newTerms });
                              }}
                              className="w-full text-sm text-gray-600 border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#17A2B8]"
                              rows={3}
                              placeholder="Term Description"
                            />
                          </>
                        ) : (
                          <>
                            <h4 className="text-gray-900 mb-2 pr-8">{term.title}</h4>
                            <p className="text-sm text-gray-600 pr-8">{term.description}</p>
                          </>
                        )}
                        {isEditMode && (
                          <div className="absolute top-0 right-0 flex gap-1">
                            <button
                              onClick={() => {
                                if (isEditing) {
                                  setEditingItems({ ...editingItems, [itemKey]: false });
                                } else {
                                  setEditingItems({ ...editingItems, [itemKey]: true });
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-[#17A2B8] transition-colors opacity-0 group-hover:opacity-100"
                              title={isEditing ? "Save" : "Edit"}
                            >
                              {isEditing ? <Check size={16} /> : <Edit2 size={16} />}
                            </button>
                            <button
                              onClick={() => deleteTerm(index)}
                              className="p-1 text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete"
                              type="button"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                  disabled={isSaving}
                  className="bg-white text-[#17A2B8] px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={20} />
                  {isSaving ? 'Saving...' : 'Save This Analysis'}
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
