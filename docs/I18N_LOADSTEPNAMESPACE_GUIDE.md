# i18n `loadStepNamespace` Function Guide

## Table of Contents
1. [What Does loadStepNamespace Do?](#what-does-loadstepnamespace-do)
2. [How It Works](#how-it-works)
3. [Express vs NestJS Implementation](#express-vs-nestjs-implementation)
4. [Step-by-Step Breakdown](#step-by-step-breakdown)
5. [Translation File Structure](#translation-file-structure)
6. [Usage Examples](#usage-examples)
7. [Common Patterns](#common-patterns)

---

## What Does loadStepNamespace Do?

`loadStepNamespace` is a function that **dynamically loads translation files** for a specific step in a journey. It ensures that when a user visits a page, the correct translations are available in their chosen language.

### Purpose
- Loads step-specific translation JSON files on-demand
- Supports multiple languages (English, Welsh)
- Caches translations to avoid reloading
- Integrates with the i18next library

### Key Concept
Instead of loading ALL translations at app startup, we load translations **per-step, per-request** as needed. This keeps memory usage low and allows for dynamic translation updates.

---

## How It Works

### Function Signature
```typescript
async function loadStepNamespace(
  req: Request,        // Express request object with i18n attached
  stepName: string,    // e.g., 'step1', 'step2', 'step-three'
  folder: string       // e.g., 'registerInterest', 'nestJourney'
): Promise<void>
```

### High-Level Flow
```
1. Check if i18n is available on request
2. Convert step name to namespace (e.g., 'step1' → 'step1', 'step-three' → 'stepThree')
3. Check if translations already loaded (cache check)
4. Find the locales directory
5. Build file path: locales/{lang}/{folder}/{namespace}.json
6. Validate path (security check)
7. Read JSON file
8. Add translations to i18next
9. Load namespace into i18next
```

---

## Express vs NestJS Implementation

### Key Difference: **Same Function, Different Integration Point**

The `loadStepNamespace` function itself is **identical** in both Express and NestJS. The difference is **where and how it's called**.

---

### Express Implementation

In Express, `loadStepNamespace` is called **inside controller factory functions** that are used to register routes.

#### Express Pattern: Controller Factory
```typescript
// src/main/modules/steps/controller.ts
import { loadStepNamespace, getTranslationFunction } from './i18n';

export function createGetController(
  view: string,
  stepName: string,
  journeyFolder?: string
): GetController {
  return new GetController(view, async (req: Request) => {
    // Load translations INSIDE the controller factory
    if (journeyFolder && req.i18n) {
      try {
        await loadStepNamespace(req, stepName, journeyFolder);
      } catch (error) {
        logger.warn(`Failed to load namespace for step ${stepName}:`, error);
      }
    }
    
    const t = getTranslationFunction(req, stepName, ['common']);
    
    // Return data for template
    return {
      content: t(stepName),
      t,
    };
  });
}
```

#### Express Route Registration
```typescript
// src/main/routes/registerSteps.ts
export default function registerSteps(app: Application): void {
  for (const [journeyName, journey] of Object.entries(journeyRegistry)) {
    for (const step of journeySteps) {
      if (step.getController) {
        app.get(step.url, ...middlewares, (req, res) => {
          const controller = typeof step.getController === 'function' 
            ? step.getController()  // ← Controller factory creates controller with loadStepNamespace
            : step.getController;
          return controller.get(req, res);
        });
      }
    }
  }
}
```

**Express Flow:**
```
Request → Route Handler → Controller Factory → loadStepNamespace() → Render Template
```

---

### NestJS Implementation

In NestJS, `loadStepNamespace` is called **directly in the controller method** for each route.

#### NestJS Pattern: Direct Call in Controller
```typescript
// src/main/nest/register-interest/register-interest.controller.ts
import { Controller, Get, Render, Req } from '@nestjs/common';
import { getTranslationFunction, loadStepNamespace } from '../../modules/steps/i18n';

@Controller('register-interest')
export class RegisterInterestController {
  @Get('step1')
  @Render('register-interest/step1.njk')
  async getStep1(@Req() req: Request) {
    // Load translations DIRECTLY in the route handler
    await loadStepNamespace(req, 'step1', 'registerInterest');
    const t = getTranslationFunction(req, 'step1', ['common']);
    req.t = t;

    const session = req.session as unknown as Record<string, unknown>;
    const registerInterest = (session.registerInterest as Record<string, unknown>) || {};

    return {
      form: registerInterest.step1 || {},
      backLink: null,
      t,
    };
  }
}
```

**NestJS Flow:**
```
Request → @Get Decorator → Controller Method → loadStepNamespace() → Return Data → Render Template
```

---

### Side-by-Side Comparison

| Aspect | Express | NestJS |
|--------|---------|--------|
| **Function** | Same `loadStepNamespace` | Same `loadStepNamespace` |
| **Location** | Inside controller factory | Inside controller method |
| **Abstraction** | Hidden in factory function | Explicit in each route |
| **Registration** | Dynamic via `registerSteps()` | Static via decorators |
| **Visibility** | Less visible (abstracted) | More visible (explicit) |
| **Flexibility** | Factory can add logic | Direct control per route |

---

## Step-by-Step Breakdown

Let's walk through what happens when you call:
```typescript
await loadStepNamespace(req, 'step1', 'registerInterest');
```

### Step 1: Check i18n Availability
```typescript
if (!req.i18n) {
  return; // No i18n configured, exit early
}
```

**Why?** The request must have i18next attached via middleware. If not, translations won't work.

---

### Step 2: Convert Step Name to Namespace
```typescript
const stepNamespace = getStepNamespace(stepName);
// 'step1' → 'step1'
// 'step-two' → 'stepTwo'
// 'my-step-name' → 'myStepName'
```

**Implementation:**
```typescript
export function getStepNamespace(stepName: string): string {
  return stepName
    .split('-')
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}
```

**Why?** Converts kebab-case to camelCase for consistent namespace naming.

---

### Step 3: Get Request Language
```typescript
const lang = getMainRequestLanguage(req);
// Returns 'en' or 'cy' based on user preference
```

**Language Detection Order:**
1. Query parameter: `?lang=cy`
2. Cookie: `lang=cy`
3. Accept-Language header
4. Default: `'en'`

---

### Step 4: Check if Already Loaded (Cache)
```typescript
if (req.i18n.getResourceBundle(lang, stepNamespace)) {
  return; // Already loaded, skip
}
```

**Why?** Avoid reloading the same translation file multiple times. i18next caches loaded namespaces.

---

### Step 5: Find Locales Directory
```typescript
const localesDir = await findLocalesDir();
// Returns: '/path/to/pcs-frontend/src/main/assets/locales'
```

**Implementation:**
```typescript
async function findLocalesDir(): Promise<string | null> {
  // Searches for 'locales' directory in common locations
  // Checks: dist/main/assets/locales, src/main/assets/locales, etc.
}
```

---

### Step 6: Build File Path
```typescript
const translationPath = getStepTranslationPath(stepName, folder);
// 'registerInterest/step1'

const filePath = path.join(localesDir, lang, `${translationPath}.json`);
// '/path/to/locales/en/registerInterest/step1.json'
```

**File Structure:**
```
locales/
├── en/
│   └── registerInterest/
│       ├── step1.json
│       ├── step2.json
│       └── step3.json
└── cy/
    └── registerInterest/
        ├── step1.json
        ├── step2.json
        └── step3.json
```

---

### Step 7: Security Check (Path Traversal Prevention)
```typescript
const resolvedPath = path.resolve(filePath);
const resolvedLocalesDir = path.resolve(localesDir);

if (!resolvedPath.startsWith(resolvedLocalesDir)) {
  logger.warn(`Invalid translation path detected: ${translationPath}`);
  return; // Prevent directory traversal attacks
}
```

**Why?** Prevents malicious input like `../../etc/passwd` from accessing files outside the locales directory.

---

### Step 8: Read and Parse JSON File
```typescript
try {
  await fs.access(resolvedPath); // Check file exists
  const fileContent = await fs.readFile(resolvedPath, 'utf8');
  const translations = JSON.parse(fileContent);
  
  // Example translations object:
  // {
  //   "title": "How would you like to be contacted?",
  //   "options": {
  //     "email": "Email",
  //     "phone": "Phone",
  //     "post": "Post"
  //   }
  // }
```

---

### Step 9: Add to i18next
```typescript
req.i18n.addResourceBundle(lang, stepNamespace, translations, true, true);
// Parameters:
// - lang: 'en' or 'cy'
// - stepNamespace: 'step1'
// - translations: parsed JSON object
// - true: deep merge with existing
// - true: overwrite existing keys
```

---

### Step 10: Load Namespace
```typescript
await new Promise<void>((resolve, reject) => {
  req.i18n!.loadNamespaces(stepNamespace, err => (err ? reject(err) : resolve()));
});
```

**Why?** Ensures i18next has fully loaded and processed the namespace before continuing.

---

### Step 11: Error Handling
```typescript
} catch (error) {
  if (isDevelopment) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes('ENOENT')) {
      logger.error(`Failed to load translation file for ${stepName}:`, error);
    }
  }
}
```

**Why?** In development, log errors except for "file not found" (ENOENT) which is expected for optional translations.

---

## Translation File Structure

### Example: `locales/en/registerInterest/step1.json`
```json
{
  "title": "How would you like to be contacted?",
  "options": {
    "email": "Email",
    "phone": "Phone",
    "post": "Post"
  },
  "buttons": {
    "continue": "Continue"
  },
  "errors": {
    "required": "Select how you would like to be contacted"
  }
}
```

### Example: `locales/cy/registerInterest/step1.json` (Welsh)
```json
{
  "title": "Sut hoffech chi gael eich cysylltu?",
  "options": {
    "email": "E-bost",
    "phone": "Ffôn",
    "post": "Post"
  },
  "buttons": {
    "continue": "Parhau"
  },
  "errors": {
    "required": "Dewiswch sut yr hoffech gael eich cysylltu"
  }
}
```

---

## Usage Examples

### NestJS Controller Example
```typescript
@Controller('register-interest')
export class RegisterInterestController {
  @Get('step1')
  @Render('register-interest/step1.njk')
  async getStep1(@Req() req: Request) {
    // 1. Load translations for this step
    await loadStepNamespace(req, 'step1', 'registerInterest');
    
    // 2. Get translation function
    const t = getTranslationFunction(req, 'step1', ['common']);
    
    // 3. Attach to request for template access
    req.t = t;
    
    // 4. Return data for template
    return {
      form: {},
      backLink: null,
      t, // Template can call t('step1:title')
    };
  }
  
  @Post('step1')
  async postStep1(@Req() req: Request, @Res() res: Response) {
    // Also load in POST handlers for error messages
    await loadStepNamespace(req, 'step1', 'registerInterest');
    const t = getTranslationFunction(req, 'step1', ['common']);
    
    // Validate and use translations
    const validation = Step1Schema.safeParse(req.body);
    if (!validation.success) {
      return res.render('register-interest/step1.njk', {
        form: req.body,
        error: {
          field: 'contactPreference',
          text: t('step1:errors.required'), // Use translation
        },
        t,
      });
    }
    
    // Continue...
  }
}
```

### Express Controller Factory Example
```typescript
// This pattern is used in the existing Express routes
export function createGetController(
  view: string,
  stepName: string,
  journeyFolder?: string
): GetController {
  return new GetController(view, async (req: Request) => {
    // Load translations automatically for all steps
    if (journeyFolder && req.i18n) {
      await loadStepNamespace(req, stepName, journeyFolder);
    }
    
    const t = getTranslationFunction(req, stepName, ['common']);
    
    return {
      t,
      // Other data...
    };
  });
}
```

---

## Common Patterns

### Pattern 1: Load in Both GET and POST
```typescript
@Get('step1')
async getStep1(@Req() req: Request) {
  await loadStepNamespace(req, 'step1', 'registerInterest');
  const t = getTranslationFunction(req, 'step1', ['common']);
  req.t = t;
  // ...
}

@Post('step1')
async postStep1(@Req() req: Request, @Res() res: Response) {
  await loadStepNamespace(req, 'step1', 'registerInterest'); // ← Also in POST
  const t = getTranslationFunction(req, 'step1', ['common']);
  // ...
}
```

**Why?** POST handlers need translations for error messages and re-rendering forms.

---

### Pattern 2: Multiple Namespaces
```typescript
await loadStepNamespace(req, 'step1', 'registerInterest');
const t = getTranslationFunction(req, 'step1', ['common', 'validation']);
// Now t() can access:
// - step1:title
// - common:buttons.back
// - validation:errors.required
```

---

### Pattern 3: Conditional Loading
```typescript
@Get('step1')
async getStep1(@Req() req: Request) {
  // Only load if i18n is available
  if (req.i18n) {
    await loadStepNamespace(req, 'step1', 'registerInterest');
  }
  
  const t = getTranslationFunction(req, 'step1', ['common']);
  // ...
}
```

---

### Pattern 4: Error Handling
```typescript
@Get('step1')
async getStep1(@Req() req: Request) {
  try {
    await loadStepNamespace(req, 'step1', 'registerInterest');
  } catch (error) {
    logger.warn('Failed to load translations, using defaults', error);
  }
  
  const t = getTranslationFunction(req, 'step1', ['common']);
  // t() will return keys if translations failed to load
}
```

---

## Key Differences: Express vs NestJS

### 1. **Abstraction Level**

**Express:**
- Hidden inside controller factories
- Developers don't see `loadStepNamespace` calls
- Automatic for all steps using the factory

**NestJS:**
- Explicit in each controller method
- Developers see and control the call
- Manual for each route

---

### 2. **When It's Called**

**Express:**
```typescript
// Called when controller factory creates the controller
const controller = step.getController(); // ← loadStepNamespace happens here
return controller.get(req, res);
```

**NestJS:**
```typescript
// Called directly in the route handler
@Get('step1')
async getStep1(@Req() req: Request) {
  await loadStepNamespace(req, 'step1', 'registerInterest'); // ← Explicit call
}
```

---

### 3. **Flexibility**

**Express:**
- Less flexible (factory controls behavior)
- Consistent across all steps
- Harder to customize per-step

**NestJS:**
- More flexible (direct control)
- Can customize per-step
- Can conditionally load or skip

---

### 4. **Testability**

**Express:**
```typescript
// Must mock the entire controller factory
jest.mock('../modules/steps/controller', () => ({
  createGetController: jest.fn().mockReturnValue({
    get: jest.fn(),
  }),
}));
```

**NestJS:**
```typescript
// Can mock loadStepNamespace directly
jest.mock('../../modules/steps/i18n', () => ({
  loadStepNamespace: jest.fn().mockResolvedValue(undefined),
  getTranslationFunction: jest.fn().mockReturnValue((key: string) => key),
}));
```

---

## Summary

### What `loadStepNamespace` Does
1. ✅ Dynamically loads translation JSON files
2. ✅ Supports multiple languages
3. ✅ Caches to avoid reloading
4. ✅ Validates paths for security
5. ✅ Integrates with i18next

### Express vs NestJS
| Aspect | Express | NestJS |
|--------|---------|--------|
| **Same Function?** | ✅ Yes | ✅ Yes |
| **Where Called?** | Controller factory | Controller method |
| **Visibility** | Hidden/Abstracted | Explicit/Visible |
| **Flexibility** | Lower | Higher |
| **Consistency** | Automatic | Manual |

### Key Takeaway
**The function is identical, but the integration point differs:**
- **Express**: Abstracted in controller factories (DRY, consistent)
- **NestJS**: Explicit in controller methods (visible, flexible)

Both approaches work well. Express favors convention and consistency, while NestJS favors explicitness and control.
