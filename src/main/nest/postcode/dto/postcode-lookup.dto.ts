import { z } from 'zod';

export const PostcodeLookupSchema = z.object({
  postcode: z
    .string({
      required_error: 'Postcode is required',
      invalid_type_error: 'Postcode must be a string',
    })
    .transform(val => val.trim())
    .refine(val => val.length > 0, { message: 'Postcode is required' }),
});

export type PostcodeLookupDto = z.infer<typeof PostcodeLookupSchema>;
