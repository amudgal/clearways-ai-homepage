// Core Data Models - Technical Specification Implementation

export type UserRole = 'USER' | 'ADMIN';
export type AnalysisStatus = 'LIVE' | 'SAVED' | 'LOCKED';
export type HostingEnvironment = 'AWS' | 'GCP' | 'Azure';

export interface User {
  username?: string;
  id: string;
  email: string;
  domain: string;
  tenant_id: string;
  role: UserRole;
  created_at: string;
  last_login_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface Analysis {
  id: string;
  tenant_id: string;
  status: AnalysisStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  saved_at: string | null;
  locked_at: string | null;
  pricing_version: string;
  title?: string;
}

export interface AnalysisInputs {
  analysis_id: string;
  mstr_license_per_instance: number;
  ancillary_license_pct: number;
  instance_count: number;
  hosting_environment: HostingEnvironment;
  tier_selections: Record<string, string>;
  storage_gb: number;
  egress_gb: number;
  compute_gb: number;
  infrastructure_gb: number;
  cloud_personnel_cost: number;
  mstr_support_cost: number;
}

export interface AnalysisComputedResults {
  analysis_id: string;
  annualized_licensing: number;
  annualized_metered_costs: number;
  annualized_support_costs: number;
  total_cost: number;
  confidence_scores: Record<string, number>;
  sensitivity_ratings: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'>;
  cost_breakdown: CostBreakdown;
}

export interface CostBreakdown {
  licensing: {
    mstr_licensing: number;
    ancillary_licensing: number;
    total: number;
  };
  metered: {
    compute: number;
    infrastructure: number;
    storage: number;
    egress: number;
    total: number;
  };
  support: {
    cloud_personnel: number;
    mstr_support: number;
    total: number;
  };
  total: number;
}

export interface AuditLog {
  id: string;
  user_id: string;
  tenant_id: string;
  action: string;
  target_id: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface PricingVersion {
  id: string;
  version: string;
  effective_date: string;
  pricing_data: PricingData;
}

export interface PricingData {
  compute: {
    hourly_rate: number;
    annual_multiplier: number;
  };
  infrastructure: {
    gb_month_rate: number;
    annual_multiplier: number;
  };
  storage: {
    gb_month_rate: number;
    annual_multiplier: number;
  };
  egress: {
    gb_rate: number;
    annual_multiplier: number;
  };
  support_percentage: number;
}

export interface Insight {
  id: string;
  type: 'WARNING' | 'INFO' | 'RECOMMENDATION';
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

