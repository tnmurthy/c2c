export type FounderArchetype = 'Builder' | 'Leader' | 'Rainmaker' | 'Anchor';

export interface TypeSafeDimensionScore {
  score: number;
  percentile_band: string;
  confidence: number;
  rationale: string;
}

export interface TypeSafeEvaluateResponse {
  candidate_name: string;
  primary_archetype: FounderArchetype;
  archetype_probabilities: Record<FounderArchetype, number>;
  // Heuristic fallback omits dimensions that had no responses.
  scores: Partial<Record<'IQ' | 'EQ' | 'AQ' | 'SQ' | 'SpQ', TypeSafeDimensionScore>>;
  placement_ready: boolean;
  placement_ready_probability?: number | null;
  requires_intervention: boolean;
  requires_intervention_probability?: number | null;
  ai_confidence: number;
  model_provider: string;
  is_live_api: boolean;
  timestamp: string;
}

export interface TypeSafeStatusResponse {
  provider: string;
  flagship_model: string;
  api_key_configured: boolean;
  latency_target_ms: number;
  supported_primitives: string[];
  status: string;
}

export interface TypeSafeFeatureColumn {
  name: string;
  kind: 'intensity' | 'presence';
  mean: number;
  spread_sd: number;
  interpretation: string;
}

export interface TypeSafeFeaturizeResponse {
  candidate_name: string;
  features: Record<string, TypeSafeFeatureColumn>;
  numeric_vector: number[];
  feature_names: string[];
  model_provider: string;
  is_live_api: boolean;
  timestamp: string;
}

export interface TypeSafeFeaturizeRequest {
  student_id?: string;
  candidate_name?: string;
  free_text: string;
  custom_probes?: Array<{
    name: string;
    kind: 'intensity' | 'presence';
    question: string;
  }>;
}
