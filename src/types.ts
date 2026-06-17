// ============================================================
// Central type definitions for the C2C platform
// ============================================================

// --- Student & Assessment ---

export interface Student {
  id: string;
  full_name: string;
  email: string;
  department: string;
  graduation_year: number;
  auth_id?: string;
  phone?: string;
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  item_type: string;
  options?: AssessmentOption[] | string;
}

export interface AssessmentOption {
  key?: string;
  value?: string;
  id?: string;
  text?: string;
  label?: string;
  weight?: number;
}

export interface AssessmentResponse {
  item_id: string;
  response: string | number;
}

export interface DimensionScores {
  EQ?: number;
  SQ?: number;
  AQ?: number;
  IQ?: number;
  SpQ?: number;
  [key: string]: number | undefined;
}

export interface DevelopmentReport {
  strengths: string[];
  growth_areas: string[];
  recommended_actions: string[];
}

export interface ActionableFeedback {
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AssessmentResult {
  dimension_scores: DimensionScores;
  founder_fit: Record<string, number>;
  development_report: DevelopmentReport;
  actionable_feedback?: ActionableFeedback[];
  primary_profile?: string;
  tech_fit_index?: number;
  sales_fit_index?: number;
}

// --- Employer ---

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

// --- Admin / TPO ---

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
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
}
