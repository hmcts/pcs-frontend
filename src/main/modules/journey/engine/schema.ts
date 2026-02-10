import { Logger } from '@hmcts/nodejs-logging';
import { DateTime } from 'luxon';
import isPostalCode from 'validator/lib/isPostalCode';
import { superRefine, z } from 'zod/v4';

import { buildDateInputSchema } from './date.schema';

const logger = Logger.getLogger('journey-engine-schema');

// Common error message schema
const ErrorMessagesSchema = z
  .object({
    required: z.string().optional(),
    invalid: z.string().optional(),
    missingParts: z.custom<(missing: string[]) => string>().optional(),
    invalidPart: z.custom<(field: string) => string>().optional(),
    notRealDate: z.string().optional(),
    mustBePast: z.string().optional(),
    mustBeTodayOrPast: z.string().optional(),
    mustBeFuture: z.string().optional(),
    mustBeTodayOrFuture: z.string().optional(),
    mustBeAfter: z.custom<(date: DateTime, desc?: string) => string>().optional(),
    mustBeSameOrAfter: z.custom<(date: DateTime, desc?: string) => string>().optional(),
    mustBeBefore: z.custom<(date: DateTime, desc?: string) => string>().optional(),
    mustBeSameOrBefore: z.custom<(date: DateTime, desc?: string) => string>().optional(),
    mustBeBetween: z.custom<(start: DateTime, end: DateTime, desc?: string) => string>().optional(),
  })
  .optional();

// Field validation rules
export const ValidationRuleSchema = z
  .object({
    required: z
      .union([
        z.boolean(),
        z.custom<(data: Record<string, unknown>, allData: Record<string, unknown>) => boolean>(
          val => typeof val === 'function'
        ),
      ])
      .optional()
      .default(false),
    minLength: z.number().min(0).optional().default(0),
    maxLength: z.number().min(1).optional().default(100),
    min: z.number().optional().default(0),
    max: z.number().optional().default(100),
    pattern: z.string().optional(),
    email: z.boolean().optional().default(false),
    postcode: z.boolean().optional().default(false),
    url: z.boolean().optional().default(false),
    // Date-specific constraints
    mustBePast: z.boolean().optional(),
    mustBeTodayOrPast: z.boolean().optional(),
    mustBeFuture: z.boolean().optional(),
    mustBeTodayOrFuture: z.boolean().optional(),
    mustBeAfter: z
      .object({ date: z.custom<DateTime>(v => v instanceof DateTime), description: z.string().optional() })
      .optional(),
    mustBeSameOrAfter: z
      .object({ date: z.custom<DateTime>(v => v instanceof DateTime), description: z.string().optional() })
      .optional(),
    mustBeBefore: z
      .object({ date: z.custom<DateTime>(v => v instanceof DateTime), description: z.string().optional() })
      .optional(),
    mustBeSameOrBefore: z
      .object({ date: z.custom<DateTime>(v => v instanceof DateTime), description: z.string().optional() })
      .optional(),
    mustBeBetween: z
      .object({
        start: z.custom<DateTime>(v => v instanceof DateTime),
        end: z.custom<DateTime>(v => v instanceof DateTime),
        description: z.string().optional(),
      })
      .optional(),
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
export const FieldSchema = z
  .object({
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
      // Custom composite field type for postcode/address lookup
      'address',
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
  })
  // Allow unknown GOV.UK macro options to pass through to templates
  .loose()
  // Explicitly reject legacy `options` key to avoid confusion now that we are alpha
  .check(
    superRefine((data, ctx) => {
      if (data && typeof data === 'object' && 'options' in (data as Record<string, unknown>)) {
        ctx.addIssue({ code: 'custom', path: ['options'], message: 'Use items instead of options' });
      }
    })
  );

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
      name: z.string().min(1, { message: 'Journey name is required' }),
      description: z.string().min(1, { message: 'Journey description is required' }),
      version: z.string().default('1.0.0'),
    }),
    steps: z
      .record(z.string(), StepSchema)
      .refine(steps => Object.keys(steps).length > 0, { message: 'Journey must have at least one step' })
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
          message:
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
        { message: 'All step references must point to valid step IDs' }
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
        i18nNamespace: z.string().optional(),
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
    { message: 'Journey contains circular references in step navigation' }
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
    { message: 'All steps must be reachable from the start step' }
  );

