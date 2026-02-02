# Respond to Claim Journey: Express vs. NestJS Case Study

## Executive Summary

This document provides a detailed comparison between the current Express implementation and the new NestJS implementation of the "Respond to Claim" journey. It demonstrates how NestJS's architectural guardrails improve code maintainability, readability, and sustainability.

**Journey:** Respond to Claim (3-step journey)
- Step 1: Start Now
- Step 2: Postcode Finder
- Step 3: Free Legal Advice

**URLs:** Both implementations use identical routes:
- `/respond-to-claim/start-now`
- `/respond-to-claim/postcode-finder`
- `/respond-to-claim/free-legal-advice`

---

## File Structure Comparison

### Express Implementation (Current)

```
src/main/steps/respond-to-claim/
├── flow.config.ts                    # Journey configuration (21 lines)
├── stepRegistry.ts                   # Manual step registration (12 lines)
├── free-legal-advice/
│   ├── index.ts                      # Step definition + controllers (41 lines)
│   └── freeLegalAdvice.njk           # Template (7 lines)
├── postcode-finder/
│   ├── index.ts                      # Step definition + controllers (41 lines)
│   └── postcodeFinder.njk            # Template
└── start-now/
    ├── index.ts                      # Step definition + controllers (42 lines)
    └── startNow.njk                  # Template (91 lines)

Total: 7 folders, 10 files, scattered organization
```

**Problems:**
- ❌ Each step requires a new folder
- ❌ Templates co-located with controllers (mixed concerns)
- ❌ Manual registration in `stepRegistry.ts`
- ❌ Duplicated boilerplate in every `index.ts`
- ❌ Hard to see the full journey flow at a glance

---

### NestJS Implementation (New)

```
src/main/nest/respond-to-claim/
├── respond-to-claim.module.ts           # Module definition (16 lines)
├── respond-to-claim.controller.ts       # All routes (105 lines)
├── respond-to-claim.service.ts          # Navigation logic (35 lines)
├── respond-to-claim-session.service.ts  # Session management (40 lines)
├── validation.service.ts                # Error formatting (30 lines)
└── dto/
    ├── start-now.dto.ts                 # Type-safe schema (7 lines)
    ├── postcode-finder.dto.ts           # Type-safe schema (14 lines)
    └── free-legal-advice.dto.ts         # Type-safe schema (7 lines)

src/main/views/respond-to-claim/         # Templates (centralized)
├── start-now.njk
├── postcode-finder.njk
└── free-legal-advice.njk

Total: 2 folders, 11 files, organized by concern
```

**Benefits:**
- ✅ Single controller file for entire journey
- ✅ Clear separation: controllers, services, DTOs, views
- ✅ Automatic registration via module system
- ✅ No boilerplate duplication
- ✅ Easy to understand the full journey flow

---

## Code Comparison: Single Step Implementation

### Express: Free Legal Advice Step

**File:** `src/main/steps/respond-to-claim/free-legal-advice/index.ts`

```typescript
import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

const stepName = 'free-legal-advice';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/free-legal-advice`,
  name: stepName,
  view: 'respond-to-claim/free-legal-advice/freeLegalAdvice.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/free-legal-advice/freeLegalAdvice.njk',
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
      // Get next step URL and redirect
      const redirectPath = stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        // No next step defined - show not found page
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
```

**Issues:**
1. ❌ **No validation** - `req.body` used directly without type checking
2. ❌ **Factory pattern complexity** - `createGetController` hides implementation
3. ❌ **Hardcoded paths** - Template path repeated twice
4. ❌ **No type safety** - `req.body` is `any`
5. ❌ **Boilerplate** - Same pattern repeated in every step
6. ❌ **Manual registration** - Must add to `stepRegistry.ts`

---

### NestJS: Free Legal Advice Step

**File:** `src/main/nest/respond-to-claim/respond-to-claim.controller.ts` (excerpt)

```typescript
@Controller('respond-to-claim')
@UseGuards(OidcGuard)
export class RespondToClaimController {
  constructor(
    private readonly respondToClaimService: RespondToClaimService,
    private readonly sessionService: RespondToClaimSessionService,
    private readonly validationService: RespondToClaimValidationService
  ) {}

  // ============================================
  // STEP 3: Free Legal Advice
  // ============================================

