import isPostalCode from 'validator/lib/isPostalCode';
import { z } from 'zod/v4';

// Common error message schema
const ErrorMessagesSchema = z
  .object({
    required: z.string().optional(),
    incomplete: z.string().optional(),
    invalid: z.string().optional(),
    future: z.string().optional(),
    past: z.string().optional(),
    day: z.string().optional(),
    month: z.string().optional(),
    year: z.string().optional(),
  })
  .optional();

// Field validation rules
export const ValidationRuleSchema = z
  .object({
    required: z.boolean().optional().default(false),
    minLength: z.number().min(0).optional().default(0),
    maxLength: z.number().min(1).optional().default(100),
    min: z.number().optional().default(0),
    max: z.number().optional().default(100),
    pattern: z.string().optional(),
    email: z.email().optional(),
    postalCode: z
      .string()
      .refine(val => isPostalCode(val, 'GB'), { message: 'Postal code must be 4 characters long' })
      .optional(),
    url: z.url().optional(),
    customMessage: z.string().optional(),
    errorMessages: ErrorMessagesSchema,
  })
  .optional();

// Field option schema
export const FieldOptionSchema = z.union([
  z.string(),
  z.object({
    value: z.string(),
    text: z.string(),
    hint: z.string().optional(),
  }),
]);

// Field configuration schema
export const FieldSchema = z.object({
  type: z.enum(['text', 'textarea', 'radios', 'checkboxes', 'select', 'date', 'number', 'email', 'tel', 'url']),
  label: z.string().optional(),
  hint: z.string().optional(),
  errorMessages: ErrorMessagesSchema,
  options: z.array(FieldOptionSchema).optional(),
  validate: ValidationRuleSchema,
  classes: z.string().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  flag: z.string().optional(),
});

// Step configuration schema
export const StepSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['form', 'summary', 'confirmation', 'ineligible', 'error', 'complete', 'success']).default('form'),
  fields: z.record(z.string(), FieldSchema).optional(),
  next: z
    .union([
      z.string(),
      z.object({
        when: z.string(),
        goto: z.string(),
        else: z.string().optional(),
      }),
    ])
    .optional(),
  template: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  flag: z.string().optional(),
});

// Journey configuration schema
export const JourneySchema = z
  .object({
    meta: z.object({
      name: z.string().min(1, { error: 'Journey name is required' }),
      description: z.string().min(1, { error: 'Journey description is required' }),
      version: z.string().default('1.0.0'),
    }),
    steps: z
      .record(z.string(), StepSchema)
      .refine(steps => Object.keys(steps).length > 0, { error: 'Journey must have at least one step' })
      .refine(
        steps => {
          const stepTypes = Object.values(steps).map(step => (step as StepConfig).type);
          const hasFormStep = Object.values(steps).some(
            step => (step as StepConfig).type === 'form' || (!(step as StepConfig).type && (step as StepConfig).fields)
          );
          const hasSummary = stepTypes.includes('summary');
          const hasConfirmation = stepTypes.includes('confirmation');
          return hasFormStep && (!hasSummary || hasConfirmation);
        },
        {
          error:
            'Journey must have at least one form step. If it has a summary step, it must also have a confirmation step',
        }
      )
      .refine(
        steps => {
          const stepIds = Object.keys(steps);
          return Object.values(steps).every(step => {
            const typedStep = step as StepConfig;
            if (!typedStep.next) {
              return true;
            }
            if (typeof typedStep.next === 'string') {
              return stepIds.includes(typedStep.next);
            }
            return (
              stepIds.includes(typedStep.next.goto) && (!typedStep.next.else || stepIds.includes(typedStep.next.else))
            );
          });
        },
        { error: 'All step references must point to valid step IDs' }
      ),
    config: z
      .object({
        store: z
          .object({
            type: z.enum(['session', 'database', 'redis', 'memory', 'ccd']).default('session'),
            options: z.record(z.string(), z.unknown()).optional(),
          })
          .optional(),
        templates: z
          .object({
            base: z.string().optional(),
            defaults: z.record(z.string(), z.string()).optional(),
          })
          .optional(),
        auth: z
          .object({
            required: z.boolean().default(true),
          })
          .optional(),
      })
      .optional(),
  })
  .refine(
    journey => {
      const visited = new Set<string>();
      const path = new Set<string>();

      const hasCycle = (stepId: string): boolean => {
        if (path.has(stepId)) {
          return true;
        }
        if (visited.has(stepId)) {
          return false;
        }

        visited.add(stepId);
        path.add(stepId);

        const step = journey.steps[stepId] as StepConfig;
        if (step.next) {
          if (typeof step.next === 'string') {
            if (hasCycle(step.next)) {
              return true;
            }
          } else {
            if (hasCycle(step.next.goto)) {
              return true;
            }
            if (step.next.else && hasCycle(step.next.else)) {
              return true;
            }
          }
        }

        path.delete(stepId);
        return false;
      };

      return !hasCycle(Object.keys(journey.steps)[0]);
    },
    { error: 'Journey contains circular references in step navigation' }
  )
  .refine(
    journey => {
      const visited = new Set<string>();
      const toVisit = [Object.keys(journey.steps)[0]];

      while (toVisit.length > 0) {
        const stepId = toVisit.pop()!;
        if (visited.has(stepId)) {
          continue;
        }

        visited.add(stepId);
        const step = journey.steps[stepId] as StepConfig;

        if (step.next) {
          if (typeof step.next === 'string') {
            toVisit.push(step.next);
          } else {
            toVisit.push(step.next.goto);
            if (step.next.else) {
              toVisit.push(step.next.else);
            }
          }
        }
      }

      return visited.size === Object.keys(journey.steps).length;
    },
    { error: 'All steps must be reachable from the start step' }
  );

