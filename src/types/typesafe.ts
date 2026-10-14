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
  scores: Record<'IQ' | 'EQ' | 'AQ' | 'SQ' | 'SpQ', TypeSafeDimensionScore>;
  placement_ready: boolean;
  requires_intervention: boolean;
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
