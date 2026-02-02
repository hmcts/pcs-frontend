import { z } from 'zod';

export const StartNowSchema = z.object({
  // No form fields required for start-now - it's just a navigation step
});

export type StartNowDto = z.infer<typeof StartNowSchema>;
