import { z } from 'zod';

export const FieldSchema = z.object({
  type: z.enum(['text', 'radios', 'checkboxes', 'select', 'date']),
  options: z.array(z.string()).optional(),
  validate: z
    .object({
      required: z.string().optional(),
      minLength: z.number().optional(),
      regex: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

export const StepSchema = z.object({
  title: z.string().optional(),
  type: z.string().optional(), // e.g. "summary"
  fields: z.record(FieldSchema).optional(),
  next: z.any().optional(), // either string or { when, goto, else }
});

export const JourneySchema = z.object({
  meta: z.object({
    name: z.string(),
  }),
  steps: z.record(StepSchema),
});

export type Journey = z.infer<typeof JourneySchema>;
