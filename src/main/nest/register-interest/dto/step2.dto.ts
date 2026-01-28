import { z } from 'zod';

export const Step2Schema = z.object({
  fullName: z
    .string()
    .min(1, 'Enter your full name')
    .max(100, 'Full name must be 100 characters or less'),

  email: z
    .string()
    .min(1, 'Enter your email address')
    .email('Enter a valid email address'),

  phoneNumber: z
    .string()
    .min(1, 'Enter your phone number')
    .regex(/^[0-9\\s\\-\\+\\(\\)]+$/, 'Enter a valid phone number'),
});

export type Step2Dto = z.infer<typeof Step2Schema>;