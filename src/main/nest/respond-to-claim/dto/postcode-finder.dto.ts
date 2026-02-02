import { z } from 'zod';

export const PostcodeFinderSchema = z.object({
  postcode: z
    .string({
      required_error: 'Enter a postcode',
      invalid_type_error: 'Postcode must be a string',
    })
    .trim()
    .min(1, { message: 'Enter a postcode' })
    .regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, {
      message: 'Enter a valid UK postcode',
    }),
});

export type PostcodeFinderDto = z.infer<typeof PostcodeFinderSchema>;