  @Get('free-legal-advice')
  @Render('respond-to-claim/free-legal-advice.njk')
  getFreeLegalAdvice(@Req() req: Request): StepViewData {
    return {
      backUrl: this.respondToClaimService.getPreviousStep('free-legal-advice'),
      t: req.t,
    };
  }

  @Post('free-legal-advice')
  postFreeLegalAdvice(@Res() res: Response): void {
    const nextUrl = this.respondToClaimService.getNextStep('free-legal-advice');
    res.redirect(303, nextUrl || '/dashboard');
  }
}
```

**Benefits:**
1. ✅ **Declarative routing** - `@Get()` and `@Post()` decorators are self-documenting
2. ✅ **Dependency injection** - Services automatically provided
3. ✅ **Type safety** - Return type enforced with `StepViewData`
4. ✅ **No boilerplate** - Clean, minimal code
5. ✅ **Automatic registration** - Module system handles wiring
6. ✅ **Testable** - Easy to mock services

---

## Validation Comparison: Postcode Finder Step

### Express: No Validation

```typescript
postController: {
  post: async (req: Request, res: Response) => {
    // ❌ req.body could be anything - no validation!
    // ❌ No type checking
    // ❌ No error handling for invalid data
    const redirectPath = stepNavigation.getNextStepUrl(req, stepName, req.body);

    if (!redirectPath) {
      return res.status(404).render('not-found');
    }

    res.redirect(303, redirectPath);
  },
},
```

**Problems:**
- ❌ No validation of postcode format
- ❌ No type safety
- ❌ No standardized error messages
- ❌ Easy to forget validation

---

### NestJS: Enforced Validation with Zod

**DTO Schema:** `src/main/nest/respond-to-claim/dto/postcode-finder.dto.ts`

```typescript
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
```

**Controller with Validation:**

```typescript
@Post('postcode-finder')
postPostcodeFinder(@Req() req: Request, @Res() res: Response): void {
  // ✅ Validation required before processing
  const result = PostcodeFinderSchema.safeParse(req.body);

  if (!result.success) {
    // ✅ Standardized error handling
    const { errors, errorSummary } = this.validationService.formatZodErrors(result.error);

    res.render('respond-to-claim/postcode-finder.njk', {
      backUrl: this.respondToClaimService.getPreviousStep('postcode-finder'),
      postcode: req.body.postcode || '',
      errors,
      errorSummary,
      t: req.t,
    });
    return;
  }

  // ✅ Type-safe data - guaranteed to match schema
  this.sessionService.saveStepData(req, 'postcodeFinder', result.data);

  const nextUrl = this.respondToClaimService.getNextStep('postcode-finder');
  res.redirect(303, nextUrl || '/dashboard');
}
```

**Benefits:**
- ✅ Enforced validation with clear error messages
- ✅ Type-safe data after validation
- ✅ Centralized error formatting
- ✅ Impossible to forget validation

---

## Service Layer Comparison

### Express: Inline Navigation Logic

```typescript
// Navigation logic mixed with controller
const stepNavigation = createStepNavigation(flowConfig);

postController: {
  post: async (req: Request, res: Response) => {
    const redirectPath = stepNavigation.getNextStepUrl(req, stepName, req.body);
    // ...
  },
},
```

**Problems:**
- ❌ Navigation logic not reusable
- ❌ Hard to test independently
- ❌ Mixed concerns (routing + navigation)

---

### NestJS: Dedicated Service Layer

**Navigation Service:** `src/main/nest/respond-to-claim/respond-to-claim.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class RespondToClaimService {
  private readonly stepOrder = ['start-now', 'postcode-finder', 'free-legal-advice'];

  getNextStep(currentStep: string): string | null {
    const currentIndex = this.stepOrder.indexOf(currentStep);

    if (currentIndex === -1 || currentIndex === this.stepOrder.length - 1) {
      return null;
    }

    const nextStep = this.stepOrder[currentIndex + 1];
    return `/respond-to-claim/${nextStep}`;
  }

  getPreviousStep(currentStep: string): string | null {
    const currentIndex = this.stepOrder.indexOf(currentStep);

    if (currentIndex <= 0) {
      return '/dashboard';
    }

    const previousStep = this.stepOrder[currentIndex - 1];
    return `/respond-to-claim/${previousStep}`;
  }

  getStepOrder(): string[] {
    return [...this.stepOrder];
  }

  isValidStep(stepName: string): boolean {
    return this.stepOrder.includes(stepName);
  }
}
```

**Session Service:** `src/main/nest/respond-to-claim/respond-to-claim-session.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import type { Request } from 'express';

