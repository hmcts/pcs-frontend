# PCS Frontend Modules - Onboarding Guide

## Introduction

This guide provides a high-level overview of the `src/main/modules` directory for developers new to the PCS Frontend codebase. It explains what each module does, how they interact, and how to work with them effectively.

---

## Quick Reference

| Module | Purpose | Key File(s) |
|--------|---------|-------------|
| `appinsights` | Azure telemetry & logging | `index.ts` |
| `error-handler` | Global error handling | `index.ts` |
| `helmet` | Security headers | `index.ts` |
| `http` | HTTP client config | `index.ts` |
| `i18n` | Internationalization | `index.ts` |
| `journey` | Multi-step wizard engine | `engine/engine.ts` |
| `launch-darkly` | Feature flags | `index.ts` |
| `nunjucks` | Template engine | `index.ts` |
| `oidc` | User authentication | `oidc.ts` |
| `properties-volume` | Azure Key Vault secrets | `index.ts` |
| `s2s` | Service-to-service auth | `index.ts` |
| `session` | Express session (Redis) | `index.ts` |
| `steps` | Form builder system | `formBuilder/index.ts` |

---

## Module Categories

### 🔐 Security & Authentication

#### OIDC Module (`modules/oidc/`)
Handles user authentication via OpenID Connect (Azure AD B2C).

**Key Concepts:**
- Provides `oidcMiddleware` for protecting routes
- Manages login/logout flows
- Stores user info in session

**Usage:**
```typescript
import { oidcMiddleware } from '../middleware/oidc';

// Protect a route
router.use('/protected', oidcMiddleware, protectedRoutes);
```

#### Helmet Module (`modules/helmet/`)
Configures security headers (CSP, HSTS, X-Frame-Options, etc.).

**Automatically applied** - no action needed.

#### S2S Module (`modules/s2s/`)
Service-to-service authentication for backend API calls.

**Usage:**
```typescript
// Automatically adds auth headers to outgoing requests
const response = await s2sClient.get('/api/cases');
```

---

### 💾 Data & Session Management

#### Session Module (`modules/session/`)
Configures Express session with Redis backing store.

**Key Features:**
- Redis-backed persistence
- Configurable timeout with warning
- Rolling sessions (extends on activity)

**Accessing Session Data:**
```typescript
// In any route handler
req.session.formData = { step1: { answer: 'yes' } };
req.session.user;  // User info from OIDC
```

#### Journey Storage (`modules/journey/engine/storage/`)
Pluggable storage backends for journey data.

**Available Stores:**
- `sessionStore` - Uses Express session (default)
- `redisStore` - Direct Redis with user-scoped keys
- `memoryStore` - In-memory (testing only)
- `ccdStore` - HMCTS Case Data Store (stub)

**Configured in journey definition:**
```typescript
const journeyConfig = {
  config: {
    store: { type: 'session' },  // or 'redis', 'memory'
  },
  steps: { /* ... */ },
};
```

---

### 🌐 Internationalization

#### I18n Module (`modules/i18n/`)
Provides multi-language support using i18next.

**Key Concepts:**
- Locale files in `src/main/assets/locales/{en,cy}/`
- Namespace-based organization
- Automatic language detection from query/cookie

**Using Translations:**
```typescript
// In controllers
const t = getTranslationFunction(req, 'stepName', ['common']);
const translated = t('heading', 'Fallback text');

// In Nunjucks templates
{{ t('step1:heading', 'Default heading') }}
```

**Adding New Translations:**
1. Create JSON file in `locales/en/yourNamespace.json`
2. Create Welsh version in `locales/cy/yourNamespace.json`
3. Load namespace in controller: `await loadStepNamespace(req, 'stepName', 'folder')`

---

### 🧙 Journey Engine

#### Overview (`modules/journey/`)
The Journey Engine is a **DSL-based wizard framework** for building multi-step form journeys declaratively.

**Key Components:**
- `WizardEngine` - Core orchestrator class
- `JourneySchema` - Zod validation for journey configs
- `JourneyValidator` - Field validation logic
- Storage backends - Pluggable data persistence

**Creating a Journey:**

```typescript
// journeys/my-journey/config.ts
import { JourneyDraft } from '../../modules/journey/engine/schema';

export const myJourneyConfig: JourneyDraft = {
  config: {
    store: { type: 'session' },
    auth: { required: true },
    i18nNamespace: 'myJourney',
  },
  steps: {
    'step-1': {
      title: 'First Question',
      fields: {
        answer: {
          type: 'radios',
          label: 'Do you agree?',
          items: [
            { value: 'yes', text: 'Yes' },
            { value: 'no', text: 'No' },
          ],
          validate: { required: true },
        },
      },
      next: {
        when: (stepData) => stepData.answer === 'yes',
        goto: 'step-2',
        else: 'ineligible',
      },
    },
    'step-2': {
      title: 'Second Question',
      fields: { /* ... */ },
      next: 'summary',
    },
    'summary': {
      type: 'summary',
      title: 'Check your answers',
      next: 'confirmation',
    },
    'confirmation': {
      type: 'confirmation',
      title: 'Application complete',
    },
  },
};
```

**Registering a Journey:**
```typescript
// In routes
import { WizardEngine } from '../modules/journey/engine/engine';
import { myJourneyConfig } from '../journeys/my-journey/config';

const engine = new WizardEngine(myJourneyConfig, 'my-journey');
app.use('/my-journey', engine.router());
```

**Field Types Supported:**
- `text` - Single line input
- `textarea` - Multi-line input
- `character-count` - Textarea with character limit
- `radios` - Radio button group
- `checkboxes` - Checkbox group
- `select` - Dropdown
- `date` - GOV.UK date input (day/month/year)
- `address` - Address lookup with postcode
- `button` - Submit/action buttons

