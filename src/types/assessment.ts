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
