/** Mirrors GET /api/employer/jobs/{id}/candidates (services/matching/scorer.py). */

export type MatchStatus = 'PENDING' | 'SHORTLISTED' | 'CONTACTED' | 'REJECTED';

export interface RequirementEvidence {
  /** TypeSafe Score position on 0-4 (see REQUIREMENT_LEVELS in typesafe_service.py). */
  level: number;
  confidence: number;
}

export interface RankedCandidate {
  student_id: string;
  name: string | null;
  department: string | null;
  graduation_year: number | null;
  skills: string[];
  rank: number;
  fit_score: number;
  five_q_score: number;
  /** null when requirement evidence was not judged; the candidate is ranked on 5Q alone. */
  evidence_score: number | null;
  evidence: Record<string, RequirementEvidence>;
  status: MatchStatus;
}

export interface JobPosting {
  id: string;
  title: string;
  description: string | null;
  requirements: string[] | null;
  role_type: string | null;
  location: string | null;
  is_remote: boolean | null;
  status: string | null;
}

export interface MatchRunSummary {
  candidates: number;
  ranked: number;
  evidence_judged: number;
}