---

### 📝 FormBuilder System

#### Overview (`modules/steps/`)
The FormBuilder is an **alternative to the Journey Engine** for simpler form steps that don't need the full wizard functionality.

**Key Difference from Journey Engine:**
- Journey Engine: Full wizard with branching, storage, summary pages
- FormBuilder: Individual form steps with manual flow control

**Creating a Form Step:**

```typescript
// steps/respond-to-claim/start-now/index.ts
import { createFormStep } from '../../../modules/steps/formBuilder';

export const startNowStep = createFormStep({
  stepName: 'start-now',
  journeyFolder: 'respondToClaim',
  fields: [
    {
      name: 'claimNumber',
      type: 'text',
      label: 'Claim number',
      hint: 'This is on the letter we sent you',
      required: true,
      maxLength: 20,
    },
  ],
  beforeRedirect: async (req) => {
    // Custom logic before redirecting to next step
    await validateClaimNumber(req.body.claimNumber);
  },
});
```

**Flow Configuration:**

```typescript
// steps/respond-to-claim/flow.config.ts
export const flowConfig: JourneyFlowConfig = {
  journeyName: 'respond-to-claim',
  basePath: '/steps/respond-to-claim',
  stepOrder: ['start-now', 'claim-details', 'your-response', 'check-answers'],
  steps: {
    'start-now': {
      defaultNext: 'claim-details',
    },
    'claim-details': {
      routes: [
        { condition: (data) => data.hasDefence, nextStep: 'your-defence' },
        { condition: () => true, nextStep: 'your-response' },
      ],
    },
  },
};
```

---

### 🎨 Template Engine

#### Nunjucks Module (`modules/nunjucks/`)
Configures Nunjucks template engine with GOV.UK Frontend macros.

**Template Locations:**
- `src/main/views/` - Application templates
- `node_modules/govuk-frontend/` - GOV.UK components

**Using GOV.UK Components:**
```nunjucks
{% extends "layout.njk" %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/radios/macro.njk" import govukRadios %}

{% block content %}
  {{ govukRadios({
    name: "answer",
    fieldset: { legend: { text: "Do you agree?" } },
    items: [
      { value: "yes", text: "Yes" },
      { value: "no", text: "No" }
    ]
  }) }}
  
  {{ govukButton({ text: "Continue" }) }}
{% endblock %}
```

---

### 🚀 Feature Flags

#### LaunchDarkly Module (`modules/launch-darkly/`)
Enables feature flag-based functionality.

**Usage in Code:**
```typescript
const ldClient = req.app.locals.launchDarklyClient;
const showNewFeature = await ldClient.variation('new-feature-flag', userContext, false);

if (showNewFeature) {
  // New feature code
}
```

**Usage in Journey Engine:**
Fields and steps can be hidden based on flags:
```typescript
{
  fields: {
    newField: {
      type: 'text',
      label: 'New field',
      flag: 'enable-new-field',  // Only shown if flag is true
    },
  },
}
```

---

### 📊 Monitoring

#### AppInsights Module (`modules/appinsights/`)
Azure Application Insights integration for:
- Request tracking
- Error logging
- Custom telemetry
- Performance metrics

**Logging:**
```typescript
import { Logger } from '@hmcts/nodejs-logging';

const logger = Logger.getLogger('my-component');
logger.info('Something happened');
logger.error('Something went wrong', error);
```

---

## Common Patterns

### Adding a New Journey

1. **Create journey folder**: `src/main/journeys/my-journey/`
2. **Define config**: `config.ts` with steps and fields
3. **Create templates**: `steps/{stepId}/{stepId}.njk`
4. **Add translations**: `locales/{en,cy}/myJourney/*.json`
5. **Register route**: Mount `engine.router()` in Express

### Adding a New Form Step

1. **Create step folder**: `src/main/steps/journey-name/step-name/`
2. **Define step**: `index.ts` using `createFormStep()`
3. **Add to flow**: Update `flow.config.ts`
4. **Add translations**: `locales/{en,cy}/journeyName/stepName.json`
5. **Register route**: Add to step registration

### Protecting Routes

```typescript
// Using OIDC middleware
router.use(oidcMiddleware);

// Or in NestJS
@UseGuards(OidcGuard)
@Controller('protected')
export class ProtectedController { }
```

### Accessing Session Data

```typescript
// Form data
const formData = req.session.formData?.stepName || {};

// User info
const userId = req.session.user?.uid;
const userName = req.session.user?.name;

// Journey data (via storage)
const { data } = await store.load(req, caseId);
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "No locales directory found" | Missing translations | Create `locales/en/` folder |
| Session not persisting | Redis connection | Check `redis-connection-string` secret |
| OIDC redirect loop | Missing callback URL | Configure Azure AD B2C |
| Template not found | Wrong path | Check `views/` directory structure |
| Validation not working | Missing Zod schema | Ensure field has `validate` config |

### Debug Mode

Enable debug logging:
```bash
DEBUG=* yarn start:dev
```

Or for specific modules:
```bash
DEBUG=i18n,session yarn start:dev
```

---

## Next Steps

1. **Read the detailed analysis**: See `MODULES_ANALYSIS.md` for deep technical details
2. **Explore existing journeys**: Look at `src/main/journeys/` for examples
3. **Check the GOV.UK Design System**: https://design-system.service.gov.uk/
4. **Review NestJS integration**: See `NESTJS_SPIKE_RESULTS.md` for migration patterns

---

## Quick Links

- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [Nunjucks Documentation](https://mozilla.github.io/nunjucks/)
- [i18next Documentation](https://www.i18next.com/)
- [Zod Documentation](https://zod.dev/)
- [NestJS Documentation](https://docs.nestjs.com/)
