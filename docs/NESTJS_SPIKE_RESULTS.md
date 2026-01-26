# NestJS Migration Spike Results
## Implementation Assessment & Comparison

**Prepared for:** Senior Development Team  
**Date:** January 22, 2026  
**Objective:** Evaluate completed NestJS spike implementation vs Express-only approach

---

## Executive Summary

We have implemented a working NestJS integration that runs alongside the existing Express application, demonstrating both API endpoints and a complete user journey.

**Key Deliverables:**
- ✅ NestJS running under Express adapter (hybrid architecture)
- ✅ `/api/postcode-lookup-nest` API endpoint with Zod validation
- ✅ Complete 3-page user journey (`/nest-journey/*`)
- ✅ Unit tests using NestJS testing utilities (41 tests passing)
- ✅ No impact on existing Express routes
- ✅ Documentation and migration guides

---

## Table of Contents

1. [What Was Implemented](#what-was-implemented)
2. [Architecture Comparison](#architecture-comparison)
3. [Code Comparison: Express vs NestJS](#code-comparison-express-vs-nestjs)
4. [Testing Comparison](#testing-comparison)
5. [Pros & Cons Assessment](#pros--cons-assessment)
6. [Journey Implementation Comparison](#journey-implementation-comparison)
7. [Recommendations](#recommendations)

---

## What Was Implemented

### File Structure

```
src/main/nest/
├── index.ts                    # NestJS bootstrap with Express adapter
├── app.module.ts               # Root module
├── guards/
│   └── oidc.guard.ts           # OIDC authentication guard
├── postcode/
│   ├── postcode.module.ts      # Feature module
│   ├── postcode.controller.ts  # HTTP layer
│   ├── postcode.service.ts     # Business logic
│   └── dto/
│       └── postcode-lookup.dto.ts  # Zod validation schema
└── journey/
    ├── nest-journey.module.ts  # Journey feature module
    ├── nest-journey.controller.ts  # Journey HTTP handlers
    ├── nest-journey.service.ts # Journey navigation logic
    └── dto/
        ├── step1.dto.ts        # Zod validation schema only
        ├── step2.dto.ts        # Zod validation schema only
        └── step3.dto.ts        # Zod validation schema only

src/main/views/nest-journey/
├── step1.njk                   # Radio buttons page
├── step2.njk                   # Textarea page
├── step3.njk                   # Multiple inputs page
└── confirmation.njk            # Summary page

src/main/assets/locales/en/nestJourney/
├── step1.json                  # English translations for step 1
├── step2.json                  # English translations for step 2
├── step3.json                  # English translations for step 3
└── confirmation.json           # English translations for confirmation

src/main/assets/locales/cy/nestJourney/
├── step1.json                  # Welsh translations for step 1 (cy- prefixed placeholders)
├── step2.json                  # Welsh translations for step 2 (cy- prefixed placeholders)
├── step3.json                  # Welsh translations for step 3 (cy- prefixed placeholders)
└── confirmation.json           # Welsh translations for confirmation (cy- prefixed placeholders)
```

### Dependencies Added

```json
{
  "dependencies": {
    "@nestjs/common": "^11.1.12",
    "@nestjs/core": "^11.1.12",
    "@nestjs/platform-express": "^11.1.12",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/testing": "^11.1.12"
  }
}
```

### Configuration Changes

```json
// tsconfig.json additions
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

---

## Architecture Comparison

### Before: Express-Only Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Express App (Port 3209)                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Routes Layer                      │   │
│  │  • /dashboard/* (Nunjucks SSR)                      │   │
│  │  • /respond-to-claim/* (Journey flows)              │   │
│  │  • /api/postcode-lookup (API endpoint)              │   │
│  │  • OIDC auth, sessions, i18n                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Services Layer                      │   │
│  │  • Global singletons (no DI)                        │   │
│  │  • Manual dependency management                      │   │
│  │  • Validation scattered across routes               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### After: Hybrid Express + NestJS Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Express App (Port 3209)                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Existing Express Routes                 │   │
│  │  • /dashboard/* (Nunjucks SSR)                      │   │
│  │  • /respond-to-claim/* (Journey flows)              │   │
│  │  • /api/postcode-lookup (Legacy API)                │   │
│  │  • OIDC auth, sessions, i18n                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              NestJS Routes (New)                     │   │
│  │  • /api/postcode-lookup-nest (API with DI)          │   │
│  │  • /nest-journey/* (Journey with validation)        │   │
│  │  • Decorator-based routing                          │   │
│  │  • Zod schema validation                            │   │
│  │  • Dependency injection                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Shared Infrastructure                   │   │
│  │  • Express session middleware                       │   │
│  │  • OIDC authentication                              │   │
│  │  • Nunjucks templates                               │   │
│  │  • GOV.UK Design System                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Code Comparison: Express vs NestJS

### API Endpoint Comparison

#### Express Implementation (Current)

```typescript
// src/main/routes/postcodeLookup.ts
import { Application, Request, Response } from 'express';
import { oidcMiddleware } from '../middleware';
import { getAddressesByPostcode } from '../services/osPostcodeLookupService';

export default function postcodeLookupRoutes(app: Application): void {
  app.get('/api/postcode-lookup', oidcMiddleware, async (req: Request, res: Response) => {
    // ❌ Manual parameter extraction
    const raw = req.query.postcode;
    let postcode = '';
    if (typeof raw === 'string') {
      postcode = raw.trim();
    } else if (Array.isArray(raw) && typeof raw[0] === 'string') {
      postcode = raw[0].trim();
    }
    
    // ❌ Manual validation
    if (!postcode) {
      return res.status(400).json({ error: 'Missing postcode' });
    }

    try {
      // ❌ Direct service call (no DI)
      const addresses = await getAddressesByPostcode(postcode);
      return res.json({ addresses });
    } catch {
      // ❌ Manual error handling
      return res.status(502).json({ error: 'Failed to lookup postcode' });
    }
  });
}
```

**Issues:**
- ❌ Validation logic mixed with route handler
- ❌ No dependency injection - hard to test
- ❌ Manual error handling
- ❌ No type safety for request/response
- ❌ Business logic in route file

#### NestJS Implementation (New)

```typescript
// src/main/nest/postcode/postcode.controller.ts
@Controller('api')
@UseGuards(OidcGuard)
export class PostcodeController {
  // ✅ Dependency injection
  constructor(private readonly postcodeService: PostcodeService) {}

  @Get('postcode-lookup-nest')
  async lookup(@Query() query: Record<string, unknown>): Promise<{ addresses: unknown[] }> {
    // ✅ Declarative validation with Zod
    const result = PostcodeLookupSchema.safeParse(query);

    if (!result.success) {
      const errorMessage = result.error.errors[0]?.message || 'Invalid postcode';
      throw new BadRequestException({ error: errorMessage });
    }

    // ✅ Type-safe DTO
    const dto: PostcodeLookupDto = result.data;
    
    // ✅ Service handles business logic
    const addresses = await this.postcodeService.getAddressesByPostcode(dto.postcode);
    return { addresses };
  }
}

// src/main/nest/postcode/dto/postcode-lookup.dto.ts
export const PostcodeLookupSchema = z.object({
  postcode: z
    .string({ required_error: 'Postcode is required' })
    .transform(val => val.trim())
    .refine(val => val.length > 0, { message: 'Postcode is required' }),
});

export type PostcodeLookupDto = z.infer<typeof PostcodeLookupSchema>;
```

**Benefits:**
- ✅ Clear separation of concerns
- ✅ Dependency injection for testability
- ✅ Declarative validation with Zod schemas
- ✅ Type-safe DTOs with inferred types
- ✅ Automatic error responses via exceptions

---

### Service Layer Comparison

#### Express Service (Current)

```typescript
// src/main/services/osPostcodeLookupService.ts
import axios from 'axios';
import config from 'config';

// ❌ Global functions - no DI
function getBaseUrl(): string {
  return config.get('osPostcodeLookup.url');
}

function getToken(): string {
  return config.get('secrets.pcs.pcs-os-client-lookup-key');
}

// ❌ Exported function - hard to mock
export const getAddressesByPostcode = async (postcode: string): Promise<Address[]> => {
  const url = `${getBaseUrl()}/postcode?postcode=${encodeURIComponent(postcode)}&key=${getToken()}`;
  
  try {
    const response = await axios.get<OSResponse>(url);
    // ... mapping logic
  } catch {
    throw new Error('OS API error');
  }
};
```

#### NestJS Service (New)

```typescript
// src/main/nest/postcode/postcode.service.ts
@Injectable()
export class PostcodeService {
  private readonly logger = Logger.getLogger('PostcodeService');

  // ✅ Easy to mock in tests
  async getAddressesByPostcode(postcode: string): Promise<Address[]> {
    const url = `${this.getBaseUrl()}/postcode?postcode=${encodeURIComponent(postcode)}&key=${this.getToken()}`;
    this.logger.info(`Calling getAddressesByPostcode for postcode: ${postcode}`);

    try {
      const response = await axios.get<OSResponse>(url);
      return this.mapResponse(response.data);
    } catch (error) {
      this.logger.error('Error fetching addresses from OS Places API');
      throw new Error('OS API error');
    }
  }

  // ✅ Private methods for internal logic
  private mapResponse(data: OSResponse): Address[] {
    // ... mapping logic
  }
}
```

---

## Testing Comparison

### Express Testing (Current Approach)

```typescript
// Testing Express routes requires mocking req/res objects
describe('postcodeLookup route', () => {
  it('should return addresses', async () => {
    // ❌ Complex setup required
    const mockReq = {
      query: { postcode: 'SW1A 1AA' },
      // ... many more properties
    };
    const mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    
    // ❌ Hard to mock the service
    jest.mock('../services/osPostcodeLookupService');
    
    // ❌ Testing implementation details
    await handler(mockReq, mockRes);
    expect(mockRes.json).toHaveBeenCalled();
  });
});
```

### NestJS Testing (New Approach)

```typescript
// src/test/unit/nest/postcode/postcode.controller.spec.ts
describe('PostcodeController', () => {
  let controller: PostcodeController;
  let postcodeService: PostcodeService;

  beforeEach(async () => {
    // ✅ Clean module setup
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostcodeController],
      providers: [
        {
          provide: PostcodeService,
          useValue: { getAddressesByPostcode: jest.fn() },
        },
      ],
    })
      .overrideGuard(OidcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PostcodeController>(PostcodeController);
    postcodeService = module.get<PostcodeService>(PostcodeService);
  });

  it('should return addresses for valid postcode', async () => {
    // ✅ Easy to mock service
    const mockAddresses = [{ fullAddress: '10 Downing Street' }];
    jest.spyOn(postcodeService, 'getAddressesByPostcode').mockResolvedValue(mockAddresses);

    // ✅ Test the actual controller method
    const result = await controller.lookup({ postcode: 'SW1A 2AA' });
    
    expect(result).toEqual({ addresses: mockAddresses });
  });

  it('should throw BadRequestException for missing postcode', async () => {
    // ✅ Clean assertion
    await expect(controller.lookup({})).rejects.toThrow(BadRequestException);
  });
});
```

### Test Results

| Test Suite | Tests | Status |
|------------|-------|--------|
| `postcode.controller.spec.ts` | 8 | ✅ Passing |
| `postcode.service.spec.ts` | 7 | ✅ Passing |
| `nest-journey.service.spec.ts` | 26 | ✅ Passing |
| **Total** | **41** | ✅ **All Passing** |

---

## Pros & Cons Assessment

### NestJS Implementation

| Aspect | Assessment | Details |
|--------|------------|---------|
| **Structure** | ✅ Excellent | Clear module boundaries, enforced patterns |
| **Dependency Injection** | ✅ Excellent | Constructor injection, easy mocking |
| **Validation** | ✅ Excellent | Zod schemas with type inference |
| **Testing** | ✅ Excellent | Built-in testing utilities, 41 tests passing |
| **Type Safety** | ✅ Excellent | Full type safety with DTOs |
| **Learning Curve** | ⚠️ Moderate | Decorators, DI concepts to learn |
| **Bundle Size** | ⚠️ Moderate | +5 dependencies added |
| **Compatibility** | ✅ Good | Works alongside Express |
| **GOV.UK Integration** | ✅ Good | Nunjucks templates work seamlessly |

### Express-Only Implementation

| Aspect | Assessment | Details |
|--------|------------|---------|
| **Structure** | ❌ Poor | No enforced patterns, inconsistent |
| **Dependency Injection** | ❌ None | Global singletons, hard to test |
| **Validation** | ⚠️ Manual | Scattered validation logic |
| **Testing** | ⚠️ Difficult | Requires mocking req/res objects |
| **Type Safety** | ⚠️ Partial | No DTOs, manual typing |
| **Learning Curve** | ✅ Low | Team already familiar |
| **Bundle Size** | ✅ Minimal | No additional dependencies |
| **Compatibility** | ✅ Native | No adapter needed |
| **GOV.UK Integration** | ✅ Good | Direct template rendering |

---

## Summary Comparison Table

| Feature | Express-Only | NestJS Hybrid |
|---------|--------------|---------------|
| **Route Definition** | ❌ Callback functions | ✅ Decorator-based `@Get()`, `@Post()` |
| **Validation** | ❌ Manual if/else checks | ✅ Zod schemas with `safeParse()` |
| **Error Handling** | ❌ try/catch in each route | ✅ Throw exceptions, automatic response |
| **Dependency Injection** | ❌ Global imports | ✅ Constructor injection |
| **Testing** | ❌ Mock req/res objects | ✅ Mock services via DI |
| **Type Safety** | ⚠️ Partial (manual) | ✅ Full (DTOs with inference) |
| **Code Organization** | ❌ Flat file structure | ✅ Feature modules |
| **Authentication** | ✅ Middleware | ✅ Guards (same OIDC) |
| **Session Access** | ✅ `req.session` | ✅ `req.session` (same) |
| **Template Rendering** | ✅ `res.render()` | ✅ `@Render()` decorator |

---

## Recommendations

### Recommended Approach: Gradual Hybrid Migration

Based on the spike results, we recommend:

1. **Keep existing Express routes** - No migration of working code
2. **Use NestJS for new features** - All new API endpoints and journeys
3. **Migrate incrementally** - Only when touching existing code for other reasons

### When to Use NestJS

| Use Case | Recommendation |
|----------|----------------|
| New API endpoints | ✅ Use NestJS |
| New user journeys | ✅ Use NestJS |
| Existing working routes | ❌ Keep Express |
| Bug fixes in Express code | ❌ Keep Express |
| Major refactoring | ⚠️ Consider NestJS migration |

### Next Steps

1. **Team Training** - 2-hour workshop on NestJS patterns
2. **Code Review Standards** - Update PR checklist for NestJS code
3. **First Production Feature** - Identify next journey for NestJS implementation
4. **Documentation** - Keep migration guide updated

---

## Internationalisation (i18n) Implementation

### Overview

The NestJS journey fully supports Welsh language translations using the existing i18n infrastructure. Locale files follow the same pattern as Express journeys.

### Locale File Structure

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
        ├── step1.json          # cy- prefixed placeholders
        ├── step2.json          # cy- prefixed placeholders
        ├── step3.json          # cy- prefixed placeholders
        └── confirmation.json   # cy- prefixed placeholders
```

### Welsh Language Placeholders

Welsh translations use `cy-` prefix on English text as placeholders until client provides actual Welsh translations:

```json
// en/nestJourney/step1.json
{
  "heading": "Make a decision",
  "buttons": { "continue": "Continue" }
}

// cy/nestJourney/step1.json
{
  "heading": "cy-Make a decision",
  "buttons": { "continue": "cy-Continue" }
}
```

### Template Usage

Templates use the `t()` function with namespace and fallback defaults:

```nunjucks
{# With namespace prefix and fallback default #}
<h1>{{ t('nestJourney/step1:heading', 'Make a decision') }}</h1>

{# Nested keys #}
{{ t('nestJourney/step1:buttons.continue', 'Continue') }}
```

### Key Differences from Express Journeys

| Aspect | Express Journey | NestJS Journey |
|--------|-----------------|----------------|
| **Locale directory** | `locales/en/respondToClaim/` | `locales/en/nestJourney/` |
| **Namespace format** | `respondToClaim/startNow:key` | `nestJourney/step1:key` |
| **Loading** | Auto-discovered by i18n module | Auto-discovered by i18n module |
| **Welsh placeholders** | `cy` prefix (no hyphen) | `cy-` prefix (with hyphen) |

### Language Switching

Language switching works automatically via the existing i18n middleware:
- Query parameter: `?lang=cy` or `?lang=en`
- Cookie: `lang=cy`
- Session: `req.session.lang`

---

## Appendix: Files Modified/Created

### New Files (NestJS)

| File | Purpose |
|------|---------|
| `src/main/nest/index.ts` | NestJS bootstrap |
| `src/main/nest/app.module.ts` | Root module |
| `src/main/nest/guards/oidc.guard.ts` | Authentication guard |
| `src/main/nest/postcode/*` | Postcode API feature |
| `src/main/nest/journey/*` | Journey feature |
| `src/main/views/nest-journey/*` | Journey templates |
| `src/main/assets/locales/en/nestJourney/*` | English locale files |
| `src/main/assets/locales/cy/nestJourney/*` | Welsh locale files (placeholders) |
| `src/test/unit/nest/**/*` | Unit tests |

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Added NestJS dependencies |
| `tsconfig.json` | Added decorator metadata options |
| `src/main/server.ts` | Added NestJS bootstrap call |
| `src/main/app.ts` | Moved error handlers to server.ts |
| `src/main/views/dashboard.njk` | Added journey link |

---

*Document generated from spike implementation on feature/HDPI-3810-nestjs-spike branch*