// Type inference
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;
export type FieldOption = z.infer<typeof FieldOptionSchema>;
export type FieldConfig = z.infer<typeof FieldSchema>;
export type StepConfig = z.infer<typeof StepSchema> & { id: string };
export type JourneyConfig = z.infer<typeof JourneySchema>;

// Field validation schema factory
export const createFieldValidationSchema = (fieldConfig: FieldConfig): z.ZodTypeAny => {
  const rules = fieldConfig.validate;
  const errorMessages = rules?.errorMessages;

  switch (fieldConfig.type) {
    case 'number': {
      let schema = z.coerce.number();
      if (rules?.min !== undefined) {
        schema = schema.min(rules.min, { error: rules.customMessage });
      }
      if (rules?.max !== undefined) {
        schema = schema.max(rules.max, { error: rules.customMessage });
      }
      return rules?.required === false ? schema.optional() : schema;
    }

    case 'email': {
      let schema = z.email({ error: rules?.customMessage });
      if (rules?.minLength !== undefined) {
        schema = schema.min(rules.minLength, { error: rules.customMessage });
      }
      if (rules?.maxLength !== undefined) {
        schema = schema.max(rules.maxLength, { error: rules.customMessage });
      }
      return rules?.required === false ? schema.optional() : schema;
    }

    case 'url': {
      let schema = z.url({ error: rules?.customMessage });
      if (rules?.minLength !== undefined) {
        schema = schema.min(rules.minLength, { error: rules.customMessage });
      }
      if (rules?.maxLength !== undefined) {
        schema = schema.max(rules.maxLength, { error: rules.customMessage });
      }
      return rules?.required === false ? schema.optional() : schema;
    }

    case 'checkboxes': {
      if (rules?.required === true || rules?.minLength !== undefined) {
        const minItems = rules?.minLength || 1;
        let schema = z.array(z.string()).min(minItems, { error: rules?.customMessage || 'Select at least one option' });
        if (rules?.maxLength !== undefined) {
          schema = schema.max(rules.maxLength, { error: rules.customMessage });
        }
        return schema;
      }
      return z.array(z.string()).optional().default([]);
    }

    case 'date': {
      if (rules?.required === true) {
        const schema = z
          .object({
            day: z.string(),
            month: z.string(),
            year: z.string(),
          })
          .refine(
            val => {
              if (!val.day || !val.month || !val.year) {
                return false;
              }
              const iso = `${val.year.padStart(4, '0')}-${val.month.padStart(2, '0')}-${val.day.padStart(2, '0')}`;
              if (isNaN(Date.parse(iso))) {
                return false;
              }
              const date = new Date(iso);
              return date.getTime() <= Date.now();
            },
            {
              message: errorMessages?.invalid || 'Enter a valid date',
              path: ['date'],
            }
          )
          .transform(val => ({
            day: val.day,
            month: val.month,
            year: val.year,
            iso: `${val.year.padStart(4, '0')}-${val.month.padStart(2, '0')}-${val.day.padStart(2, '0')}`,
          }));
        return schema;
      }
      return z
        .object({
          day: z.string().optional(),
          month: z.string().optional(),
          year: z.string().optional(),
        })
        .optional();
    }

    default: {
      let schema = z.string();
      if (rules?.minLength !== undefined) {
        schema = schema.min(rules.minLength, { error: rules.customMessage });
      }
      if (rules?.maxLength !== undefined) {
        schema = schema.max(rules.maxLength, { error: rules.customMessage });
      }
      if (rules?.pattern) {
        schema = schema.regex(new RegExp(rules.pattern), { error: rules.customMessage });
      }
      return rules?.required === false ? schema.optional() : schema;
    }
  }
};