// Parsed/validated type (all defaults applied)
export type StepConfig = z.infer<typeof StepSchema> & { id: string };

// Authoring/input type (fields optional before defaults)
// ────────────────────────────────────────────────────────────────────────────────
// Strongly-typed authoring helpers (dev DX / autocomplete)
// These types do not change runtime validation; they narrow the authoring surface
// so that when a dev sets `type`, TS can suggest relevant properties.

// Reuse input types of the internal Zod schemas for GOV.UK macro options
export type Label = z.input<typeof LabelSchema>;
export type Hint = z.input<typeof HintSchema>;
export type GovukErrorMessage = z.input<typeof GovukErrorMessageSchema>;
export type FormGroup = z.input<typeof FormGroupSchema>;
export type Fieldset = z.input<typeof FieldsetSchema>;
export type Affix = z.input<typeof AffixSchema>;

// Align with the field options we already validate
export type FieldOption = z.input<typeof FieldOptionSchema>;

// Error messages type aligned with ErrorMessagesSchema
export type ErrorMessages = z.input<typeof ErrorMessagesSchema>;

export type ConditionFn = (stepData: Record<string, unknown>, allData: Record<string, unknown>) => boolean;

export type NextConfig =
  | string
  | {
      when: unknown | ConditionFn;
      goto: string;
      else?: string;
    };

// Shared field properties
type MacroCommon = {
  id?: string;
  name?: string;
  classes?: string;
  attributes?: Record<string, unknown>;
  formGroup?: FormGroup;
};

type WithLabel = { label?: Label };
type WithHint = { hint?: Hint };
type WithErrorMessage = { errorMessage?: GovukErrorMessage };
type WithFieldset = { fieldset?: Fieldset };
type WithValidation = { validate?: ValidationRule; errorMessages?: ErrorMessages; flag?: string };

type WithValue = { value?: string | number | string[] };
type WithAffixes = { prefix?: Affix; suffix?: Affix };
type WithAccessibility = { autocomplete?: string; spellcheck?: boolean; disabled?: boolean; readonly?: boolean };
type WithWidth = { width?: string };

export type TextFieldDraft = MacroCommon &
  WithLabel &
  WithHint &
  WithErrorMessage &
  WithAffixes &
  WithAccessibility &
  WithWidth &
  WithValue &
  WithValidation & {
    type: 'text' | 'email' | 'tel' | 'url' | 'password';
    enterKeyHint?: string;
  };

export type TextareaFieldDraft = MacroCommon &
  WithLabel &
  WithHint &
  WithErrorMessage &
  WithAccessibility &
  WithValue &
  WithValidation & {
    type: 'textarea';
    rows?: number;
  };

export type NumberFieldDraft = MacroCommon &
  WithLabel &
  WithHint &
  WithErrorMessage &
  WithAffixes &
  WithAccessibility &
  WithWidth &
  WithValue &
  WithValidation & {
    type: 'number';
  };

export type RadiosFieldDraft = MacroCommon &
  WithHint &
  WithErrorMessage &
  WithFieldset &
  WithValidation & {
    type: 'radios';
    items?: FieldOption[];
  };

export type CheckboxesFieldDraft = MacroCommon &
  WithHint &
  WithErrorMessage &
  WithFieldset &
  WithValidation & {
    type: 'checkboxes';
    items?: FieldOption[];
  };

export type SelectFieldDraft = MacroCommon &
  WithLabel &
  WithHint &
  WithErrorMessage &
  WithValue &
  WithValidation & {
    type: 'select';
    items?: FieldOption[];
  };

export type DateFieldDraft = MacroCommon &
  WithHint &
  WithErrorMessage &
  WithFieldset &
  WithValidation & {
    type: 'date';
    // For composite input name prefixing
    namePrefix?: string;
  };

