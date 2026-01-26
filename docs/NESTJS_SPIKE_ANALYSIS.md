# NestJS Adoption Spike - Analysis & Migration Plan

> **Ticket Reference**: HDPI-3810  
> **Author**: Spike Investigation  
> **Date**: January 2026  
> **Time-boxed**: 5 days

---

## Executive Summary

This document presents findings from a technical spike evaluating NestJS as an abstraction layer over the existing Express application. The analysis considers the current architecture, identifies benefits and trade-offs, and proposes a phased migration approach that minimises disruption while delivering incremental value.

---

## 1. Current Architecture Assessment

### 1.1 Application Structure

The pcs-frontend currently uses a **pure Express** setup with a custom modular architecture:

```
src/main/
├── app.ts              # Express app initialization
├── server.ts           # HTTP server bootstrap
├── modules/            # Custom module system (enableFor pattern)
│   ├── appinsights/
│   ├── helmet/
│   ├── http/           # Custom Axios-based HTTP client
│   ├── i18n/
│   ├── oidc/
│   ├── s2s/            # Service-to-service auth
│   ├── session/
│   └── ...
├── routes/             # Express route handlers (glob-loaded)
├── services/           # Business logic services
├── middleware/         # Express middleware
└── views/              # Nunjucks templates
```

### 1.2 Current Patterns

| Pattern | Current Implementation |
|---------|----------------------|
| **Module Loading** | Custom `enableFor(app)` pattern with ordered initialization |
| **Route Registration** | Glob pattern scanning (`routes/**/*.ts`) |
| **Dependency Injection** | Manual / `app.locals` for shared state |
| **Validation** | Zod schemas (already in use) |
| **Error Handling** | Custom `setupErrorHandlers` |
| **HTTP Client** | Custom Axios wrapper with S2S token injection |
| **Configuration** | `node-config` library |

### 1.3 Strengths of Current Setup

- ✅ Clear separation of concerns (modules, routes, services)
- ✅ Established patterns for HMCTS integrations (S2S, OIDC, CCD)
- ✅ Working Zod validation infrastructure
- ✅ Comprehensive test coverage tooling (Jest, Playwright, Pact)

### 1.4 Areas for Improvement

- ⚠️ No formal dependency injection - relies on imports and `app.locals`
- ⚠️ Inconsistent service patterns (some classes, some plain functions)
- ⚠️ Route handlers mix concerns (validation, business logic, response formatting)
- ⚠️ Testing requires manual mocking of dependencies
- ⚠️ No standardised DTO/response shape enforcement

---

## 2. NestJS Evaluation

### 2.1 What NestJS Provides

NestJS is an opinionated framework that provides:

- **Dependency Injection (DI)** - First-class IoC container
- **Decorators** - Declarative routing, validation, guards
- **Modules** - Encapsulated feature boundaries
- **Pipes** - Request transformation and validation
- **Guards** - Authentication/authorization
- **Interceptors** - Cross-cutting concerns (logging, caching, response transformation)
- **Exception Filters** - Centralised error handling

### 2.2 Pros (Benefits for pcs-frontend)

| Benefit | Impact | Notes |
|---------|--------|-------|
| **Structured DI** | High | Eliminates `app.locals` usage; makes testing significantly easier with `@nestjs/testing` |
| **Consistent Patterns** | High | Reduces onboarding time; developers know where to find/add code |
| **Built-in Validation** | Medium | `class-validator` + `class-transformer` integrate seamlessly (or continue using Zod) |
| **Guard Rails** | High | Framework enforces separation of concerns |
| **Express Compatibility** | High | Uses Express under the hood - existing middleware works |
| **TypeScript-First** | Medium | Better type inference, decorators, metadata reflection |
| **Testing Utilities** | High | `Test.createTestingModule()` simplifies unit/integration tests |
| **Documentation Generation** | Medium | Swagger/OpenAPI integration with decorators |
| **Growing Ecosystem** | Medium | Large community, many HMCTS teams exploring similar patterns |

### 2.3 Cons (Considerations & Trade-offs)

| Concern | Severity | Mitigation |
|---------|----------|------------|
| **Learning Curve** | Medium | Decorators and DI concepts may be unfamiliar; provide training/documentation |
| **Initial Migration Effort** | Medium | Hybrid approach allows incremental migration |
| **Bundle Size** | Low | Minimal impact for server-side application |
| **Framework Lock-in** | Low | Core business logic remains framework-agnostic in services |
| **Decorator "Magic"** | Medium | Can feel implicit; good documentation and conventions help |
| **Two Systems During Migration** | Medium | Temporary complexity; clear boundaries reduce confusion |

### 2.4 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Team resistance to change | Medium | Medium | Demonstrate value with working spike; invite discussion |
| Migration taking longer than expected | Medium | Low | Phased approach; existing routes continue working |
| Compatibility issues with existing modules | Low | Medium | Express adapter ensures middleware compatibility |
| Performance regression | Low | Low | NestJS adds minimal overhead; profile if concerns arise |

---

## 3. Proposed Migration Strategy

### 3.1 Approach: Hybrid Incremental Migration

Rather than a "big bang" rewrite, we recommend a **hybrid approach**:

1. Bootstrap NestJS alongside existing Express app
2. Share the same Express instance (NestJS uses Express as its HTTP adapter)
3. Migrate routes incrementally (new features in Nest, existing routes migrated over time)
4. Existing Express routes continue to work unchanged

