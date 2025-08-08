import { Logger } from '@hmcts/nodejs-logging';
import { DateTime } from 'luxon';
import isPostalCode from 'validator/lib/isPostalCode';
import { z } from 'zod/v4';

const logger = Logger.getLogger('journey-engine-schema');

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
    email: z.boolean().optional().default(false),
    postcode: z.boolean().optional().default(false),
    url: z.boolean().optional().default(false),
    // Allows either a static string or a function (val => typeof val === 'string' | 'function')
    customMessage: z
      .custom<string | ((code: string) => string)>(val => typeof val === 'string' || typeof val === 'function', {
        message: 'customMessage must be a string or function',
      })
      .optional(),
    errorMessages: ErrorMessagesSchema,
  })
  .optional();

// ────────────────────────────────────────────────────────────────────────────────
// GOV.UK Design System macro option schemas
// These match the documented Nunjucks macro parameters for form components so
// authors can copy-and-paste directly from the Design System into a journey
// config and have it validate correctly.

// Generic label / legend object used by many components
const LabelObjectSchema = z
  .object({
    text: z.string().optional(),
    html: z.string().optional(),
    classes: z.string().optional(),
    isPageHeading: z.boolean().optional(),
  })
  .strict();

// Allows a primitive string *or* the rich label object
const LabelSchema = z.union([z.string(), LabelObjectSchema]);

// Generic hint object
const HintObjectSchema = z
  .object({
    text: z.string().optional(),
    html: z.string().optional(),
    classes: z.string().optional(),
  })
  .strict();
const HintSchema = z.union([z.string(), HintObjectSchema]);

// Single error message object used by GOV.UK macros (different to the per-rule
// errorMessages we already support).
const GovukErrorMessageSchema = z
  .object({
    text: z.string().optional(),
    html: z.string().optional(),
    classes: z.string().optional(),
    visuallyHiddenText: z.string().optional(),
  })
  .strict();

