import { z } from 'zod';

export const FreeLegalAdviceSchema = z.object({
  // No form fields required for free-legal-advice - it's an informational step
});

export type FreeLegalAdviceDto = z.infer<typeof FreeLegalAdviceSchema>;
