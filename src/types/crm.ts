import { DimensionScores } from './assessment';

// --- Legacy/General CRM Types ---
export interface Candidate {
  id: string;
  name: string;
  role: string;
  cohort: string;
  match: number;
  iq: number;
  eq: number;
  aq: number;
  sq: number;
  tech_fit_index: number;
  sales_fit_index: number;
  skills: string[];
  image: string;
  status: 'online' | 'away' | 'offline';
  summary: string;
}

export interface Lead {
  id: string;
  job_title?: string;
  title?: string;
  company?: string;
  company_name?: string;
  ai_score?: number;
  created_at?: string;
}

export interface CohortData {
  total_students: number;
  placement_rate: number;
  avg_scores: DimensionScores;
}

export interface Alert {
  id: string;
  student_id?: string;
  job_id?: string;
  score?: number;
  lead_url?: string;
  created_at?: string;
  market_leads?: {
    id?: string;
    name?: string;
    company?: string;
    ai_score?: number;
    lead_url?: string;
  };
  // legacy fields
  message?: string;
  severity?: 'info' | 'warning' | 'critical';
  timestamp?: string;
}

// --- Frontend/Page CRM Shared Primitives ---
export interface CrmCandidateScore {
  IQ?: number;
  EQ?: number;
  SQ?: number;
  AQ?: number;
  SpQ?: number;
}

export interface CrmCandidate {
  id: string;
  full_name: string;
  email?: string;
  department?: string;
  archetype?: string;
  scores?: CrmCandidateScore;
  fit_scores?: Record<string, number>;
}

export interface CrmLead {
  lead_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  source: string;
  status: string;
  interest_area: string;
  account_name: string;
  owner_id?: string;
  tenant_id: string;
}

export interface CrmAccount {
  account_id: string;
  name: string;
  type: string;
  industry: string;
  city: string;
  website?: string;
  owner_id?: string;
  tenant_id: string;
}

export interface PipelineStage {
  stage_id: string;
  name: string;
  sequence: number;
}

export interface CrmOpportunity {
  opportunity_id: string;
  name: string;
  stage_id: string;
  amount: number;
  currency: string;
  candidate_id?: string | null;
  accounts?: {
    name: string;
  };
  candidate?: CrmCandidate;
}
