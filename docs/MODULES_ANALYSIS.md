# PCS Frontend Modules - Deep Technical Analysis

## Executive Summary

This document provides a comprehensive technical analysis of the `src/main/modules` directory, focusing on the **Journey Engine**, **Session Storage**, and **FormBuilder** systems. It assesses NestJS migration compatibility and provides recommendations for integration strategies.

---

## Table of Contents

1. [Module Architecture Overview](#module-architecture-overview)
2. [Journey Engine Deep Dive](#journey-engine-deep-dive)
3. [Session & Storage Systems](#session--storage-systems)
4. [FormBuilder System](#formbuilder-system)
5. [NestJS Migration Compatibility Assessment](#nestjs-migration-compatibility-assessment)
6. [Migration Recommendations](#migration-recommendations)

---

## Module Architecture Overview

### Directory Structure

```
src/main/modules/
├── appinsights/          # Azure Application Insights telemetry
├── error-handler/        # Global error handling middleware
├── helmet/               # Security headers (CSP, HSTS, etc.)
├── http/                 # HTTP client configuration
├── i18n/                 # Internationalization (i18next)
├── journey/              # ⭐ Journey Engine (DSL-based wizard)
│   └── engine/
│       ├── engine.ts     # Core WizardEngine class (1600 lines)
│       ├── schema.ts     # Zod schemas for journey config
│       ├── validation.ts # Field validation logic
│       └── storage/      # Pluggable storage backends
├── launch-darkly/        # Feature flag integration
├── nunjucks/             # Template engine configuration
├── oidc/                 # OpenID Connect authentication
├── properties-volume/    # Azure Key Vault secrets
├── s2s/                  # Service-to-service auth
├── session/              # Express session with Redis
└── steps/                # ⭐ FormBuilder system
    ├── controller.ts     # GET/POST controller factories
    ├── flow.ts           # Step navigation logic
    ├── i18n.ts           # Step-specific translations
    └── formBuilder/      # Dynamic form generation
```

### Module Loading Order

Modules are loaded in a specific order defined in `modules/index.ts`:

```typescript
export const modules = [
  'I18n',           // 1. Internationalization first
  'PropertiesVolume', // 2. Secrets loading
  'AppInsights',    // 3. Telemetry
  'Nunjucks',       // 4. Template engine
  'Helmet',         // 5. Security headers
  'Session',        // 6. Session middleware
  'S2S',            // 7. Service auth
  'OIDCModule',     // 8. User authentication
  'LaunchDarkly',   // 9. Feature flags
];
```

---

## Journey Engine Deep Dive

### Overview

The Journey Engine (`modules/journey/engine/`) is a sophisticated **DSL-based wizard framework** that enables declarative multi-step form journeys. It's the most complex module in the codebase.

### Core Components

#### 1. WizardEngine Class (`engine.ts`)

The `WizardEngine` is a ~1600 line class that orchestrates:

- **Journey Configuration Parsing**: Validates journey configs against Zod schemas
- **Step Navigation**: Conditional routing based on user answers
- **Data Persistence**: Pluggable storage backends
- **Template Resolution**: Auto-discovers step templates
- **i18n Integration**: Per-journey namespace loading
- **LaunchDarkly Integration**: Feature flag-based field/step visibility
- **Summary Generation**: Builds GOV.UK summary cards from collected data

```typescript
export class WizardEngine {
  public readonly journey: JourneyConfig;
  public readonly slug: string;
  public readonly basePath: string;
  private readonly validator: JourneyValidator;
  private readonly store!: JourneyStore;

  constructor(journeyConfig: JourneyDraft, slug: string, sourcePath?: string) {
    // Validates config with Zod, caches validated journeys
    const parseResult = JourneySchema.safeParse(journeyConfig);
    // ...
    this.store = this.setStore(storeType);
  }

  router(): Router {
    // Returns Express router with all journey routes
  }
}
```

#### 2. Journey Schema (`schema.ts`)

Defines the DSL structure using Zod schemas:

```typescript
// Field types supported
type FieldType = 'text' | 'textarea' | 'radio' | 'checkboxes' | 
                 'select' | 'date' | 'address' | 'button' | 'character-count';

// Validation rules
const ValidationRuleSchema = z.object({
  required: z.union([z.boolean(), z.function()]),  // Can be conditional!
  minLength: z.number(),
  maxLength: z.number(),
  pattern: z.string(),
  email: z.boolean(),
  postcode: z.boolean(),
  // Date-specific constraints
  mustBePast: z.boolean(),
  mustBeFuture: z.boolean(),
  mustBeAfter: z.object({ date: DateTime, description: z.string() }),
  // ...
});

// Step configuration
const StepConfigSchema = z.object({
  title: z.string(),
  type: z.enum(['form', 'summary', 'confirmation', 'ineligible']),
  fields: z.record(FieldConfigSchema),
  next: z.union([
    z.string(),                    // Simple: "step2"
    z.object({                     // Conditional
      when: z.function(),          // (stepData, allData) => boolean
      goto: z.string(),
      else: z.string(),
    }),
  ]),
});
```

#### 3. Conditional Navigation

The engine supports complex branching logic:

```typescript
private resolveNext(step: StepConfig, allData: Record<string, unknown>): string {
  const nxt = step.next;
  
  if (typeof nxt === 'string') {
    return nxt;  // Simple next step
  }

  // Conditional navigation with function evaluation
  if (typeof nxt.when === 'function') {
    const conditionMet = nxt.when(stepData, allData);
    return conditionMet ? nxt.goto : nxt.else;
  }
}
```

#### 4. Step Accessibility Control

The engine enforces linear progression:

```typescript
private isStepAccessible(stepId: string, allData: Record<string, unknown>): boolean {
  // Always allow first step
  if (stepId === firstStepId) return true;
  
  // Build dependency graph and check all required steps are complete
  // ...
}
```

---

## Session & Storage Systems

### Session Module (`modules/session/`)

Configures Express session with Redis backing:

```typescript
export class Session {
  enableFor(app: Express): void {
    const redis = new Redis(redisConnectionString);
    
    const redisStore = new RedisStore({
      client: redis,
      prefix: config.get('session.prefix') + ':',
      ttl: config.get('session.redis.ttlInSeconds'),
    });

    app.use(session({
      secret: sessionSecret,
      store: redisStore,
      rolling: true,  // Extends session on each request
      cookie: { maxAge: sessionTimeoutMinutes * 60 * 1000 },
    }));

    // Expose Redis client for journey stores
    app.locals.redisClient = redis;
  }
}
```

### Journey Storage Interface

The Journey Engine uses a pluggable storage pattern:

```typescript
// storage/journeyStore.interface.ts
export interface JourneyStore {
  load(req: Request, caseId: string): Promise<{ data: Record<string, unknown>; version: number }>;
  save(req: Request, caseId: string, version: number, patch: Record<string, unknown>): Promise<{ data: Record<string, unknown>; version: number }>;
  generateReference(req: Request, journeySlug: string, caseId: string): Promise<string>;
}
```

### Storage Implementations

| Store | File | Description | Production Ready |
|-------|------|-------------|------------------|
| **Session** | `sessionStore.ts` | Uses Express session (Redis-backed) | ✅ Yes |
| **Redis** | `redisStore.ts` | Direct Redis with user-scoped keys | ✅ Yes |
| **Memory** | `memoryStore.ts` | In-memory (testing only) | ❌ No |
| **CCD** | `ccdStore.ts` | HMCTS Case Data Store | 🚧 Stub only |
| **Database** | `databaseStore.ts` | SQL database | 🚧 Stub only |

#### Session Store Implementation

```typescript
// storage/sessionStore.ts
export const sessionStore = (slug: string): JourneyStore => {
  return {
    async load(req: Request, caseId: string) {
      const session = req.session as TypedSession;
      const data = session[caseId]?.[slug] ?? {};
      return { data, version: 0 };
    },

    async save(req: Request, caseId: string, version: number, patch: Record<string, unknown>) {
      // Deep-merge at first level
      const merged = { ...old };
      for (const [stepId, stepPatch] of Object.entries(patch)) {
        merged[stepId] = { ...(old[stepId] ?? {}), ...stepPatch };
      }
      session[caseId][slug] = merged;
      return { data: merged, version };
    },
  };
};
```

#### Redis Store Implementation

```typescript
// storage/redisStore.ts
export const redisStore = (slug: string): JourneyStore => {
  const keyFor = (req: Request, caseId: string): string => {
    const userId = req.session?.user?.uid ?? 'anon';
    return `${slug}:${userId}:${caseId}`;  // User-scoped keys
  };

  return {
    async load(req, caseId) {
      const client = req.app.locals.redisClient;
      const raw = await client.get(keyFor(req, caseId));
      return raw ? JSON.parse(raw) : { data: {}, version: 0 };
    },

    async save(req, caseId, version, patch) {
      const mergedData = deepMerge(existing.data, patch);
      await client.set(key, JSON.stringify({ data: mergedData, version: version + 1 }));
      return { data: mergedData, version: version + 1 };
    },
  };
};
```

---

## FormBuilder System

### Overview

The FormBuilder (`modules/steps/formBuilder/`) is a **dynamic form generation system** that creates GOV.UK Design System compliant forms from configuration objects.

### Architecture

```
steps/
├── controller.ts         # GET/POST controller factories
├── flow.ts               # Step navigation (next/previous)
├── i18n.ts               # Translation loading per step
└── formBuilder/
    ├── index.ts          # createFormStep() entry point
    ├── componentBuilders.ts  # GOV.UK component builders
    ├── conditionalFields.ts  # Conditional reveal logic
    ├── dateValidation.ts     # Date field validation
    ├── errorUtils.ts         # Error summary generation
    ├── fieldTranslation.ts   # i18n for field labels
    ├── formContent.ts        # Template context building
    ├── helpers.ts            # Validation & data helpers
    ├── postHandler.ts        # POST request handling
    ├── schema.ts             # Config validation
    └── subFieldsRenderer.ts  # Nested field rendering
```

### Key Components

#### 1. createFormStep() Factory

The main entry point for creating form steps:

```typescript
// formBuilder/index.ts
export function createFormStep(config: FormBuilderConfig): StepDefinition {
  const { stepName, journeyFolder, fields, beforeRedirect } = config;

  return {
    url: path.join('/steps', journeyPath, stepName),
    name: stepName,
    view: 'formBuilder.njk',
    
    getController: () => {
      return createGetController(viewPath, stepName, async req => {
        await loadStepNamespace(req, stepName, journeyFolder);
        const t = getTranslationFunction(req, stepName, ['common']);
        const formContent = buildFormContent(fields, t, getFormData(req, stepName), {});
        return { ...formContent, backUrl: stepNavigation.getBackUrl(req, stepName) };
      });
    },
    
    postController: createPostHandler(fields, stepName, viewPath, journeyFolder, beforeRedirect),
  };
}
```

#### 2. Controller Factories

```typescript
// controller.ts
export const createGetController = (view, stepName, extendContent?, journeyFolder?) => {
  return new GetController(view, async (req: Request) => {
    // Load i18n namespace
    await loadStepNamespace(req, stepName, journeyFolder);
    
    // Get translation function scoped to step
    const t = getTranslationFunction(req, stepName, ['common']);
    req.t = t;
    
    // Build template context
    return {
      formData: getFormData(req, stepName),
      t,
      backUrl: stepNavigation.getBackUrl(req, stepName),
      ...stepTranslations,
    };
  });
};

export const createPostController = (stepName, getFields, view, beforeRedirect?) => {
  return {
    post: async (req, res, next) => {
      const errors = validateForm(req, fields);
      
      if (Object.keys(errors).length > 0) {
        return res.status(400).render(view, { error, ...req.body });
      }
      
      setFormData(req, stepName, req.body);
      
      if (beforeRedirect) await beforeRedirect(req, res);
      
      res.redirect(303, stepNavigation.getNextStepUrl(req, stepName));
    },
  };
};
```

#### 3. Flow Navigation

```typescript
// flow.ts
export function getNextStep(currentStepName, flowConfig, formData, currentStepData = {}) {
  const stepConfig = flowConfig.steps[currentStepName];

  // Check conditional routes
  if (stepConfig?.routes) {
    for (const route of stepConfig.routes) {
      if (!route.condition || route.condition(formData, currentStepData)) {
        return route.nextStep;
      }
    }
  }

  // Fall back to default or linear order
  return stepConfig?.defaultNext || flowConfig.stepOrder[currentIndex + 1];
}

export function getPreviousStep(currentStepName, flowConfig, formData = {}) {
  // Reverse lookup: find which step leads to current
  for (const [stepName, config] of Object.entries(flowConfig.steps)) {
    if (config.routes?.some(r => r.nextStep === currentStepName)) {
      return stepName;
    }
  }
  return flowConfig.stepOrder[currentIndex - 1];
}
```

#### 4. Component Builders

Generates GOV.UK macro-compatible component configs:

```typescript
// componentBuilders.ts
export function buildComponentConfig(field, label, hint, fieldValue, ...): ComponentConfig {
  const component = {
    id: field.name,
    name: field.name,
    label: { text: label },
    hint: hint ? { text: hint } : null,
    errorMessage: hasError ? { text: errorText } : null,
  };

  switch (field.type) {
    case 'text':
      component.value = fieldValue || '';
      return { type: 'input', ...component };
      
    case 'radio':
      component.fieldset = createFieldsetLegend(label, isFirstField);
      component.items = translatedOptions.map(opt => ({
        value: opt.value,
        text: opt.text,
        checked: fieldValue === opt.value,
      }));
      return { type: 'radios', ...component };
      
    case 'date':
      component.items = ['day', 'month', 'year'].map(part => ({
        name: part,
        classes: part === 'year' ? 'govuk-input--width-4' : 'govuk-input--width-2',
        value: fieldValue?.[part] || '',
      }));
      return { type: 'dateInput', ...component };
  }
}
```

---

## NestJS Migration Compatibility Assessment

### Compatibility Matrix

| Module | Compatibility | Effort | Strategy |
|--------|--------------|--------|----------|
| **Journey Engine** | 🟡 Partial | High | Wrap as NestJS service |
| **Session Store** | 🟢 Compatible | Low | Use via NestJS middleware |
| **Redis Store** | 🟢 Compatible | Low | Inject Redis client |
| **FormBuilder** | 🟡 Partial | Medium | Extract validation logic |
| **Flow Navigation** | 🟢 Compatible | Low | Use as utility |
| **i18n** | 🟢 Compatible | Low | Already integrated |
| **OIDC** | 🟡 Partial | Medium | Use NestJS guards |
| **Nunjucks** | 🟢 Compatible | Low | Configure in NestJS |

### Detailed Analysis

#### Journey Engine

**Current State**: Tightly coupled to Express Router

```typescript
// Current: Returns Express Router
router(): Router {
  const router = Router();
  router.use(async (req, res, next) => { /* i18n setup */ });
  router.use(oidcMiddleware);
  router.get('/', (req, res) => { /* redirect to first step */ });
  router.param('step', (req, res, next, stepId) => { /* step lookup */ });
  router.get('/:step', async (req, res) => { /* render step */ });
  router.post('/:step', async (req, res) => { /* handle submission */ });
  return router;
}
```

**Migration Options**:

1. **Wrap as NestJS Module** (Recommended)
   - Create `JourneyEngineModule` that provides `WizardEngine` as injectable service
   - Use `@nestjs/platform-express` to mount Express router
   - Minimal code changes, preserves existing functionality

2. **Full Rewrite as NestJS Controllers**
   - Create `@Controller(':slug')` with dynamic routing
   - Convert middleware to NestJS guards/interceptors
   - Higher effort but cleaner architecture

**Recommended Approach**:
```typescript
// journey-engine.module.ts
@Module({
  providers: [
    {
      provide: 'JOURNEY_ENGINE',
      useFactory: (configService: ConfigService) => {
        return new WizardEngine(journeyConfig, 'possession-claim');
      },
      inject: [ConfigService],
    },
  ],
  exports: ['JOURNEY_ENGINE'],
})
export class JourneyEngineModule {}

// In main.ts - mount Express router
const engine = app.get('JOURNEY_ENGINE');
expressApp.use('/possession-claim', engine.router());
```

#### Session Storage

**Current State**: Express session with Redis

**NestJS Compatibility**: ✅ Fully compatible

The session module configures Express middleware which works seamlessly with NestJS's Express adapter:

```typescript
// NestJS main.ts
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Session module works as-is
  new Session().enableFor(app.getHttpAdapter().getInstance());
}
```

#### FormBuilder

**Current State**: Express-specific controller factories

**Migration Strategy**:

1. **Extract Pure Logic**: Validation, component building, and field translation are framework-agnostic
2. **Create NestJS Services**: Wrap pure logic in injectable services
3. **Use in Controllers**: Inject services into NestJS controllers

```typescript
// Extracted as NestJS service
@Injectable()
export class FormBuilderService {
  buildFormContent(fields: FormFieldConfig[], t: TFunction, formData: Record<string, unknown>) {
    return buildFormContent(fields, t, formData, {});
  }

  validateForm(body: Record<string, unknown>, fields: FormFieldConfig[]) {
    return validateForm({ body } as Request, fields);
  }
}
```

---

## Migration Recommendations

### Phase 1: Foundation (Low Risk)

1. **Create NestJS wrapper modules** for existing Express modules
2. **Configure session middleware** in NestJS bootstrap
3. **Set up Nunjucks** with NestJS view engine

### Phase 2: Service Extraction (Medium Risk)

1. **Extract FormBuilder logic** into NestJS services
2. **Create validation service** from Journey Engine validator
3. **Implement storage adapters** as NestJS providers

### Phase 3: Controller Migration (Higher Risk)

1. **Create NestJS journey controllers** using extracted services
2. **Implement guards** for OIDC authentication
3. **Add interceptors** for i18n namespace loading

### Key Considerations

| Aspect | Recommendation |
|--------|----------------|
| **Session** | Keep Express session, access via `@Req()` decorator |
| **Storage** | Inject Redis client via NestJS DI |
| **Validation** | Extract Zod schemas, use in NestJS DTOs |
| **i18n** | Use existing module, load namespaces in interceptors |
| **Templates** | Continue using Nunjucks with `@Render()` decorator |

### Code Reuse Potential

| Component | Reuse % | Notes |
|-----------|---------|-------|
| Zod Schemas | 100% | Framework-agnostic |
| Validation Logic | 95% | Minor refactoring needed |
| Component Builders | 90% | Remove Express dependencies |
| Storage Implementations | 85% | Inject clients differently |
| Flow Navigation | 80% | Decouple from session access |
| Controller Logic | 40% | Needs significant rewrite |

---

## Conclusion

The modules architecture is well-designed with clear separation of concerns. The Journey Engine and FormBuilder are the most complex components but can be incrementally migrated to NestJS through:

1. **Service extraction** of pure business logic
2. **Wrapper modules** for Express-specific code
3. **Gradual controller migration** as new journeys are built

The storage system's pluggable design makes it particularly well-suited for NestJS dependency injection patterns.
