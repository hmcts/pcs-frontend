# Hybrid File Structure: Express + NestJS Coexistence

## Overview
This document shows how NestJS sits alongside the existing Express structure during the gradual migration period.

---

## Complete Hybrid File Structure

```
src/main/
├── app.ts                           # Modified: Express app + NestJS bootstrap
├── server.ts                        # Modified: Sequential startup
├── app.module.ts                    # NEW: Root NestJS module
│
├── nest/                            # NEW: NestJS feature modules
│   ├── index.ts                     # NEW: NestJS bootstrap function
│   ├── app.module.ts                # NEW: Main NestJS module
│   │
│   ├── guards/                      # NEW: Reusable authentication
│   │   ├── oidc.guard.ts
│   │   └── __tests__/
│   │       └── oidc.guard.spec.ts
│   │
│   ├── register-interest/           # NEW: Migrated journey (with proper SoC)
│   │   ├── register-interest.module.ts
│   │   ├── register-interest.controller.ts      # HTTP routing only
│   │   ├── register-interest.service.ts         # Navigation logic
│   │   ├── register-interest-session.service.ts # Session management
│   │   ├── validation.service.ts                # Error formatting
│   │   ├── i18n.interceptor.ts                  # Translation loading
│   │   ├── dto/
│   │   │   ├── step1.dto.ts
│   │   │   ├── step2.dto.ts
│   │   │   └── step3.dto.ts
│   │   └── __tests__/
│   │       ├── register-interest.controller.spec.ts
│   │       └── register-interest.service.spec.ts
│   │
│   └── postcode/                    # NEW: New API endpoint
│       ├── postcode.module.ts
│       ├── postcode.controller.ts
│       ├── postcode.service.ts
│       ├── dto/
│       │   └── postcode-lookup.dto.ts
│       └── __tests__/
│           └── postcode.controller.spec.ts
│
├── modules/                         # EXISTING: Express modules (unchanged)
│   ├── steps/
│   │   ├── controller.ts
│   │   ├── flow.ts
│   │   ├── formBuilder/
│   │   └── i18n.ts
│   ├── i18n/
│   ├── http/
│   └── session/
│
├── routes/                          # EXISTING: Express routes (gradually migrating)
│   ├── dashboard.ts                 # STAYS: Complex SSR route
│   ├── health.ts                    # STAYS: Simple health check
│   ├── registerSteps.ts             # STAYS: Journey registration
│   └── postcodeLookup.ts            # MIGRATED: Now in NestJS
│
├── services/                        # EXISTING: Services (can be wrapped)
│   ├── ccdCaseService.ts            # MIGRATED: Now in NestJS
│   ├── osPostcodeLookupService.ts   # MIGRATED: Now in NestJS
│   └── dashboardService.ts          # STAYS: Express-specific logic
│
├── views/                           # EXISTING: Nunjucks templates (unchanged)
│   ├── register-interest/
│   │   ├── step1.njk
│   │   ├── step2.njk
│   │   ├── step3.njk
│   │   └── confirmation.njk
│   ├── dashboard/
│   └── components/
│
└── assets/                          # EXISTING: Static assets (unchanged)
    ├── locales/
    ├── scss/
    └── js/
```

---

## Migration Timeline Visualization

### Phase 1: Initial Setup (Current)
```
src/main/
├── app.ts                    # Modified
├── server.ts                 # Modified
├── app.module.ts            # NEW
├── nest/                    # NEW
│   ├── index.ts
│   ├── app.module.ts
│   └── postcode/            # NEW: First NestJS module
│       ├── postcode.module.ts
│       ├── postcode.controller.ts
│       ├── postcode.service.ts
│       └── dto/
├── routes/                  # EXISTING (unchanged)
├── services/                # EXISTING (unchanged)
└── views/                   # EXISTING (unchanged)
```

### Phase 2: Gradual Migration (6 months)
```
src/main/
├── app.ts
├── server.ts
├── app.module.ts
├── nest/
│   ├── guards/              # NEW: Shared guards
│   ├── register-interest/  # MIGRATED: Journey to NestJS
│   ├── postcode/           # ESTABLISHED: Working well
│   └── ccd/                # MIGRATED: Complex service
├── routes/                  # SOME REMAIN: dashboard.ts, health.ts
├── services/                # SOME REMAIN: dashboardService.ts
└── views/                   # UNCHANGED
```

