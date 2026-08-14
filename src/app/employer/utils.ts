import type { Candidate } from "@/types";

export interface CustomWeights {
  wIQ: number;
  wAQ: number;
  wEQ: number;
  wSQ: number;
  wSpQ: number;
}

/**
 * Computes a candidate's match score, either using the pre-computed `match`
 * field or recalculating it from the custom quotient weights when the
 * Custom Weight Sandbox is active.
 */
export function getCandidateMatchScore(
  c: Candidate,
  customWeightsMode: boolean,
  weights: CustomWeights
): number {
  if (!customWeightsMode) return c.match;
  const { wIQ, wAQ, wEQ, wSQ, wSpQ } = weights;
  const totalWeight = wIQ + wAQ + wEQ + wSQ + wSpQ;
  if (totalWeight === 0) return 0;
  const spq = Math.round((c.iq + c.eq) / 2);
  const score = (c.iq * wIQ + c.aq * wAQ + c.eq * wEQ + c.sq * wSQ + spq * wSpQ) / totalWeight;
  return Math.round(score);
}