export interface RespondToClaimSession {
  startNow?: Record<string, unknown>;
  postcodeFinder?: { postcode?: string };
  freeLegalAdvice?: Record<string, unknown>;
}

@Injectable()
export class RespondToClaimSessionService {
  getSessionData(req: Request): RespondToClaimSession {
    const session = req.session as unknown as Record<string, unknown>;
    return (session.respondToClaim as RespondToClaimSession) || {};
  }

  getStepData<K extends keyof RespondToClaimSession>(
    req: Request,
    step: K
  ): RespondToClaimSession[K] | undefined {
    return this.getSessionData(req)[step];
  }

  saveStepData<K extends keyof RespondToClaimSession>(
    req: Request,
    step: K,
    data: RespondToClaimSession[K]
  ): void {
    const session = req.session as unknown as Record<string, unknown>;
    if (!session.respondToClaim) {
      session.respondToClaim = {};
    }
    (session.respondToClaim as RespondToClaimSession)[step] = data;
  }

  clearSession(req: Request): void {
    const session = req.session as unknown as Record<string, unknown>;
    delete session.respondToClaim;
  }
}
```

**Benefits:**
- ✅ Clear separation of concerns
- ✅ Reusable across controllers
- ✅ Easy to test in isolation
- ✅ Type-safe session management
- ✅ Single source of truth for navigation logic

---

## Testing Comparison

### Express: Complex Test Setup

```typescript
describe('Free Legal Advice Step', () => {
  it('should redirect to next step', async () => {
    // ❌ Manual mocking of factory functions
    const mockCreateGetController = jest.fn();
    const mockCreateStepNavigation = jest.fn();
    
    // ❌ Complex setup to test controller
    const req = {
      body: {},
      session: {},
    } as Request;
    
    const res = {
      redirect: jest.fn(),
      render: jest.fn(),
    } as unknown as Response;
    
    // ❌ Must manually call controller function
    await step.postController.post(req, res);
    
    expect(res.redirect).toHaveBeenCalled();
  });
});
```

---

### NestJS: Simple Test Setup

```typescript
describe('RespondToClaimController', () => {
  let controller: RespondToClaimController;
  let service: RespondToClaimService;

  beforeEach(async () => {
    // ✅ Simple module creation
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RespondToClaimController],
      providers: [
        {
          provide: RespondToClaimService,
          useValue: {
            getNextStep: jest.fn().mockReturnValue('/respond-to-claim/postcode-finder'),
            getPreviousStep: jest.fn().mockReturnValue('/respond-to-claim/start-now'),
          },
        },
        {
          provide: RespondToClaimSessionService,
          useValue: {
            getStepData: jest.fn(),
            saveStepData: jest.fn(),
          },
        },
        {
          provide: RespondToClaimValidationService,
          useValue: {
            formatZodErrors: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RespondToClaimController>(RespondToClaimController);
    service = module.get<RespondToClaimService>(RespondToClaimService);
  });

  it('should redirect to next step', () => {
    // ✅ Clean test with mocked services
    const res = {
      redirect: jest.fn(),
    } as unknown as Response;

    controller.postFreeLegalAdvice(res);

    expect(service.getNextStep).toHaveBeenCalledWith('free-legal-advice');
    expect(res.redirect).toHaveBeenCalledWith(303, '/respond-to-claim/postcode-finder');
  });
});
```

**Benefits:**
- ✅ Built-in testing utilities
- ✅ Automatic dependency mocking
- ✅ Clean, readable tests
- ✅ Easy to test services independently

---

## Template Location Strategy

### Express: Co-located Templates

```
src/main/steps/respond-to-claim/
├── free-legal-advice/
│   ├── index.ts
│   └── freeLegalAdvice.njk    # ← Template next to controller
```

**Rationale:** Each step is self-contained.

---

### NestJS: Centralized Templates

```
src/main/views/respond-to-claim/
├── start-now.njk
├── postcode-finder.njk
└── free-legal-advice.njk      # ← Templates centralized
```

**Why This is Better:**

1. **Nunjucks Configuration** - Nunjucks is configured to look in `src/main/views/` for templates. Centralized location ensures consistent path resolution.

2. **MVC Separation** - Templates (View) are separate from Controllers and Services, following proper MVC pattern.

3. **Shared Templates** - Common templates like `stepsTemplate.njk`, `layout.njk` are already in `views/`. Keeping journey templates here maintains consistency.

4. **Build Process** - The build process copies `views/` to the dist folder. Templates in `nest/` would need additional configuration.

5. **Designer/Developer Workflow** - Frontend designers can work in `views/` without touching TypeScript code in `nest/`.

6. **Coexistence** - During migration, both Express and NestJS can use the same templates from `views/`, avoiding duplication.

---

## Key Differences Summary

| Aspect | Express (Current) | NestJS (New) |
|--------|-------------------|--------------|
| **File Organization** | 1 folder per step (scattered) | 1 module per journey (organized) |
| **Lines of Code** | ~157 lines across 7 files | ~254 lines across 8 files (but more maintainable) |
| **Route Definition** | Factory functions | Declarative decorators |
| **Validation** | None / manual | Zod DTOs with type inference |
| **Session Management** | Inline in controller | Dedicated service |
| **Navigation Logic** | `createStepNavigation()` | Injectable service |
| **Error Handling** | Manual in each step | Centralized validation service |
| **Dependencies** | Direct imports | Constructor injection |
| **Testing** | Complex mocking | Simple service mocking |
| **Type Safety** | Partial | Full with DTOs |
| **Code Duplication** | High (same pattern repeated) | Low (services reused) |
| **Readability** | Factory pattern hides logic | Clear, declarative code |
| **Maintainability** | Hard to change (scattered) | Easy to change (centralized) |

---

## NestJS Guardrails Not Present in Express

### 1. Enforced Validation

**Express:** Validation is optional and easy to forget.

**NestJS:** Zod schemas enforce validation at compile-time and runtime.

---

### 2. Enforced Separation of Concerns

**Express:** Business logic can be mixed with routing logic.

**NestJS:** Services handle business logic, controllers handle HTTP only.

---

### 3. Enforced Module Boundaries

**Express:** Manual registration in `stepRegistry.ts` - easy to forget.

**NestJS:** Module system automatically wires dependencies.

---

### 4. Enforced Type Safety

**Express:** `req.body` is `any` - no type checking.

**NestJS:** DTOs provide compile-time and runtime type checking.

---

### 5. Enforced Testing Patterns

**Express:** No built-in testing utilities - complex setup required.

**NestJS:** `Test.createTestingModule()` provides automatic mocking.

---

## Migration Path

Both implementations can coexist because:

1. **Same URLs** - Both use `/respond-to-claim/*` routes
2. **ExpressAdapter** - NestJS runs on top of Express
3. **Shared Templates** - Both use templates from `src/main/views/`
4. **Gradual Cutover** - Can switch routes one at a time

**To enable NestJS routes:**

```typescript
// src/main/nest/app.module.ts
import { RespondToClaimModule } from './respond-to-claim/respond-to-claim.module';

@Module({
  imports: [
    // ... other modules
    RespondToClaimModule, // ← Add this line
  ],
})
export class AppModule {}
```

---

## Conclusion

### Express Pain Points:
- ❌ Each step requires a new folder with boilerplate
- ❌ No enforced validation - easy to forget
- ❌ Factory functions hide complexity
- ❌ Manual registration in multiple files
- ❌ Testing requires complex setup
- ❌ No type safety for request data
- ❌ Hard to see the full journey flow

### NestJS Benefits:
- ✅ Single controller file for entire journey
- ✅ Enforced validation with DTOs
- ✅ Clear, declarative routing
- ✅ Automatic module registration
- ✅ Simple testing with DI mocking
- ✅ Full type safety throughout
- ✅ Easy to understand and maintain

**Bottom Line:** NestJS provides **architectural guardrails** that make the right way the easy way, while Express requires **developer discipline** to maintain consistency across a growing codebase.

**Recommendation:** Migrate all multi-step journeys to NestJS to improve long-term maintainability and reduce technical debt.

---

## Related Documentation

- [NestJS Journey Implementation Guide](./NESTJS_JOURNEY_IMPLEMENTATION_GUIDE.md)
- [NestJS Dependency Injection Guide](./NESTJS_DEPENDENCY_INJECTION_GUIDE.md)
- [Hybrid File Structure](./HYBRID_FILE_STRUCTURE.md)
- [Frontend Architecture Diagrams](./FRONTEND_ARCHITECTURE_DIAGRAMS.md)
