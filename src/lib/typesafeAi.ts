import { authFetch } from './authFetch';
import type { TypeSafeEvaluateResponse, TypeSafeStatusResponse } from '@/types/typesafe';

/**
 * Client helper to check TypeSafe AI integration status
 */
export async function getTypeSafeStatus(): Promise<TypeSafeStatusResponse | null> {
  try {
    const res = await authFetch('/api/typesafe/status');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch TypeSafe AI status:', err);
    return null;
  }
}

/**
 * Client helper to evaluate responses using TypeSafe AI System One
 */
export async function evaluateWithTypeSafeAI(params: {
  candidateName?: string;
  studentId?: string;
  responses: Array<{ item_id?: string; response: string | number; dimension?: string }>;
  customRubrics?: Record<string, string>;
}): Promise<TypeSafeEvaluateResponse | null> {
  try {
    const res = await authFetch('/api/typesafe/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_name: params.candidateName || 'Candidate',
        student_id: params.studentId,
        responses: params.responses,
        custom_rubrics: params.customRubrics,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to run TypeSafe AI evaluation:', err);
    return null;
  }
}
