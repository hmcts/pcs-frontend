# NestJS Journey vs Express Journey Comparison
## Form-Led User Journey Implementation Patterns

**Prepared for:** Senior Development Team  
**Date:** January 22, 2026  
**Objective:** Compare the NestJS journey implementation with existing Express-based journeys

---

## Executive Summary

This document compares two approaches to building form-led user journeys:

1. **Express Approach** - Current `respond-to-claim` journey using step registry pattern
2. **NestJS Approach** - New `nest-journey` proof of concept

Both approaches achieve the same goals but with significantly different code organization, testability, and maintainability characteristics.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure Comparison](#file-structure-comparison)
3. [Step Definition Comparison](#step-definition-comparison)
4. [Validation Comparison](#validation-comparison)
5. [Navigation & Flow Control](#navigation--flow-control)
6. [Testing Comparison](#testing-comparison)
7. [Pros & Cons Summary](#pros--cons-summary)
8. [Recommendation](#recommendation)

---

## Architecture Overview

### Express Journey Architecture (respond-to-claim)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Journey Registration                         │
│  src/main/steps/index.ts → journeyRegistry                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Flow Configuration                           │
│  src/main/steps/respond-to-claim/flow.config.ts                 │
│  • stepOrder: ['start-now', 'postcode-finder', 'free-legal...'] │
│  • steps: { 'start-now': { defaultNext: 'postcode-finder' } }   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Step Registry                                │
│  src/main/steps/respond-to-claim/stepRegistry.ts                │
│  • Maps step names to StepDefinition objects                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Individual Steps                             │
│  src/main/steps/respond-to-claim/start-now/index.ts             │
│  • url, name, view, getController, postController               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Route Registration                           │
│  src/main/routes/registerSteps.ts                               │
│  • Iterates journeyRegistry, registers GET/POST for each step   │
│  • Applies oidcMiddleware, ccdCaseMiddleware                    │
│  • Applies stepDependencyCheckMiddleware                        │
└─────────────────────────────────────────────────────────────────┘
```

### NestJS Journey Architecture (nest-journey)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Module Registration                          │
│  src/main/nest/app.module.ts                                    │
│  imports: [PostcodeModule, NestJourneyModule]                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Journey Module                               │
│  src/main/nest/journey/nest-journey.module.ts                   │
│  • controllers: [NestJourneyController]                         │
│  • providers: [NestJourneyService]                              │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│      Controller         │     │       Service           │
│  • @Get('step1')        │────▶│  • getNextStep()        │
│  • @Post('step1')       │     │  • canAccessStep()      │
│  • @Render('step1.njk') │     │  • markStepComplete()   │
│  • Zod validation       │     │  • getBackUrl()         │
└─────────────────────────┘     └─────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DTOs with Zod Schemas                        │
│  src/main/nest/journey/dto/step1.dto.ts                         │
│  • Step1Schema = z.object({ decision: z.string()... })          │
│  • type Step1Dto = z.infer<typeof Step1Schema>                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure Comparison

### Express Journey (respond-to-claim)

```
src/main/
├── steps/
│   ├── index.ts                          # Journey registry
│   └── respond-to-claim/
│       ├── flow.config.ts                # Flow configuration
│       ├── stepRegistry.ts               # Step registry
│       ├── start-now/
│       │   └── index.ts                  # Step definition
│       ├── postcode-finder/
│       │   └── index.ts                  # Step definition
│       └── free-legal-advice/
│           └── index.ts                  # Step definition
├── routes/
│   └── registerSteps.ts                  # Route registration
├── modules/steps/
│   ├── controller.ts                     # GetController factory
│   ├── flow.ts                           # Navigation helpers
│   └── formBuilder/
│       └── helpers.ts                    # validateForm()
├── interfaces/
│   ├── stepFormData.interface.ts         # StepDefinition type
│   └── stepFlow.interface.ts             # JourneyFlowConfig type
└── views/respond-to-claim/
    └── start-now.njk                     # Template
```

**Total files for 3-step journey: ~15+ files across 6 directories**

### NestJS Journey (nest-journey)

```
src/main/nest/journey/
├── nest-journey.module.ts                # Module definition
├── nest-journey.controller.ts            # All routes in one file
├── nest-journey.service.ts               # Navigation logic
└── dto/
    ├── step1.dto.ts                      # Validation schema
    ├── step2.dto.ts                      # Validation schema
    └── step3.dto.ts                      # Validation schema

src/main/views/nest-journey/
├── step1.njk                             # Template
├── step2.njk                             # Template
├── step3.njk                             # Template
└── confirmation.njk                      # Template
```

**Total files for 3-step journey: 10 files in 2 directories**

### File Count Comparison

| Aspect | Express | NestJS | Difference |
|--------|---------|--------|------------|
| **Step files** | 3 (one per step) | 1 (controller) | ✅ -2 files |
| **Config files** | 3 (flow, registry, index) | 1 (module) | ✅ -2 files |
| **Validation** | Shared helper | 3 DTOs | Same |
| **Templates** | 3 | 4 | +1 (confirmation) |
| **Total** | ~15+ | 10 | ✅ ~33% fewer |

---

## Step Definition Comparison

### Express Step Definition

```typescript
// src/main/steps/respond-to-claim/start-now/index.ts
import type { Request, Response } from 'express';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { DASHBOARD_ROUTE } from '../../../routes/dashboard';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

const stepName = 'start-now';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/start-now`,
  name: stepName,
  view: 'respond-to-claim/start-now/startNow.njk',
  stepDir: __dirname,
  
  // ❌ Factory function returns controller
  getController: () => {
    return createGetController(
      'respond-to-claim/start-now/startNow.njk',
      stepName,
      (_req: Request) => {
        return {
          backUrl: DASHBOARD_ROUTE,
        };
      },
      'respondToClaim'
    );
  },
  
  // ❌ Manual post handler
  postController: {
    post: async (req: Request, res: Response) => {
      const redirectPath = stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
```

**Issues:**
- ❌ Boilerplate-heavy (imports, factory functions)
- ❌ Step logic split across multiple files
- ❌ Navigation requires external helper
- ❌ No validation in this example
- ❌ Hard to see the full picture

### NestJS Step Definition

```typescript
// src/main/nest/journey/nest-journey.controller.ts (excerpt)
@Controller('nest-journey')
@UseGuards(OidcGuard)
export class NestJourneyController {
  constructor(private readonly journeyService: NestJourneyService) {}

  @Get('step1')
  @Render('nest-journey/step1.njk')
  getStep1(@Req() req: SessionWithJourney, @Res() res: Response): Record<string, unknown> | void {
    // ✅ Step access check in one line
    if (!this.checkStepAccess(req, res, 'step1')) return;

    const journeyData = this.getJourneyData(req);

    // ✅ Clear return object
    return {
      pageTitle: 'Make a decision - Nest Journey',
      backUrl: '/dashboard',
      formData: journeyData.step1 || {},
      error: null,
    };
  }

  @Post('step1')
  postStep1(@Req() req: SessionWithJourney, @Res() res: Response): void {
    const journeyData = this.getJourneyData(req);
    
    // ✅ Zod validation
    const result = Step1Schema.safeParse(req.body);

    if (!result.success) {
      // ✅ GOV.UK error pattern
      res.status(400).render('nest-journey/step1.njk', {
        pageTitle: 'Error: Make a decision - Nest Journey',
        backUrl: '/dashboard',
        formData: req.body,
        error: { field: 'decision', text: result.error.errors[0]?.message },
        errorSummary: {
          titleText: 'There is a problem',
          errorList: [{ text: result.error.errors[0]?.message, href: '#decision' }],
        },
      });
      return;
    }

    // ✅ Type-safe data storage
    journeyData.step1 = result.data;
    this.journeyService.markStepComplete(journeyData, 'step1');

    // ✅ Service handles navigation
    const nextStep = this.journeyService.getNextStep('step1');
    res.redirect(303, this.journeyService.getStepUrl(nextStep!));
  }
}
```

**Benefits:**
- ✅ All step logic in one place
- ✅ Decorators make intent clear
- ✅ Validation with type inference
- ✅ Service handles navigation
- ✅ Easy to read and understand

---

## Validation Comparison

### Express Validation

```typescript
// src/main/modules/steps/formBuilder/helpers.ts (excerpt)
export function validateForm(
  req: Request,
  fields: FormFieldConfig[],
  translations?: Record<string, string>,
  allFormData?: Record<string, unknown>,
  t?: TFunction
): Record<string, string> {
  const errors: Record<string, string> = {};
  
  // ❌ 200+ lines of validation logic
  // ❌ Handles many field types
  // ❌ Complex nested field validation
  // ❌ Date field special handling
  // ❌ Checkbox normalization
  
  for (const field of fields) {
    // ... complex validation logic
    if (isRequired && isMissing) {
      errors[fieldName] = translations?.[fieldName] || field.errorMessage || 'This field is required';
    }
    // ... pattern validation
    // ... maxLength validation
    // ... custom validators
  }
  
  return errors;
}
```

**Issues:**
- ❌ 400+ lines in helpers.ts
- ❌ Complex conditional logic
- ❌ Hard to understand all validation rules
- ❌ No type inference from validation

### NestJS Validation (Zod)

```typescript
// src/main/nest/journey/dto/step1.dto.ts
import { z } from 'zod';

export const Step1Schema = z.object({
  decision: z
    .string({ required_error: 'Select yes, no, or maybe' })
    .refine(val => ['yes', 'no', 'maybe'].includes(val), {
      message: 'Select yes, no, or maybe',
    }),
});

// ✅ Type automatically inferred
export type Step1Dto = z.infer<typeof Step1Schema>;

// src/main/nest/journey/dto/step3.dto.ts
export const Step3Schema = z.object({
  fullName: z
    .string({ required_error: 'Enter your full name' })
    .min(1, 'Enter your full name')
    .max(100, 'Full name must be 100 characters or fewer'),
  email: z
    .string({ required_error: 'Enter your email address' })
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
```

**Benefits:**
- ✅ Declarative schema definition
- ✅ Type inference from schema
- ✅ Composable validators
- ✅ Clear error messages
- ✅ Easy to read and maintain

### Validation Comparison Table

| Aspect | Express | NestJS (Zod) |
|--------|---------|--------------|
| **Definition** | ❌ Field config objects | ✅ Schema objects |
| **Type Safety** | ❌ Manual types | ✅ Inferred from schema |
| **Error Messages** | ⚠️ Translation keys | ✅ Inline messages |
| **Composability** | ❌ Limited | ✅ Full (extend, merge) |
| **Custom Validators** | ⚠️ Function callbacks | ✅ `.refine()` method |
| **Lines of Code** | ❌ 400+ (shared) | ✅ ~20 per step |

---

## Navigation & Flow Control

### Express Navigation

```typescript
// src/main/steps/respond-to-claim/flow.config.ts
export const flowConfig: JourneyFlowConfig = {
  basePath: RESPOND_TO_CLAIM_ROUTE,
  journeyName: 'respondToClaim',
  stepOrder: ['start-now', 'postcode-finder', 'free-legal-advice'],
  steps: {
    'start-now': {
      defaultNext: 'postcode-finder',
    },
    'postcode-finder': {
      defaultNext: 'free-legal-advice',
      dependencies: ['start-now'],  // ❌ Must define dependencies
    },
    'free-legal-advice': {
      defaultNext: 'legal-advice',
      dependencies: ['postcode-finder'],
    },
  },
};

// src/main/modules/steps/flow.ts
export function stepDependencyCheckMiddleware(flowConfig: JourneyFlowConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const stepName = urlParts[urlParts.length - 1];
    const formData = req.session?.formData || {};
    const missingDependency = checkStepDependencies(stepName, flowConfig, formData);

    if (missingDependency) {
      const dependencyUrl = getStepUrl(missingDependency, flowConfig);
      return res.redirect(303, dependencyUrl);
    }

    next();
  };
}
```

**Issues:**
- ❌ Dependencies defined separately from steps
- ❌ Middleware checks on every request
- ❌ Complex flow.ts (160+ lines)
- ❌ Hard to trace navigation logic

### NestJS Navigation

```typescript
// src/main/nest/journey/nest-journey.service.ts
export const JOURNEY_STEPS = ['step1', 'step2', 'step3', 'confirmation'] as const;
export type JourneyStep = (typeof JOURNEY_STEPS)[number];

@Injectable()
export class NestJourneyService {
  // ✅ Simple array-based navigation
  getNextStep(currentStep: JourneyStep): JourneyStep | null {
    const currentIndex = JOURNEY_STEPS.indexOf(currentStep);
    if (currentIndex >= 0 && currentIndex < JOURNEY_STEPS.length - 1) {
      return JOURNEY_STEPS[currentIndex + 1];
    }
    return null;
  }

  // ✅ Clear access control logic
  canAccessStep(step: JourneyStep, journeyData: JourneyData): boolean {
    if (step === 'step1') return true;

    const stepIndex = JOURNEY_STEPS.indexOf(step);
    const previousStep = JOURNEY_STEPS[stepIndex - 1];
    return journeyData.completedSteps.includes(previousStep);
  }

  // ✅ Mark completion explicitly
  markStepComplete(journeyData: JourneyData, step: JourneyStep): void {
    if (!journeyData.completedSteps.includes(step)) {
      journeyData.completedSteps.push(step);
    }
  }
}
```

**Benefits:**
- ✅ Steps defined in single array
- ✅ Type-safe step names
- ✅ Clear, testable methods
- ✅ 80 lines total (vs 160+)

---

## Testing Comparison

### Express Journey Testing

```typescript
// Testing Express journeys is complex
describe('respond-to-claim journey', () => {
  it('should navigate to next step', async () => {
    // ❌ Need to mock Express req/res
    const mockReq = {
      session: { formData: {} },
      body: { answer: 'yes' },
      originalUrl: '/respond-to-claim/start-now',
    };
    const mockRes = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
    };

    // ❌ Need to import and call the step's postController
    const { step } = require('./start-now');
    await step.postController.post(mockReq, mockRes);

    // ❌ Assert on mock calls
    expect(mockRes.redirect).toHaveBeenCalledWith(303, '/respond-to-claim/postcode-finder');
  });
});
```

### NestJS Journey Testing

```typescript
// src/test/unit/nest/journey/nest-journey.service.spec.ts
describe('NestJourneyService', () => {
  let service: NestJourneyService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [NestJourneyService],
    }).compile();

    service = module.get<NestJourneyService>(NestJourneyService);
  });

  describe('canAccessStep', () => {
    it('should always allow access to step1', () => {
      const journeyData: JourneyData = { completedSteps: [] };
      expect(service.canAccessStep('step1', journeyData)).toBe(true);
    });

    it('should not allow access to step2 without completing step1', () => {
      const journeyData: JourneyData = { completedSteps: [] };
      expect(service.canAccessStep('step2', journeyData)).toBe(false);
    });

    it('should allow access to step2 after completing step1', () => {
      const journeyData: JourneyData = { completedSteps: ['step1'] };
      expect(service.canAccessStep('step2', journeyData)).toBe(true);
    });
  });

  describe('getNextStep', () => {
    it('should return step2 after step1', () => {
      expect(service.getNextStep('step1')).toBe('step2');
    });

    it('should return null after confirmation', () => {
      expect(service.getNextStep('confirmation')).toBeNull();
    });
  });
});
```

### Test Coverage Comparison

| Aspect | Express | NestJS |
|--------|---------|--------|
| **Service Tests** | ⚠️ Hard to isolate | ✅ 26 tests, easy mocking |
| **Controller Tests** | ❌ Requires req/res mocks | ✅ 8 tests, DI mocking |
| **Integration Tests** | ⚠️ Complex setup | ✅ Module-based setup |
| **Test Confidence** | ⚠️ Lower | ✅ Higher |

---

## Pros & Cons Summary

### Express Journey Pattern

| Pros | Cons |
|------|------|
| ✅ Team familiarity | ❌ Many files per journey |
| ✅ Flexible configuration | ❌ Boilerplate-heavy |
| ✅ Shared validation helper | ❌ Complex validation logic |
| ✅ i18n integration | ❌ Hard to test |
| | ❌ Dependencies defined separately |
| | ❌ Navigation logic scattered |

### NestJS Journey Pattern

| Pros | Cons |
|------|------|
| ✅ Fewer files | ⚠️ Learning curve |
| ✅ Clear structure | ⚠️ Different patterns |
| ✅ Type-safe validation | ⚠️ Zod vs class-validator |
| ✅ Easy to test (26 tests) | |
| ✅ All step logic together | |
| ✅ Declarative decorators | |

---

## Side-by-Side Code Comparison

### Adding a New Step: Complete Walkthrough

#### Express Approach: 5 Files + Configuration

**Step 1: Create Step Definition** (`src/main/steps/respond-to-claim/contact-details/index.ts`)
```typescript
import type { Request, Response } from 'express';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

const stepName = 'contact-details';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/contact-details`,
  name: stepName,
  view: 'respond-to-claim/contact-details/contactDetails.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/contact-details/contactDetails.njk',
      stepName,
      (_req: Request) => {
        return {
          backUrl: `${RESPOND_TO_CLAIM_ROUTE}/postcode-finder`,
        };
      },
      'respondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const redirectPath = stepNavigation.getNextStepUrl(req, stepName, req.body);
      if (!redirectPath) {
        return res.status(404).render('not-found');
      }
      res.redirect(303, redirectPath);
    },
  },
};
```
**Lines: 41** | **Files touched: 1**

**Step 2: Update Step Registry** (`src/main/steps/respond-to-claim/stepRegistry.ts`)
```typescript
import { step as contactDetails } from './contact-details';
import { step as freeLegalAdvice } from './free-legal-advice';
import { step as postcodeFinder } from './postcode-finder';
import { step as startNow } from './start-now';

export const stepRegistry = {
  'start-now': startNow,
  'postcode-finder': postcodeFinder,
  'contact-details': contactDetails,  // ← Add this line
  'free-legal-advice': freeLegalAdvice,
};
```
**Lines: +2** | **Files touched: 2**

**Step 3: Update Flow Configuration** (`src/main/steps/respond-to-claim/flow.config.ts`)
```typescript
export const flowConfig: JourneyFlowConfig = {
  basePath: RESPOND_TO_CLAIM_ROUTE,
  journeyName: 'respondToClaim',
  stepOrder: [
    'start-now',
    'postcode-finder',
    'contact-details',      // ← Add to order
    'free-legal-advice',
  ],
  steps: {
    'start-now': {
      defaultNext: 'postcode-finder',
    },
    'postcode-finder': {
      defaultNext: 'contact-details',  // ← Update next step
      dependencies: ['start-now'],
    },
    'contact-details': {                // ← Add step config
      defaultNext: 'free-legal-advice',
      dependencies: ['postcode-finder'],
    },
    'free-legal-advice': {
      defaultNext: 'legal-advice',
      dependencies: ['contact-details'], // ← Update dependency
    },
  },
};
```
**Lines: +6** | **Files touched: 3**

**Step 4: Create Template** (`src/main/views/respond-to-claim/contact-details/contactDetails.njk`)
```nunjucks
{% extends "stepsTemplate.njk" %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{% block pageTitle %}{{ t('pageTitle') }}{% endblock %}

{% block mainContent %}
  <h1 class="govuk-heading-l">{{ t('heading') }}</h1>
  
  <form method="post" novalidate>
    {{ govukInput({
      name: "email",
      id: "email",
      type: "email",
      label: { text: t('fields.email.label') },
      hint: { text: t('fields.email.hint') },
      errorMessage: { text: errors.email } if errors.email else null,
      value: formData.email
    }) }}

    {{ govukInput({
      name: "phone",
      id: "phone",
      type: "tel",
      label: { text: t('fields.phone.label') },
      errorMessage: { text: errors.phone } if errors.phone else null,
      value: formData.phone
    }) }}

    {{ govukButton({ text: t('buttons.continue') }) }}
  </form>
{% endblock %}
```
**Lines: 31** | **Files touched: 4**

**Step 5: Create Locale Files** (`src/main/assets/locales/en/respondToClaim/contactDetails.json`)
```json
{
  "pageTitle": "Your contact details - Respond to claim",
  "heading": "Your contact details",
  "fields": {
    "email": {
      "label": "Email address",
      "hint": "We'll use this to send you updates"
    },
    "phone": {
      "label": "Phone number"
    }
  },
  "buttons": {
    "continue": "Continue"
  }
}
```
**Lines: 16** | **Files touched: 5**

**Total Express Effort:**
- **Files created:** 3 (step definition, template, locale)
- **Files modified:** 2 (stepRegistry, flow.config)
- **Total lines:** ~96 lines
- **Configuration complexity:** High (must update registry + flow config)

---

#### NestJS Approach: 3 Files + Array Update

**Step 1: Create DTO** (`src/main/nest/journey/dto/contact-details.dto.ts`)
```typescript
import { z } from 'zod';

export const ContactDetailsSchema = z.object({
  email: z
    .string({ required_error: 'Enter your email address' })
    .min(1, 'Enter your email address')
    .email('Enter a valid email address'),
  phone: z
    .string({ required_error: 'Enter your phone number' })
    .min(1, 'Enter your phone number')
    .regex(/^[\d\s+()-]+$/, 'Enter a valid phone number'),
});

export type ContactDetailsDto = z.infer<typeof ContactDetailsSchema>;
```
**Lines: 14** | **Files touched: 1**

**Step 2: Add Routes to Controller** (`src/main/nest/journey/nest-journey.controller.ts`)
```typescript
import { ContactDetailsSchema } from './dto/contact-details.dto';

// Add to existing controller class:

@Get('contact-details')
@Render('nest-journey/contact-details.njk')
async getContactDetails(@Req() req: SessionWithJourney, @Res() res: Response) {
  await loadStepNamespace(req, 'contact-details', 'nestJourney');
  const t = getTranslationFunction(req, 'contact-details', ['common']);
  req.t = t;

  if (!this.checkStepAccess(req, res, 'contact-details')) {
    return;
  }

  const journeyData = this.getJourneyData(req);
  return {
    backUrl: this.journeyService.getBackUrl('contact-details'),
    formData: journeyData.contactDetails || {},
    errors: {},
    t,
  };
}

@Post('contact-details')
async postContactDetails(@Req() req: SessionWithJourney, @Res() res: Response) {
  await loadStepNamespace(req, 'contact-details', 'nestJourney');
  const t = getTranslationFunction(req, 'contact-details', ['common']);
  req.t = t;

  const journeyData = this.getJourneyData(req);
  const result = ContactDetailsSchema.safeParse(req.body);

  if (!result.success) {
    const errors: Record<string, string> = {};
    const errorList: { text: string; href: string }[] = [];

    for (const error of result.error.errors) {
      const field = error.path[0] as string;
      if (!errors[field]) {
        errors[field] = error.message;
        errorList.push({ text: error.message, href: `#${field}` });
      }
    }

    return res.status(400).render('nest-journey/contact-details.njk', {
      backUrl: this.journeyService.getBackUrl('contact-details'),
      formData: req.body,
      errors,
      errorSummary: { titleText: 'There is a problem', errorList },
    });
  }

  journeyData.contactDetails = result.data;
  this.journeyService.markStepComplete(journeyData, 'contact-details');

  const nextStep = this.journeyService.getNextStep('contact-details');
  res.redirect(303, this.journeyService.getStepUrl(nextStep!));
}
```
**Lines: +58** | **Files touched: 2**

**Step 3: Update Journey Steps Array** (`src/main/nest/journey/nest-journey.service.ts`)
```typescript
export const JOURNEY_STEPS = [
  'step1',
  'step2',
  'contact-details',  // ← Add here (navigation auto-handled)
  'step3',
  'confirmation'
] as const;
```
**Lines: +1** | **Files touched: 2** (same file as step 2)

**Step 4: Create Template** (`src/main/views/nest-journey/contact-details.njk`)
```nunjucks
{% extends "stepsTemplate.njk" %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}

{% block pageTitle %}{{ t('contactDetails:pageTitle', 'Your contact details') }}{% endblock %}

{% block mainContent %}
  {% if errorSummary %}
    {{ govukErrorSummary(errorSummary) }}
  {% endif %}

  <h1 class="govuk-heading-l">{{ t('contactDetails:heading', 'Your contact details') }}</h1>

  <form method="post" novalidate>
    {{ govukInput({
      name: "email",
      id: "email",
      type: "email",
      label: { text: t('contactDetails:fields.email.label', 'Email address') },
      hint: { text: t('contactDetails:fields.email.hint', 'We will use this to send you updates') },
      errorMessage: { text: errors.email } if errors.email else null,
      value: formData.email
    }) }}

    {{ govukInput({
      name: "phone",
      id: "phone",
      type: "tel",
      label: { text: t('contactDetails:fields.phone.label', 'Phone number') },
      errorMessage: { text: errors.phone } if errors.phone else null,
      value: formData.phone
    }) }}

    {{ govukButton({ text: t('contactDetails:buttons.continue', 'Continue') }) }}
  </form>
{% endblock %}
```
**Lines: 37** | **Files touched: 3**

**Step 5: Create Locale File** (`src/main/assets/locales/en/nestJourney/contactDetails.json`)
```json
{
  "pageTitle": "Your contact details - Nest Journey",
  "heading": "Your contact details",
  "fields": {
    "email": {
      "label": "Email address",
      "hint": "We'll use this to send you updates"
    },
    "phone": {
      "label": "Phone number"
    }
  },
  "buttons": {
    "continue": "Continue"
  }
}
```
**Lines: 16** | **Files touched: 4** (optional - template has fallbacks)

**Total NestJS Effort:**
- **Files created:** 3 (DTO, template, locale)
- **Files modified:** 1 (controller - add 2 methods + 1 array entry)
- **Total lines:** ~126 lines (but 58 are in existing controller file)
- **Configuration complexity:** Low (just add to array)

---

### Comparison Summary

| Aspect | Express | NestJS |
|--------|---------|--------|
| **Files to create** | 3 | 3 |
| **Files to modify** | 2 (registry + flow) | 1 (controller) |
| **Configuration files** | 2 separate files | 1 array in service |
| **Navigation setup** | Manual (defaultNext + dependencies) | Automatic (array order) |
| **Validation location** | Shared helpers (424 lines) | Per-step DTO (~15 lines) |
| **Error handling** | Shared controller factory | Explicit in route handler |
| **Type safety** | ⚠️ Partial | ✅ Full (Zod inference) |
| **Testability** | ❌ Hard (mock req/res) | ✅ Easy (DI + service) |
| **Lines of new code** | ~96 | ~67 (+ 58 in existing file) |
| **Cognitive load** | High (5 files, 2 configs) | Medium (4 files, 1 array) |

### Text Duplication Analysis

#### Express Text Locations (2 places)
1. **Template**: `t('fields.email.label')`
2. **Locale file**: `"fields": { "email": { "label": "Email address" } }`

#### NestJS Text Locations (2 places - **Optimized**)
1. **Template fallback**: `t('contactDetails:fields.email.label', 'Email address')`
2. **Locale file**: `"fields": { "email": { "label": "Email address" } }`

**Resolution:** The `stepXFields` exports have been **removed from all DTOs** as they were unused by templates. DTOs now contain only:

```typescript
// ✅ Validation schema only:
export const Step3Schema = z.object({
  fullName: z.string().min(1, 'Enter your full name'),
  email: z.string().email('Enter a valid email address'),
  phoneNumber: z.string().optional(),
});

export type Step3Dto = z.infer<typeof Step3Schema>;
```

**Result:** NestJS now has **identical text duplication to Express** (template + locale only), eliminating the triple duplication issue.

---

## Internationalisation (i18n) Comparison

### Express Journey i18n

```
src/main/assets/locales/
├── en/
│   └── respondToClaim/
│       ├── startNow.json
│       ├── postcodeFinder.json
│       └── freeLegalAdvice.json
└── cy/
    └── respondToClaim/
        ├── startNow.json          # cy prefix (no hyphen)
        ├── postcodeFinder.json
        └── freeLegalAdvice.json
```

**Express Template Usage:**
```nunjucks
{# Loaded via controller's translation namespace #}
<h1>{{ t('title') }}</h1>
<p>{{ t('description') }}</p>
```

**Issues:**
- ❌ Translation namespace loaded in controller factory
- ❌ Requires `getController()` to specify namespace
- ❌ Translation keys not obvious in template

### NestJS Journey i18n

```
src/main/assets/locales/
├── en/
│   └── nestJourney/
│       ├── step1.json
│       ├── step2.json
│       ├── step3.json
│       └── confirmation.json
└── cy/
    └── nestJourney/
        ├── step1.json             # cy- prefix (with hyphen)
        ├── step2.json
        ├── step3.json
        └── confirmation.json
```

**NestJS Template Usage:**
```nunjucks
{# Explicit namespace with fallback default #}
<h1>{{ t('nestJourney/step1:heading', 'Make a decision') }}</h1>
<p>{{ t('nestJourney/step1:description', 'This is the first step...') }}</p>

{# Nested keys #}
{{ t('nestJourney/step1:buttons.continue', 'Continue') }}
```

**Benefits:**
- ✅ Explicit namespace in template - clear which file to edit
- ✅ Fallback defaults - works even if translation missing
- ✅ No controller configuration needed
- ✅ Self-documenting templates

### Welsh Language Placeholders

Both approaches use placeholder text for Welsh until client provides translations:

| Approach | Express | NestJS |
|----------|---------|--------|
| **Prefix style** | `cy` (no hyphen) | `cy-` (with hyphen) |
| **Example** | `"cyMake a decision"` | `"cy-Make a decision"` |
| **Rationale** | Legacy pattern | Clearer visual distinction |

### i18n Comparison Table

| Aspect | Express Journey | NestJS Journey |
|--------|-----------------|----------------|
| **Locale location** | `locales/en/respondToClaim/` | `locales/en/nestJourney/` |
| **Namespace in template** | ❌ Implicit | ✅ Explicit with fallback |
| **Controller config** | ❌ Required | ✅ Not needed |
| **Welsh placeholders** | `cy` prefix | `cy-` prefix |
| **Auto-discovery** | ✅ Yes | ✅ Yes |
| **Language switching** | ✅ `?lang=cy` | ✅ `?lang=cy` |

---

## Recommendation

### For New Journeys: Use NestJS Pattern

The NestJS journey pattern provides:

1. **Fewer files** - 33% reduction in file count
2. **Better testability** - 26 unit tests with easy mocking
3. **Type-safe validation** - Zod schemas with inference
4. **Clearer structure** - All step logic in one controller
5. **Simpler navigation** - Service handles all flow logic

### For Existing Journeys: Keep Express Pattern

Migrating existing journeys would:

1. Require significant refactoring effort
2. Risk introducing bugs in working code
3. Provide limited benefit for stable features

### Migration Strategy

| Journey Status | Recommendation |
|----------------|----------------|
| New journey | ✅ Use NestJS |
| Existing, stable | ❌ Keep Express |
| Existing, needs refactor | ⚠️ Consider NestJS |
| Bug fix only | ❌ Keep Express |

---

## Appendix: Full File Comparison

### Express Journey Files (respond-to-claim)

| File | Lines | Purpose |
|------|-------|---------|
| `flow.config.ts` | 21 | Flow configuration |
| `stepRegistry.ts` | 12 | Step registry |
| `start-now/index.ts` | 42 | Step definition |
| `postcode-finder/index.ts` | 41 | Step definition |
| `free-legal-advice/index.ts` | 41 | Step definition |
| `modules/steps/flow.ts` | 161 | Navigation helpers |
| `modules/steps/controller.ts` | 161 | Controller factory |
| `modules/steps/formBuilder/helpers.ts` | 424 | Validation |
| **Total** | **~900** | |

### NestJS Journey Files (nest-journey)

| File | Lines | Purpose |
|------|-------|---------|
| `nest-journey.module.ts` | 11 | Module definition |
| `nest-journey.controller.ts` | 227 | All routes |
| `nest-journey.service.ts` | 81 | Navigation logic |
| `dto/step1.dto.ts` | 28 | Validation |
| `dto/step2.dto.ts` | 30 | Validation |
| `dto/step3.dto.ts` | 62 | Validation |
| `locales/en/nestJourney/*.json` | ~120 | English translations (4 files) |
| `locales/cy/nestJourney/*.json` | ~120 | Welsh translations (4 files) |
| **Total** | **~680** | **Including i18n** |

---

*Document comparing implementations on feature/HDPI-3810-nestjs-spike branch*
