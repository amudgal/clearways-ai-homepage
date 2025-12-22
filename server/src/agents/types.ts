// Shared types for the agent system

export interface ContractorInput {
  rocNumber: string;
  contractorName: string;
  licenseStatus?: string;
  classification?: string;
  city?: string;
  phone?: string;
  website?: string;
  rowIndex: number;
}

export interface JobPreferences {
  excludedDomains?: string[];
  allowedDomains?: string[];
  budgetCap?: number;
  strictness?: 'strict' | 'moderate' | 'lenient';
  useLLM?: boolean; // Feature flag for LLM reasoning
}

export interface AgentContext {
  jobId: string;
  contractorInput: ContractorInput;
  preferences: JobPreferences;
  budgetRemaining: number;
  visitedDomains: Set<string>;
  excludedDomains: Set<string>;
  currentEntityId?: string;
}

export interface Entity {
  id: string;
  rocNumber: string;
  contractorName: string;
  officialWebsite?: string;
  businessName?: string;
  address?: string;
  phone?: string;
  classification?: string;
  licenseStatus?: string;
}

export interface EmailCandidate {
  email: string;
  source: string;
  sourceUrl: string;
  confidence: number;
  rationale: string;
  validationSignals: ValidationSignals;
}

export interface Evidence {
  type: 'roc_record' | 'website' | 'search_result' | 'email_extraction' | 'validation';
  source: string;
  content: string;
  url?: string;
  timestamp: Date;
}

export interface VisitedSiteLog {
  url: string;
  startedAt: Date;
  completedAt?: Date;
  success: boolean;
  error?: string;
  robotsTxtRespected: boolean;
}

export interface CostLineItem {
  jobId: string;
  entityId?: string;
  category: 'search' | 'scrape' | 'validation' | 'enrichment' | 'llm';
  description: string;
  unitCost: number;
  quantity: number;
  totalCost: number;
  currency: string;
  timestamp: Date;
}

export interface ValidationSignals {
  mxRecordExists: boolean;
  smtpCheck: boolean;
  domainValid: boolean;
  formatValid: boolean;
  sourceAuthoritative: boolean;
  multipleSources: boolean;
}

export interface ConfidenceRationale {
  score: number; // 0-100
  factors: string[];
  warnings: string[];
}

export interface ExplanationEvent {
  ts: string;
  level: 'info' | 'warning' | 'error' | 'success';
  agent: string;
  summary: string;
  details?: any;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  cost?: number;
  evidence?: Evidence[];
}