export type ButtonFieldDraft = {
  type: 'button';
  text?: string;
  html?: string;
  href?: string;
  classes?: string;
  attributes?: Record<string, unknown>;
  preventDoubleClick?: boolean;
  isStartButton?: boolean;
  flag?: string;
};

export type FileFieldDraft = MacroCommon &
  WithLabel &
  WithHint &
  WithErrorMessage &
  WithAccessibility &
  WithValidation & {
    type: 'file';
  };

export type AddressFieldDraft = MacroCommon &
  WithLabel &
  WithHint &
  WithValidation & {
    type: 'address';
    lookupText?: string;
  };

export type FieldDraft =
  | TextFieldDraft
  | TextareaFieldDraft
  | NumberFieldDraft
  | RadiosFieldDraft
  | CheckboxesFieldDraft
  | SelectFieldDraft
  | DateFieldDraft
  | ButtonFieldDraft
  | FileFieldDraft
  | AddressFieldDraft;

// Step authoring types
type BaseStep = {
  id: string;
  title?: string;
  description?: string;
  next?: NextConfig;
  template?: string;
  data?: Record<string, unknown>;
  flag?: string;
};

export type FormStepDraft = BaseStep & {
  type: 'form';
  fields: Record<string, FieldDraft>;
};

export type SummaryStepDraft = BaseStep & {
  type: 'summary';
  fields?: never;
};

export type ConfirmationStepDraft = BaseStep & {
  type: 'confirmation';
  fields?: never;
};

export type IneligibleStepDraft = BaseStep & {
  type: 'ineligible';
  fields?: never;
};

export type ErrorStepDraft = BaseStep & {
  type: 'error';
  fields?: never;
};

export type CompleteStepDraft = BaseStep & {
  type: 'complete';
  fields?: never;
};

export type SuccessStepDraft = BaseStep & {
  type: 'success';
  fields?: never;
};

export type StepDraft =
  | FormStepDraft
  | SummaryStepDraft
  | ConfirmationStepDraft
  | IneligibleStepDraft
  | ErrorStepDraft
  | CompleteStepDraft
  | SuccessStepDraft;

export type JourneyDraft = z.input<typeof JourneySchema>;

// Type inference
// Authoring-time rules should use input type so defaults are optional in TS
export type ValidationRule = z.input<typeof ValidationRuleSchema>;
export type FieldConfig = z.infer<typeof FieldSchema>;
export type JourneyConfig = z.infer<typeof JourneySchema>;

