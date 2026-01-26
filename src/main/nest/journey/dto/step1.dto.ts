import { z } from 'zod';

export const Step1Schema = z.object({
  decision: z
    .string({
      required_error: 'Select yes, no, or maybe',
    })
    .refine(val => ['yes', 'no', 'maybe'].includes(val), {
      message: 'Select yes, no, or maybe',
    }),
});

export type Step1Dto = z.infer<typeof Step1Schema>;