### Phase 3: Complete Migration (12+ months)
```
src/main/
├── app.ts
├── server.ts
├── app.module.ts
├── nest/
│   ├── guards/
│   ├── register-interest/
│   ├── postcode/
│   ├── ccd/
│   ├── dashboard/           # MIGRATED: Last complex route
│   └── health/              # MIGRATED: Simple route
├── routes/                  # MINIMAL: Legacy endpoints only
├── services/                # MINIMAL: Legacy utilities only
└── views/                   # UNCHANGED: Still needed for SSR
```

---

## Key Integration Points

### 1. Bootstrap Integration
```typescript
// src/main/server.ts (Modified)
import { bootstrapNest } from './nest';

async function startServer() {
  const app = express();
  
  // Express setup (unchanged)
  setupExpressMiddleware(app);
  registerExpressRoutes(app);
  
  // NestJS integration (NEW)
  await bootstrapNest(app);
  
  app.listen(3209);
}
```

### 2. Route Coexistence
```typescript
// Express routes continue working
app.get('/dashboard/:caseRef', ...);           // STAYS

// NestJS routes added via modules
@Controller('api/postcode-lookup')              // NEW
@Controller('register-interest')               // MIGRATED
```

### 3. Shared Infrastructure
```typescript
// Both frameworks share:
- Same HTTP server (port 3209)
- Same session middleware
- Same OIDC authentication
- Same Nunjucks templates
- Same asset serving
```

---

## Decision Matrix: What Migrates When

| Component | Priority | Complexity | Migration Strategy |
|-----------|----------|------------|-------------------|
| **New APIs** | High | Low | Build in NestJS from start |
| **Complex Services** | High | Medium | Migrate to NestJS for DI benefits |
| **SSR Journeys** | Medium | High | Migrate gradually, test thoroughly |
| **Simple Routes** | Low | Low | Keep in Express unless needed |
| **Health Checks** | Low | Low | Keep in Express (working well) |

---

## Benefits of This Approach

### ✅ **Zero Downtime**
- Existing Express routes continue working
- No breaking changes to users
- Gradual testing and validation

### ✅ **Risk Mitigation**
- Can rollback individual migrations
- Learn NestJS patterns gradually
- Validate approach before full commitment

### ✅ **Team Learning**
- Developers can learn NestJS incrementally
- Existing knowledge remains valuable
- Parallel development possible

### ✅ **Business Value**
- New features get NestJS benefits immediately
- Existing features remain stable
- Migration cost spread over time

---

## File Naming Conventions

### NestJS Modules
```
nest/feature-name/
├── feature-name.module.ts      # Module definition
├── feature-name.controller.ts  # HTTP handlers
├── feature-name.service.ts     # Business logic
├── dto/                        # Data transfer objects
└── __tests__/                  # Test files
```

### Migration Markers
```typescript
// In files that have been migrated:
/**
 * MIGRATED: Originally in routes/dashboard.ts
 * Migration date: 2026-02-15
 * Reason: Complex business logic, frequent changes
 */

// In files that remain:
/**
 * LEGACY: Kept in Express due to:
 * - Simple implementation
 * - Low maintenance overhead
 * - Working well as-is
 */
```

---

## Testing Strategy

### Phase 1: Parallel Testing
```typescript
// Both versions run side-by-side
app.get('/api/postcode', expressHandler);     // Legacy
@Controller('api/postcode-lookup')           // New
```

### Phase 2: Feature Flags
```typescript
// Toggle between implementations
const useNestJS = process.env.USE_NESTJS === 'true';

if (useNestJS) {
  await bootstrapNest(app);
}
```

### Phase 3: Gradual Cutover
```typescript
// Route by route migration
app.get('/dashboard', expressHandler);        // Phase 1
// Later: @Controller('dashboard')             // Phase 2
```

---

## Summary

The hybrid approach allows us to:
1. **Start immediately** with new NestJS features
2. **Migrate gradually** based on business value
3. **Learn safely** without breaking existing functionality
4. **Scale appropriately** as team capability grows

This structure provides the foundation for a multi-year migration strategy that delivers value at every stage.
