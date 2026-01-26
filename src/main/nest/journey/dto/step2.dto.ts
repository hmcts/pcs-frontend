import { z } from 'zod';

export const Step2Schema = z.object({
  feedback: z
    .string({
      required_error: 'Enter your feedback',
    })
    .min(1, 'Enter your feedback')
    .max(2000, 'Feedback must be 2000 characters or fewer'),
});

export type Step2Dto = z.infer<typeof Step2Schema>;
