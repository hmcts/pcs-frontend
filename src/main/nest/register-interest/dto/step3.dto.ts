import { z } from 'zod';

export const Step3Schema = z.object({
  confirmAccuracy: z
    .string()
    .refine((val) => val === 'confirmed', {
      message: 'Confirm that the information you have provided is accurate',
    }),
});

export type Step3Dto = z.infer<typeof Step3Schema>;