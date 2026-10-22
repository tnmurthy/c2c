import { z } from 'zod';

export const AssessmentAttemptSchema = z.object({
  id:             z.string().uuid(),
  student_id:     z.string().uuid(),
  assessment_id:  z.string().uuid(),
  attempt_number: z.number().int().positive(),
  score:          z.number().min(0).max(100),
  created_at:     z.string().datetime(),
});

export type AssessmentAttempt = z.infer<typeof AssessmentAttemptSchema>;

export function parseAttempt(raw: unknown): AssessmentAttempt {
  const result = AssessmentAttemptSchema.safeParse(raw);
  if (!result.success) {
    console.error('[parseAttempt]', result.error.flatten());
    throw new Error('Invalid assessment attempt shape');
  }
  return result.data;
}