// Field validation schema factory
export const createFieldValidationSchema = (
  fieldConfig: FieldConfig,
  stepData?: Record<string, unknown>,
  allData?: Record<string, unknown>
): z.ZodTypeAny => {
  const rules = fieldConfig.validate;
  // Prefer field-level errorMessages, otherwise fall back to any defined inside the rules block
  const errorMessages = fieldConfig.errorMessages ?? rules?.errorMessages;

  const getMessage = (code: string): string | undefined => {
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
      try {
        return customMessage(code);
      } catch (err) {
        logger.error('customMessage function threw', err);
      }
    }

    return undefined;
  };

  const isRequired = (): boolean => {
    if (!rules?.required) {
      return false;
    }

    if (typeof rules.required === 'boolean') {
      return rules.required;
    }

    if (typeof rules.required === 'function' && stepData && allData) {
      try {
        return rules.required(stepData, allData);
      } catch (err) {
        logger.error('required function threw', err);
        return false;
      }
    }

    return false;
  };

  switch (fieldConfig.type) {
    case 'number': {
      let schema = z.coerce.number();
      if (rules?.min !== undefined) {
        schema = schema.min(rules.min, { message: getMessage('min') });
      }
      if (rules?.max !== undefined) {
        schema = schema.max(rules.max, { message: getMessage('max') });
      }
      return !isRequired() ? schema.optional() : schema;
    }

    case 'email': {
      const message = getMessage('email') ?? 'errors.email.invalid';
      // Trim whitespace first, then validate email format
      let schemaBase = z.string().trim();
      if (rules?.minLength !== undefined) {
        schemaBase = schemaBase.min(rules.minLength, { message: getMessage('minLength') });
      }
      if (rules?.maxLength !== undefined) {
        schemaBase = schemaBase.max(rules.maxLength, { message: getMessage('maxLength') });
      }
      const schema = schemaBase.pipe(z.email({ message }));
      const newSchema = !isRequired() ? schema.optional() : schema;
      return newSchema;
    }

    case 'url': {
      // Trim whitespace before URL validation
      let base = z.string().trim();
      if (rules?.minLength !== undefined) {
        base = base.min(rules.minLength, { message: getMessage('minLength') });
      }
      if (rules?.maxLength !== undefined) {
        base = base.max(rules.maxLength, { message: getMessage('maxLength') });
      }
      const schema = base.pipe(z.url({ message: getMessage('url') }));
      return !isRequired() ? schema.optional() : schema;
    }

    case 'select': {
      const opts = (fieldConfig.items ?? []) as (string | { value?: string })[];
      const allowed = opts
        .map(o => (typeof o === 'string' ? o : (o.value ?? '')))
        .filter(v => v !== '' && v !== null && v !== undefined) as string[];

      if (allowed.length === 0) {
        let schema = z.string();
        if (isRequired()) {
          schema = schema.min(1, { message: getMessage('required') ?? 'errors.required' });
        }
        return schema;
      }

      let schema = z.string();

      if (isRequired()) {
        schema = schema.min(1, { message: getMessage('required') ?? 'errors.required' });
      }

      schema = schema.refine(
        val => {
          if (val === '' || val === null) {
            return !isRequired();
          }
          return allowed.includes(val);
        },
        {
          message: getMessage('invalid') ?? 'errors.select.invalid',
        }
      );

      return schema;
    }

    case 'radios': {
      const opts = (fieldConfig.items ?? []) as (string | { value?: string })[];
      const allowed = opts
        .map(o => (typeof o === 'string' ? o : (o.value ?? '')))
        .filter(v => v !== '' && v !== null && v !== undefined) as string[];

      let schema = z.string();
      if (isRequired()) {
        schema = schema.min(1, { message: getMessage('required') ?? 'errors.required' });
      }

      if (allowed.length > 0) {
        schema = schema.refine(
          val => {
            if (val === '' || val === null) {
              return !isRequired();
            }
            return allowed.includes(val);
          },
          {
            message: getMessage('invalid') ?? 'errors.radios.invalid',
          }
        );
      }

      return schema;
    }

    case 'checkboxes': {
      const opts = (fieldConfig.items ?? []) as (string | { value?: string })[];
      const allowed = opts
        .map(o => (typeof o === 'string' ? o : (o.value ?? '')))
        .filter(v => v !== '' && v !== null && v !== undefined) as string[];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let schema: any = z.array(z.string());

      if (isRequired() || rules?.minLength !== undefined) {
        const minItems = rules?.minLength || 1;
        schema = schema.min(minItems, { message: getMessage('minLength') || 'Select at least one option' });
      }
      if (rules?.maxLength !== undefined) {
        schema = schema.max(rules.maxLength, { message: getMessage('maxLength') });
      }

      if (allowed.length > 0) {
        schema = schema.refine((arr: string[]) => arr.every((v: string) => allowed.includes(v)), {
          message: getMessage('invalid') ?? 'errors.checkboxes.invalid',
        });
      }

      return !isRequired() ? schema.optional().default([]) : schema;
    }

    case 'date': {
      // Adapter: merge errorMessages with a customMessage fallback (if provided)
      let dateMessages: Record<string, unknown> = errorMessages ? { ...errorMessages } : {};
      if (typeof rules?.customMessage === 'function') {
        dateMessages = { ...(errorMessages ?? {}) };
        const fn = rules.customMessage;
        const functionCodes = [
          'missingParts',
          'invalidPart',
          'mustBeAfter',
          'mustBeSameOrAfter',
          'mustBeBefore',
          'mustBeSameOrBefore',
          'mustBeBetween',
        ];
        const stringCodes = [
          'required',
          'notRealDate',
          'mustBePast',
          'mustBeTodayOrPast',
          'mustBeFuture',
          'mustBeTodayOrFuture',
        ];
        for (const code of [...functionCodes, ...stringCodes]) {
          if (dateMessages[code as keyof typeof dateMessages] === undefined) {
            if (functionCodes.includes(code)) {
              // Provide a wrapper that ignores args and delegates to customMessage(code)
              dateMessages[code] = () => fn(code);
            } else {
              dateMessages[code] = fn(code);
            }
          }
        }
      }

      return buildDateInputSchema(fieldConfig, {
        required: isRequired(),
        mustBePast: rules?.mustBePast,
        mustBeTodayOrPast: rules?.mustBeTodayOrPast,
        mustBeFuture: rules?.mustBeFuture,
        mustBeTodayOrFuture: rules?.mustBeTodayOrFuture,
        mustBeAfter: rules?.mustBeAfter,
        mustBeSameOrAfter: rules?.mustBeSameOrAfter,
        mustBeBefore: rules?.mustBeBefore,
        mustBeSameOrBefore: rules?.mustBeSameOrBefore,
        mustBeBetween: rules?.mustBeBetween,
        // If both errorMessages and customMessage are undefined, this stays undefined
        messages: dateMessages,
      });
    }

    case 'button': {
      return z.any().optional();
    }

    case 'address': {
      // Composite address field. Expect sub-inputs named using the pattern
      // `${name}[addressLine1]`, `${name}[addressLine2]`, `${name}[town]`, `${name}[county]`, `${name}[postcode]`.
      // We only enforce minimal validation here (line1, town, postcode). Postcode uses GB validation.

      const base = z.object({
        addressLine1: z
          .string()
          .trim()
          .min(1, { message: getMessage('addressLine1') || 'errors.address.addressLine1' }),
        addressLine2: z.string().trim().optional().default(''),
        town: z
          .string()
          .trim()
          .min(1, { message: getMessage('town') || 'errors.address.town' }),
        county: z.string().trim().optional().default(''),
        postcode: z
          .string()
          .trim()
          .refine(val => isPostalCode(val, 'GB'), { message: getMessage('postcode') || 'errors.address.postcode' }),
      });
      // For non-required address fields, allow empty values across all parts.
      // If some parts are provided, enforce the minimal constraints (line1, town, postcode).
      const addressRequired = isRequired();
      if (!addressRequired) {
        const partial = base.partial();
        const cleanEmptyToMissing = z.preprocess(val => {
          if (val && typeof val === 'object') {
            const obj = { ...(val as Record<string, unknown>) };
            for (const key of ['addressLine1', 'addressLine2', 'town', 'county', 'postcode']) {
              const v = obj[key];
              if (typeof v === 'string' && v.trim() === '') {
                delete obj[key];
              }
            }
            return obj;
          }
          return val;
        }, partial);
        return cleanEmptyToMissing;
      }
      return base;
    }

    default: {
      // Use a relaxed type here as the schema may switch between string, email, and URL validators
      // during the following conditional transformations.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let schema: any = z.string().trim();
      if (rules?.minLength !== undefined) {
        schema = schema.min(rules.minLength, { message: getMessage('minLength') });
      }
      if (rules?.maxLength !== undefined) {
        schema = schema.max(rules.maxLength, { message: getMessage('maxLength') });
      }
      if (rules?.pattern) {
        schema = schema.regex(new RegExp(rules.pattern), { message: getMessage('pattern') });
      }

      // Enforce non-empty when required but no explicit minLength provided
      if (isRequired() && (rules?.minLength === undefined || rules.minLength < 1)) {
        schema = schema.min(1, { message: getMessage('required') || 'Enter a value' });
      }

      if (rules?.email) {
        schema = schema.pipe(z.email({ message: getMessage('email') }));
      }

      if (rules?.url) {
        schema = schema.pipe(z.url({ message: getMessage('url') }));
      }

      if (rules?.postcode) {
        schema = schema.refine((val: string) => isPostalCode(val, 'GB'), {
          message: getMessage('postcode') ?? 'Enter a valid Postcode',
        });
      }
      return !isRequired() ? schema.optional() : schema;
    }
  }
};
