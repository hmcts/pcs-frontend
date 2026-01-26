import { z } from 'zod';

export const Step3Schema = z.object({
  fullName: z
    .string({
      required_error: 'Enter your full name',
    })
    .min(1, 'Enter your full name')
    .max(100, 'Full name must be 100 characters or fewer'),
  email: z
    .string({
      required_error: 'Enter your email address',
    })
    .min(1, 'Enter your email address')
    .email('Enter a valid email address'),
  phoneNumber: z
    .string()
    .optional()
    .refine(val => !val || /^[\d\s+()-]+$/.test(val), {
      message: 'Enter a valid phone number',
    }),
});

export type Step3Dto = z.infer<typeof Step3Schema>;
