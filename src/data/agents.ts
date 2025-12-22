// Agent marketplace data
export interface Agent {
  id: string;
  name: string;
  outcome: string;
  costRange: string;
  confidenceRange: string;
  rating?: number;
  domain: string;
  useCase: string;
  description: string[];
  sources: string[];
  setupCost: number;
  usageCost: {
    type: 'per-task' | 'per-record' | 'per-minute';
    amount: number;
  };
  confidenceScore: number;
  confidenceExplanation: string;
}

export const agents: Agent[] = [
  {
    id: 'az-roc-emails',
    name: 'AZ ROC Email Finder',
    outcome: 'Find verified email IDs for AZ ROC contractors',
    costRange: '$0.10 - $0.25',
    confidenceRange: '85% - 95%',
    rating: 4.8,
    domain: 'Construction',
    useCase: 'Lead Gen',
    description: [
      'Retrieves verified business email addresses for licensed contractors',
      'Cross-references ROC database with public contact records',
      'Returns primary contact email with verification timestamp'
    ],
    sources: ['AZ ROC Database', 'LinkedIn', 'Company Websites', 'Business Registries'],
    setupCost: 0,
    usageCost: {
      type: 'per-record',
      amount: 0.15
    },
    confidenceScore: 90,
    confidenceExplanation: 'Email addresses are verified through multiple sources. Confidence drops if only one source confirms.'
  },
  {
    id: 'property-comps',
    name: 'Property Comp Analyzer',
    outcome: 'Generate comparable property analysis for real estate listings',
    costRange: '$2.50 - $5.00',
    confidenceRange: '80% - 92%',
    rating: 4.6,
    domain: 'Real Estate',
    useCase: 'Research',
    description: [
      'Pulls recent sales within specified radius and criteria',
      'Analyzes property features, sale prices, and market trends',
      'Generates comparison report with price per sq ft metrics'
    ],
    sources: ['MLS Data', 'Zillow', 'Public Records', 'Redfin'],
    setupCost: 25,
    usageCost: {
      type: 'per-task',
      amount: 3.75
    },
    confidenceScore: 86,
    confidenceExplanation: 'Accuracy depends on MLS data availability. Rural areas may have lower confidence due to fewer comps.'
  },
  {
    id: 'contract-compliance',
    name: 'Contract Compliance Checker',
    outcome: 'Verify contracts meet regulatory requirements',
    costRange: '$10.00 - $25.00',
    confidenceRange: '75% - 88%',
    rating: 4.4,
    domain: 'Legal',
    useCase: 'Compliance',
    description: [
      'Scans contract documents for required clauses and terms',
      'Checks against jurisdiction-specific regulations',
      'Flags missing or non-compliant sections with references'
    ],
    sources: ['Legal Database', 'State Regulations', 'Federal Code', 'Case Law'],
    setupCost: 50,
    usageCost: {
      type: 'per-task',
      amount: 17.50
    },
    confidenceScore: 82,
    confidenceExplanation: 'Confidence varies by jurisdiction. Well-established legal frameworks yield higher accuracy.'
  },
  {
    id: 'lead-enrichment',
    name: 'B2B Lead Enrichment',
    outcome: 'Add company size, revenue, tech stack to lead lists',
    costRange: '$0.20 - $0.40',
    confidenceRange: '82% - 94%',
    rating: 4.7,
    domain: 'Marketing',
    useCase: 'Data Cleanup',
    description: [
      'Takes company names or domains and enriches with firmographic data',
      'Adds employee count, estimated revenue, industry classification',
      'Identifies technology stack and contact information'
    ],
    sources: ['Clearbit', 'LinkedIn', 'BuiltWith', 'Crunchbase'],
    setupCost: 0,
    usageCost: {
      type: 'per-record',
      amount: 0.30
    },
    confidenceScore: 88,
    confidenceExplanation: 'Public companies and well-known brands have highest confidence. Startups and private firms may have gaps.'
  },
  {
    id: 'invoice-data-extract',
    name: 'Invoice Data Extractor',
    outcome: 'Pull vendor, amount, date from invoice PDFs',
    costRange: '$0.05 - $0.15',
    confidenceRange: '88% - 96%',
    rating: 4.9,
    domain: 'Operations',
    useCase: 'Data Cleanup',
    description: [
      'Extracts key fields from invoice documents automatically',
      'Handles multiple formats and layouts',
      'Returns structured JSON with vendor, amount, date, line items'
    ],
    sources: ['OCR Engine', 'Template Matching', 'ML Classification'],
    setupCost: 0,
    usageCost: {
      type: 'per-task',
      amount: 0.10
    },
    confidenceScore: 92,
    confidenceExplanation: 'Standard invoice formats yield 95%+ accuracy. Handwritten or unusual formats may reduce confidence.'
  },
  {
    id: 'permit-tracker',
    name: 'Building Permit Tracker',
    outcome: 'Monitor new building permits in target areas',
    costRange: '$15.00 - $30.00',
    confidenceRange: '78% - 90%',
    rating: 4.5,
    domain: 'Construction',
    useCase: 'Research',
    description: [
      'Tracks new permit filings in specified jurisdictions',
      'Extracts project details, contractor info, and valuations',
      'Sends alerts when permits match your criteria'
    ],
    sources: ['Municipal Databases', 'County Records', 'City Portals'],
    setupCost: 100,
    usageCost: {
      type: 'per-task',
      amount: 22.50
    },
    confidenceScore: 84,
    confidenceExplanation: 'Confidence depends on how digitized the jurisdiction\'s records are. Major cities have better data.'
  }
];

export const domains = ['All', 'Construction', 'Real Estate', 'Legal', 'Marketing', 'Operations'];
export const useCases = ['All', 'Lead Gen', 'Research', 'Compliance', 'Data Cleanup'];