// Form-group wrapper classes
const FormGroupSchema = z
  .object({
    classes: z.string().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// Fieldset with optional legend
const FieldsetSchema = z
  .object({
    legend: LabelSchema.optional(),
    classes: z.string().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// Prefix / suffix objects for input component
const AffixSchema = z
  .object({
    text: z.string().optional(),
    html: z.string().optional(),
    classes: z.string().optional(),
  })
  .strict();

// Field option schema
export const FieldOptionSchema = z.union([
  z.string(),
  z
    .object({
      value: z.string(),
      text: z.string().optional(),
      html: z.string().optional(),
      label: LabelSchema.optional(),
      hint: HintSchema.optional(),
      divider: z.string().optional(),
      checked: z.boolean().optional(),
      selected: z.boolean().optional(),
      disabled: z.boolean().optional(),
      conditional: z.record(z.string(), z.unknown()).optional(),
      attributes: z.record(z.string(), z.unknown()).optional(),
    })
    .strict(),
]);

// Field configuration schema
export const FieldSchema = z.object({
  // Supported form component types
  type: z.enum([
    'text',
    'textarea',
    'radios',
    'checkboxes',
    'select',
    'date',
    'number',
    'email',
    'tel',
    'url',
    'password',
    'file',
    'button',
  ]),

  // Core GOV.UK macro options (all optional so existing journeys continue to work)
  id: z.string().optional(),
  name: z.string().optional(),
  label: LabelSchema.optional(),
  hint: HintSchema.optional(),
  errorMessage: GovukErrorMessageSchema.optional(),

  // Original specialised errorMessages remain supported for rule-level messages
  errorMessages: ErrorMessagesSchema,

  fieldset: FieldsetSchema.optional(),
  formGroup: FormGroupSchema.optional(),

  prefix: AffixSchema.optional(),
  suffix: AffixSchema.optional(),

  // Choices / select style components
  items: z.array(FieldOptionSchema).optional(), // direct GOV.UK naming
  options: z.array(FieldOptionSchema).optional(), // legacy naming our engine uses

  // Validation rules remain unchanged
  validate: ValidationRuleSchema,

  // Presentation helpers
  classes: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),

  autocomplete: z.string().optional(),
  disabled: z.boolean().optional(),
  readonly: z.boolean().optional(),
  spellcheck: z.boolean().optional(),
  enterKeyHint: z.string().optional(),

  rows: z.number().optional(), // textarea
  width: z.string().optional(), // input width modifier classes
  text: z.string().optional(), // button text

  flag: z.string().optional(),

  // Adding namePrefix for date fields or other types that require it
  namePrefix: z.string().optional(),

  // Adding value for fields like text, number, textarea, etc.
  value: z.union([z.string(), z.number(), z.array(z.string())]).optional(), // value is now allowed for fields that support it
});

// Step configuration schema
export const StepSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['form', 'summary', 'confirmation', 'ineligible', 'error', 'complete', 'success']).default('form'),
  id: z.string().optional(),
  fields: z.record(z.string(), FieldSchema).optional(),
  next: z
    .union([
      z.string(),
      z.object({
        when: z.any(),
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

// Parsed/validated type (all defaults applied)
export type StepConfig = z.infer<typeof StepSchema> & { id: string };

// Authoring/input type (fields optional before defaults)
export type StepDraft = z.input<typeof StepSchema> & { id: string };

export type JourneyDraft = z.input<typeof JourneySchema>;

// Type inference
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;
export type FieldOption = z.infer<typeof FieldOptionSchema>;
export type FieldConfig = z.infer<typeof FieldSchema>;
export type JourneyConfig = z.infer<typeof JourneySchema>;

// Field validation schema factory
export const createFieldValidationSchema = (fieldConfig: FieldConfig): z.ZodTypeAny => {
  const rules = fieldConfig.validate;
  // Prefer field-level errorMessages, otherwise fall back to any defined inside the rules block
  const errorMessages = fieldConfig.errorMessages ?? rules?.errorMessages;

  const getMessage = (
    code: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): string | ((iss: any) => string | undefined) | undefined => {
    if (!rules) {
      return undefined;
    }

    // Specific rule-level message wins
    const errorMessagesMap = errorMessages as Record<string, string | undefined> | undefined;
    if (errorMessagesMap && errorMessagesMap[code]) {
      return errorMessagesMap[code];
    }

    const { customMessage } = rules;

    if (typeof customMessage === 'string') {
      return customMessage;
    }

    if (typeof customMessage === 'function') {
      return (issue: { code: string }) => {
        try {
          return customMessage(issue.code);
        } catch (err) {
          logger.error('customMessage function threw', err);
          return undefined;
        }
      };
    }

    return undefined;
  };

  switch (fieldConfig.type) {
    case 'number': {
      let schema = z.coerce.number();
      if (rules?.min !== undefined) {
        schema = schema.min(rules.min, { error: getMessage('min') });
      }
      if (rules?.max !== undefined) {
        schema = schema.max(rules.max, { error: getMessage('max') });
      }
      return rules?.required === false ? schema.optional() : schema;
    }

    case 'email': {
      let schema = z.email({ error: getMessage('email') });
      if (rules?.minLength !== undefined) {
        schema = schema.min(rules.minLength, { error: getMessage('minLength') });
      }
      if (rules?.maxLength !== undefined) {
        schema = schema.max(rules.maxLength, { error: getMessage('maxLength') });
      }
      return rules?.required === false ? schema.optional() : schema;
    }

    case 'url': {
      let schema = z.url({ error: getMessage('url') });
      if (rules?.minLength !== undefined) {
        schema = schema.min(rules.minLength, { error: getMessage('minLength') });
      }
      if (rules?.maxLength !== undefined) {
        schema = schema.max(rules.maxLength, { error: getMessage('maxLength') });
      }
      return rules?.required === false ? schema.optional() : schema;
    }

    case 'select': {
      const opts = (fieldConfig.items ?? fieldConfig.options ?? []) as (string | { value?: string })[];
      const allowed = opts
        .map(o => (typeof o === 'string' ? o : (o.value ?? '')))
        .filter(v => v !== '' && v !== null && v !== undefined) as string[];

      if (allowed.length === 0) {
        // Fallback to simple string validation if no options found
        return z.string();
      }

      // z.enum requires tuple type; assert non-empty
      const enumSchema = z.enum(allowed as [string, ...string[]]);

      return rules?.required === false ? enumSchema.optional() : enumSchema;
    }

    case 'checkboxes': {
      if (rules?.required === true || rules?.minLength !== undefined) {
        const minItems = rules?.minLength || 1;
        let schema = z
          .array(z.string())
          .min(minItems, { error: getMessage('minLength') || 'Select at least one option' });
        if (rules?.maxLength !== undefined) {
          schema = schema.max(rules.maxLength, { error: getMessage('maxLength') });
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

              const date = DateTime.fromObject({
                day: parseInt(val.day, 10),
                month: parseInt(val.month, 10),
                year: parseInt(val.year, 10),
              });

              if (!date.isValid) {
                return false;
              }

              // TODO: currently only checks that the date is not in the future e.g. DOB field
              return date.toMillis() <= DateTime.now().toMillis();
            },
            {
              message: (getMessage('invalid') as string) ?? 'Enter a valid date',
              path: ['date'],
            }
          )
          .transform(val => ({
            day: val.day,
            month: val.month,
            year: val.year,
            iso: DateTime.fromObject({
              day: parseInt(val.day, 10),
              month: parseInt(val.month, 10),
              year: parseInt(val.year, 10),
            }).toISO(),
          }));
        return schema;
      }
      return z
        .object({
          day: z.string().optional(),
          month: z.string().optional(),
          year: z.string().optional(),
        })
        .refine(
          val => {
            // Pass when nothing entered – field truly omitted
            if (!val.day && !val.month && !val.year) {
              return true;
            }

            // Fail when some but not all parts entered
            if (!val.day || !val.month || !val.year) {
              return false;
            }

            const date = DateTime.fromObject({
              day: parseInt(val.day, 10),
              month: parseInt(val.month, 10),
              year: parseInt(val.year, 10),
            });
            if (!date.isValid) {
              return false;
            }

            // Reject future dates (mirrors required-path logic)
            return date.toMillis() <= DateTime.now().toMillis();
          },
          {
            message: (getMessage('invalid') as string) ?? 'Enter a valid date',
            path: ['date'],
          }
        )
        .transform(val => {
          if (!val.day && !val.month && !val.year) {
            return val; // leave blank optional date untouched
          }
          return {
            day: val.day,
            month: val.month,
            year: val.year,
            iso: DateTime.fromObject({
              day: parseInt(val.day!, 10),
              month: parseInt(val.month!, 10),
              year: parseInt(val.year!, 10),
            }).toISO(),
          };
        });
    }

    case 'button': {
      return z.any().optional();
    }

    default: {
      // Use a relaxed type here as the schema may switch between string, email, and URL validators
      // during the following conditional transformations.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let schema: any = z.string();
      if (rules?.minLength !== undefined) {
        schema = schema.min(rules.minLength, { error: getMessage('minLength') });
      }
      if (rules?.maxLength !== undefined) {
        schema = schema.max(rules.maxLength, { error: getMessage('maxLength') });
      }
      if (rules?.pattern) {
        schema = schema.regex(new RegExp(rules.pattern), { error: getMessage('pattern') });
      }

      // Enforce non-empty when required but no explicit minLength provided
      if (rules?.required === true && (rules?.minLength === undefined || rules.minLength < 1)) {
        schema = schema.min(1, { error: getMessage('required') || 'Enter a value' });
      }

      if (rules?.email) {
        schema = z.email({ error: getMessage('email') });
      }

      if (rules?.url) {
        schema = z.url({ error: getMessage('url') });
      }

      if (rules?.postcode) {
        schema = schema.refine((val: string) => isPostalCode(val, 'GB'), {
          error: getMessage('postcode') ?? 'Enter a valid postcode',
        });
      }
      return rules?.required === false ? schema.optional() : schema;
    }
  }
};
