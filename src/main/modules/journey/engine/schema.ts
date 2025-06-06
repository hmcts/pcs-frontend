import { z } from 'zod/v4';

// Field validation using Zod's built-in validators
export const ValidationRuleSchema = z
  .object({
    required: z.boolean().optional(),
    minLength: z.number().min(0).optional(),
    maxLength: z.number().min(1).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(), // Regex pattern
    email: z.boolean().optional(),
    url: z.boolean().optional(),
    customMessage: z.string().optional(),
  })
  .optional();

// Field option - can be string or object
export const FieldOptionSchema = z.union([
  z.string(),
  z.object({
    value: z.string(),
    text: z.string(),
    hint: z.string().optional(),
  }),
]);

// Field configuration
export const FieldSchema = z.object({
  type: z.enum(['text', 'textarea', 'radios', 'checkboxes', 'select', 'date', 'number', 'email', 'tel', 'url']),
  label: z.string().optional(),
  hint: z.string().optional(),
  errorMessages: z
    .object({
      required: z.string().optional(),
      incomplete: z.string().optional(),
      invalid: z.string().optional(),
      future: z.string().optional(),
      past: z.string().optional(),
    })
    .optional(),
  options: z.array(FieldOptionSchema).optional(),
  validate: ValidationRuleSchema,
  classes: z.string().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
});

// Step configuration
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
});

// Journey configuration
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
          // Check for valid step types
          const stepTypes = Object.values(steps).map(step => (step as StepConfig).type);

          // A journey must have at least one form step
          const hasFormStep = Object.values(steps).some(
            step => (step as StepConfig).type === 'form' || (!(step as StepConfig).type && (step as StepConfig).fields)
          );

          // If there's a summary step, it must be followed by a confirmation step
          const hasSummary = stepTypes.includes('summary');
          const hasConfirmation = stepTypes.includes('confirmation');
          if (hasSummary && !hasConfirmation) {
            return false;
          }

          return hasFormStep;
        },
        {
          error:
            'Journey must have at least one form step. If it has a summary step, it must also have a confirmation step',
        }
      )
      .refine(
        steps => {
          // Check for valid step references
          const stepIds = Object.keys(steps);
          for (const [, step] of Object.entries(steps)) {
            const typedStep = step as StepConfig;
            if (typedStep.next) {
              if (typeof typedStep.next === 'string' && !stepIds.includes(typedStep.next)) {
                return false;
              }
              if (typeof typedStep.next === 'object') {
                if (!stepIds.includes(typedStep.next.goto)) {
                  return false;
                }
                if (typedStep.next.else && !stepIds.includes(typedStep.next.else)) {
                  return false;
                }
              }
            }
          }
          return true;
        },
        { error: 'All step references must point to valid step IDs' }
      ),
    config: z
      .object({
        store: z
          .object({
            type: z.enum(['session', 'database', 'redis', 'memory']).default('session'),
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
      // Check for circular references in step navigation
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

      // Start from the first step
      const firstStepId = Object.keys(journey.steps)[0];
      return !hasCycle(firstStepId);
    },
    { error: 'Journey contains circular references in step navigation' }
  )
  .refine(
    journey => {
      // Check that all steps are reachable
      const visited = new Set<string>();
      const toVisit = [Object.keys(journey.steps)[0]]; // Start with first step

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

// Use Zod's type inference
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;
export type FieldOption = z.infer<typeof FieldOptionSchema>;
export type FieldConfig = z.infer<typeof FieldSchema>;
export type StepConfig = z.infer<typeof StepSchema> & { id: string };
export type JourneyConfig = z.infer<typeof JourneySchema>;

// Field validation schema for form data
export const createFieldValidationSchema = (fieldConfig: FieldConfig): z.ZodTypeAny => {
  // Apply validation rules
  const rules = fieldConfig.validate;

  // Start with base type and apply required/optional logic
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
      let schema = z.string().email({ error: rules?.customMessage });
      if (rules?.minLength !== undefined) {
        schema = schema.min(rules.minLength, { error: rules.customMessage });
      }
      if (rules?.maxLength !== undefined) {
        schema = schema.max(rules.maxLength, { error: rules.customMessage });
      }
      return rules?.required === false ? schema.optional() : schema;
    }

    case 'url': {
      let schema = z.string().url({ error: rules?.customMessage });
      if (rules?.minLength !== undefined) {
        schema = schema.min(rules.minLength, { error: rules.customMessage });
      }
      if (rules?.maxLength !== undefined) {
        schema = schema.max(rules.maxLength, { error: rules.customMessage });
      }
      return rules?.required === false ? schema.optional() : schema;
    }

    case 'checkboxes': {
      // For checkboxes, handle required and minLength
      if (rules?.required === true || rules?.minLength !== undefined) {
        const minItems = rules?.minLength || 1;
        let schema = z.array(z.string()).min(minItems, { error: rules?.customMessage || 'Select at least one option' });

        if (rules?.maxLength !== undefined) {
          schema = schema.max(rules.maxLength, { error: rules.customMessage });
        }

        return schema;
      } else {
        return z.array(z.string()).optional().default([]);
      }
    }

    case 'date': {
      const schema = z
        .object({
          day: z.string().min(1, { message: fieldConfig.errorMessages?.incomplete || 'Enter a day' }),
          month: z.string().min(1, { message: fieldConfig.errorMessages?.incomplete || 'Enter a month' }),
          year: z.string().min(1, { message: fieldConfig.errorMessages?.incomplete || 'Enter a year' }),
        })
        .refine(
          val => {
            const day = parseInt(val.day, 10);
            const month = parseInt(val.month, 10);
            const year = parseInt(val.year, 10);
            if (isNaN(day) || isNaN(month) || isNaN(year)) {
              return false;
            }
            const date = new Date(year, month - 1, day);
            return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
          },
          { message: fieldConfig.errorMessages?.invalid || 'Enter a valid date' }
        )
        .refine(
          val => {
            // For date of birth, must be in the past
            const day = parseInt(val.day, 10);
            const month = parseInt(val.month, 10);
            const year = parseInt(val.year, 10);
            if (isNaN(day) || isNaN(month) || isNaN(year)) {
              return true;
            }
            const date = new Date(year, month - 1, day);
            return date.getTime() < Date.now();
          },
          { message: fieldConfig.errorMessages?.future || 'Date must be in the past' }
        );
      return rules?.required === false ? schema.optional() : schema;
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
