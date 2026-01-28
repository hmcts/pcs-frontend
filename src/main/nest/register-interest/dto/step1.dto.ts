import { z } from 'zod';

export const Step1Schema = z.object({
  contactPreference: z.enum(['email', 'phone', 'post'], {
    errorMap: () => ({ message: 'Select how you would like to be contacted' }),
  }),
});

export type Step1Dto = z.infer<typeof Step1Schema>;