```
┌─────────────────────────────────────────────────────┐
│                    server.ts                        │
│  ┌─────────────────────────────────────────────┐   │
│  │           NestJS Application                 │   │
│  │  ┌─────────────────────────────────────┐    │   │
│  │  │     Express Adapter (shared app)     │    │   │
│  │  │  ┌────────────┐  ┌────────────────┐ │    │   │
│  │  │  │ Nest Routes│  │ Express Routes │ │    │   │
│  │  │  │ (new/migr) │  │  (existing)    │ │    │   │
│  │  │  └────────────┘  └────────────────┘ │    │   │
│  │  └─────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 3.2 Phase 1: Foundation (This Spike - 5 days)

**Objective**: Prove the hybrid approach works with one vertical slice.

| Task | Description |
|------|-------------|
| 1.1 | Add NestJS dependencies |
| 1.2 | Create `AppModule` and bootstrap NestJS with Express adapter |
| 1.3 | Implement one feature module (e.g., `PostcodeModule`) |
| 1.4 | Migrate `/api/postcode-lookup` endpoint to Nest controller |
| 1.5 | Add validation pipe with Zod integration |
| 1.6 | Write unit tests using NestJS testing utilities |
| 1.7 | Document the pattern and migration guidance |

### 3.3 Phase 2: Infrastructure Services (Future)

**Objective**: Wrap existing cross-cutting concerns as Nest providers.

- Wrap `HttpService` (S2S client) as injectable provider
- Create `ConfigModule` wrapping `node-config`
- Implement auth guard wrapping existing OIDC middleware
- Add global exception filter

### 3.4 Phase 3: Feature Migration (Future)

**Objective**: Incrementally migrate routes based on change frequency.

- Prioritise routes being actively modified
- New features built in Nest from the start
- Migrate `/dashboard` routes
- Migrate `/health` routes

### 3.5 Phase 4: Complete Migration (Future)

**Objective**: Remove legacy Express route registration.

- All routes migrated to Nest controllers
- Remove glob-based route loading
- Simplify `app.ts` to pure NestJS bootstrap

---

## 4. Recommended Vertical Slice: Postcode Lookup

### 4.1 Why This Endpoint?

The `/api/postcode-lookup` endpoint is ideal for the spike because:

- ✅ Simple, self-contained feature
- ✅ Has external service dependency (OS Postcode API)
- ✅ Requires authentication (OIDC middleware)
- ✅ Needs request validation
- ✅ Representative of typical API patterns

### 4.2 Current Implementation

```typescript
// routes/postcodeLookup.ts
app.get('/api/postcode-lookup', oidcMiddleware, async (req, res) => {
  // Manual query param extraction
  // Try/catch error handling
  // Direct service call
});
```

### 4.3 Target NestJS Implementation

```typescript
// nest/postcode/postcode.controller.ts
@Controller('api')
@UseGuards(OidcGuard)
export class PostcodeController {
  constructor(private readonly postcodeService: PostcodeService) {}

  @Get('postcode-lookup')
  async lookup(@Query() query: PostcodeLookupDto) {
    return this.postcodeService.getAddresses(query.postcode);
  }
}
```

---

## 5. Secondary Observations (Non-NestJS)

While analysing the codebase, the following areas were noted as potential improvements independent of NestJS adoption:

| Area | Observation | Priority |
|------|-------------|----------|
| Error handling | Inconsistent error response shapes | Low |
| Service patterns | Mix of class-based and function exports | Low |
| Type definitions | Some `any` usage could be tightened | Low |
| Test coverage | Good tooling, coverage metrics not visible | Low |

> **Note**: These are secondary considerations. The NestJS adoption provides a natural framework for addressing many of these concerns through its conventions.

---

## 6. Recommendation

**Proceed with the NestJS spike implementation.**

The benefits of structured dependency injection, consistent patterns, and improved testability outweigh the learning curve and migration effort. The hybrid approach ensures:

- No disruption to existing functionality
- Incremental value delivery
- Low risk with easy rollback
- Clear path for future development

### Decision Framework for Team Discussion

| If you value... | NestJS provides... |
|-----------------|-------------------|
| Consistency across the codebase | Enforced module/controller/service patterns |
| Easier testing | Built-in DI makes mocking trivial |
| Onboarding speed | Familiar patterns for developers from other Nest projects |
| Type safety | First-class TypeScript support with decorators |
| Maintainability | Clear boundaries between features |

---

## 7. Next Steps

1. ✅ Review this analysis document
2. ⏳ Implement vertical slice (PostcodeModule)
3. ⏳ Team demo and discussion
4. ⏳ Decide on adoption based on spike findings
5. ⏳ If approved, plan Phase 2 work

---

## Appendix A: File Structure After Spike

```
src/main/
├── app.ts                    # Modified to integrate NestJS
├── server.ts                 # Modified bootstrap sequence
├── app.module.ts             # NEW: Root NestJS module
├── nest/                     # NEW: NestJS feature modules
│   └── postcode/
│       ├── postcode.module.ts
│       ├── postcode.controller.ts
│       ├── postcode.service.ts
│       ├── dto/
│       │   └── postcode-lookup.dto.ts
│       └── __tests__/
│           └── postcode.controller.spec.ts
├── modules/                  # Existing Express modules (unchanged)
├── routes/                   # Existing Express routes (unchanged)
└── services/                 # Existing services (can be wrapped)
```

## Appendix B: Dependencies to Add

```json
{
  "dependencies": {
    "@nestjs/common": "^11.1.12",
    "@nestjs/core": "^11.1.12",
    "@nestjs/platform-express": "^11.1.12",
    "@nestjs/config": "^4.0.2",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/testing": "^11.1.12"
  }
}
```

## Appendix C: TypeScript Configuration

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```
