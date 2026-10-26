/** Calls per metered source (ai_call_ledger.source). */
export interface AiCallCounts {
  featurize_calls: number;
  evaluate_calls: number;
  match_calls: number;
  gemini_scout_calls: number;
  gemini_item_gen_calls: number;
}

export interface AiSpendDay extends AiCallCounts {
  day: string;
}

export interface CostAdvice {
  id: string;
  level: 'act' | 'consider';
  title: string;
  detail: string;
}

export interface AiCostLimits {
  account_max_calls_per_day: number | null;
  featurize_max_calls_per_day: number | null;
  evaluate_max_calls_per_day: number | null;
  match_max_calls_per_day: number | null;
  gemini_scout_max_calls_per_day: number | null;
  gemini_item_gen_max_calls_per_day: number | null;
  price_per_call_inr: number | null;
  monthly_budget_inr: number | null;
}

export interface AiSpendSummary extends AiCostLimits {
  today: string;
  today_calls: AiCallCounts;
  month_to_date_calls: number;
  month_error_calls: number;
  projected_month_calls: number;
  by_day: AiSpendDay[];
  settings_updated_at: string;
  suggested_account_cap: number | null;
  advice: CostAdvice[];
}
