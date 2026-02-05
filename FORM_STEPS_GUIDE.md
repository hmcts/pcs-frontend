# PCS Frontend Form Steps Guide

**A comprehensive guide to building form steps in the PCS Frontend application**

---

## Table of Contents

1. [Overview](#overview)
2. [Decision Tree: When to Use What](#decision-tree-when-to-use-what)
3. [Pattern 1: Using `createFormStep` (Recommended)](#pattern-1-using-createformstep-recommended)
4. [Pattern 2: Manual Step Definition](#pattern-2-manual-step-definition)
5. [Understanding Translations](#understanding-translations)
6. [The `extendGetContent` Function](#the-extendgetcontent-function)
7. [Data Persistence & Session Management](#data-persistence--session-management)
8. [Dynamic Content Patterns](#dynamic-content-patterns)
9. [Field Configuration Guide](#field-configuration-guide)
10. [Validation Patterns](#validation-patterns)
11. [Custom Templates](#custom-templates)
12. [Common Gotchas & Quirks](#common-gotchas--quirks)
13. [Complete Examples](#complete-examples)

---

## Overview

The PCS Frontend uses a form builder framework to create multi-step journeys. There are two main approaches to building form steps:

1. **`createFormStep`** - A declarative, configuration-based approach (recommended)
2. **Manual Step Definition** - Implementing `getController` and `postController` yourself

**Rule of Thumb**: Use `createFormStep` for any step that has form fields requiring validation. Only use manual definition for pure display/interstitial pages with no user input.

---

## Decision Tree: When to Use What

```
Does your page have form fields that need validation?
│
├─ YES → Use createFormStep
│   │
│   ├─ Simple form (radio, text, date fields)?
│   │   └─> Use createFormStep with default formBuilder.njk
│   │
│   └─ Need custom content (paragraphs, lists, complex layout)?
│       └─> Use createFormStep with customTemplate
│
└─ NO → Manual step definition
    │
    └─ Is it just showing information / routing?
        └─> Use manual getController & postController
```

---

## Pattern 1: Using `createFormStep` (Recommended)

### Basic Structure

```typescript
import type { Request } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'my-step-name',           // Must match folder name
  journeyFolder: 'respondToClaim',    // Journey namespace for translations
  stepDir: __dirname,                 // Always __dirname
  flowConfig,                         // Journey flow configuration
  
  // Optional: use custom template (see Custom Templates section)
  customTemplate: `${__dirname}/myCustomTemplate.njk`,
  
  // Optional: extra translation keys for static content
  translationKeys: {
    paragraph1: 'paragraph1',
    heading: 'heading',
  },
  
  // Optional: inject dynamic data into template
  extendGetContent: (req: Request) => {
    // Pull dynamic data from session/CCD
    const userName = req.session.userName || 'User';
    
    return {
      userName,
      customData: 'some value',
    };
  },
  
  // Field configuration (see Field Configuration Guide)
  fields: [
    {
      name: 'myField',
      type: 'text',
      required: true,
      translationKey: {
        label: 'myFieldLabel',
        hint: 'myFieldHint',
      },
    },
  ],
});
```

### What `createFormStep` Does Automatically

✅ **Validation** - Server-side validation based on field rules  
✅ **Error Handling** - Re-renders form with errors if validation fails  
✅ **Translation** - Loads step namespace and translates all content  
✅ **Session Management** - Saves form data to session automatically  
✅ **Save For Later** - Handles "Save for Later" button automatically  
✅ **Navigation** - Routes to next step based on flowConfig  
✅ **Back Links** - Generates back links automatically  

### Benefits

- **Less Boilerplate** - No need to write GET/POST handlers manually
- **Consistent Validation** - Uses the same validation framework across all steps
- **Error Messages** - Automatic error summary and inline errors
- **Type Safety** - Field configuration is type-checked
- **Accessibility** - GOV.UK patterns applied automatically

---

## Pattern 2: Manual Step Definition

### When to Use

Use manual step definition **only** when:
- ✅ No form fields or validation required
- ✅ Pure informational/interstitial page
- ✅ Just showing content and routing to next step
- ✅ Simple button to continue

### Structure

```typescript
import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { DASHBOARD_ROUTE } from '../../../routes/dashboard';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

const stepName = 'my-interstitial-page';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/my-interstitial-page`,
  name: stepName,
  view: 'respond-to-claim/my-interstitial-page/myPage.njk',
  stepDir: __dirname,
  
  getController: () => {
    return createGetController(
      'respond-to-claim/my-interstitial-page/myPage.njk',
      stepName,
      async (req: Request) => {
        // Get translation function
        const t = req.t;
        if (!t) {
          throw new Error('Translation function not available');
        }

        // Pull dynamic data
        const userName = req.session?.userName || 'User';

        return {
          backUrl: await stepNavigation.getBackUrl(req, stepName),
          dashboardUrl: DASHBOARD_ROUTE,
          // Pass data to template
          userName,
          heading: t('heading', { userName }),
        };
      },
      'respondToClaim'  // Journey folder for translations
    );
  },
  
  postController: {
    post: async (req: Request, res: Response) => {
      // Get next step URL and redirect
      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
```

### ⚠️ Limitations

When using manual step definition:
- ❌ No automatic validation
- ❌ No automatic error handling
- ❌ No automatic session saving
- ❌ Must manually handle "Save for Later"
- ❌ Must manually re-render on errors

---

## Understanding Translations

### Translation Hierarchy

Translations are organized in a hierarchy:

```
locales/
  en/
    common.json           ← Global translations (buttons, errors)
    respondToClaim/       ← Journey namespace
      myStepName.json     ← Step-specific translations
```

### Three Ways to Get Translations

#### 1. `req.t` - Simple but Limited

```typescript
const t = req.t;
const text = t('some.key');
```

**Use when**: You're in a manual step definition and need quick translations  
**Limitation**: May not be scoped to step namespace correctly

#### 2. `getTranslationFunction` - Step-Scoped (Recommended)

```typescript
import { getTranslationFunction } from '../../../modules/steps';

const t = getTranslationFunction(req, 'step-name', ['common']);
const text = t('some.key');
```

**Use when**: 
- Inside `extendGetContent`
- You need step-scoped translations
- You need to access arrays/objects (`returnObjects: true`)

**Parameters**:
- `req` - Request object
- `'step-name'` - Step name (should match your step folder)
- `['common']` - Array of fallback namespaces

#### 3. Automatic in `createFormStep`

When using `createFormStep`, translations are handled automatically:
- Field labels come from `translationKey`
- `translationKeys` object maps content keys
- Error messages use `errors.*` keys

### Translation File Structure

**Step translation file** (`en/respondToClaim/myStep.json`):

```json
{
  "title": "My Page Title",
  "caption": "Journey Caption",
  "paragraph1": "Some text with {{dynamicValue}} interpolation",
  "myList": [
    "First item",
    "Second item with {{userName}}",
    "Third item"
  ],
  "errors": {
    "myField": "You must enter a value for my field",
    "anotherField": "Custom error message"
  }
}
```

### Translation Interpolation

```typescript
// Simple interpolation
t('greeting', { userName: 'John' });  // "Hello, John"

// Array with interpolation
const items = t('myList', { returnObjects: true, userName: 'John' }) as string[];
// items = ["First item", "Second item with John", "Third item"]

// Manual interpolation (if automatic doesn't work)
const items = t('myList', { returnObjects: true }) as string[];
const interpolated = items.map(item => item.replace('{{userName}}', userName));
```

---

## The `extendGetContent` Function

### What It Does

`extendGetContent` allows you to **inject dynamic data** into the template context on **both GET and POST** requests.

### Signature

```typescript
extendGetContent?: (req: Request, content: TranslationContent) => Record<string, unknown>
```

### When to Use

Use `extendGetContent` when you need to:
- ✅ Pull dynamic data from `req.session` or CCD
- ✅ Interpolate dynamic values into translations
- ✅ Generate computed values for the template
- ✅ Add custom data that isn't in translation files

### Important Quirks

⚠️ **Translations Inside `extendGetContent`**

**DON'T** use `req.t` directly:
```typescript
// ❌ BAD - May not work correctly
extendGetContent: (req: Request) => {
  const t = req.t;
  return { items: t('myList', { returnObjects: true }) };
}
```

**DO** use `getTranslationFunction`:
```typescript
// ✅ GOOD - Properly scoped
import { getTranslationFunction } from '../../../modules/steps';

extendGetContent: (req: Request) => {
  const t = getTranslationFunction(req, 'my-step-name', ['common']);
  return { items: t('myList', { returnObjects: true }) };
}
```

### Example: Interpolating Arrays

```typescript
extendGetContent: (req: Request) => {
  const claimantName = req.session?.ccdCase?.data?.claimantName || 'Default Name';
  
  const t = getTranslationFunction(req, 'non-rent-arrears-dispute', ['common']);
  
  // Get array from translations
  const listRaw = t('includesList', { returnObjects: true }) as string[];
  
  // Manually interpolate dynamic values
  const includesList = listRaw.map(item => 
    item.replace('{{claimantName}}', claimantName)
  );
  
  return {
    includesList,
    claimantName,
  };
}
```

### What Gets Passed to Template

Everything you return from `extendGetContent` is merged with:
- Translated content from `translationKeys`
- Form field values
- Standard context (backUrl, dashboardUrl, etc.)

---

## Data Persistence & Session Management

### Where Data is Saved

Understanding where and how form data persists is crucial for debugging and building multi-step journeys.

### Automatic Persistence with `createFormStep`

When you use `createFormStep`, **all form data is automatically saved to the session** after successful validation.

**Location**: `req.session.formData[stepName]`

```typescript
// Example session structure
req.session.formData = {
  'free-legal-advice': {
    hadLegalAdvice: 'yes'
  },
  'defendant-name-confirmation': {
    nameConfirmation: 'yes'
  },
  'non-rent-arrears-dispute': {
    disputeClaim: 'yes',
    disputeDetails: 'I disagree with the grounds for possession...'
  }
}
```

### When Data is Saved

#### `createFormStep` Flow:

1. **User submits form** → POST request
2. **Validation runs** → Field rules checked
3. **If validation fails** → Form re-renders with errors (data NOT saved)
4. **If validation passes** → Data saved to `req.session.formData[stepName]`
5. **Action determines next step**:
   - `action=continue` → Redirect to next step
   - `action=saveForLater` → Redirect to dashboard

#### Key Functions:

```typescript
// From helpers.ts - saves data to session
export const setFormData = (req: Request, stepName: string, data: Record<string, unknown>): void => {
  if (!req.session.formData) {
    req.session.formData = {};
  }
  req.session.formData[stepName] = data;
};

// Retrieve data from session
export const getFormData = (req: Request, stepName: string): Record<string, unknown> => {
  return req.session.formData?.[stepName] || {};
};
```

### Automatic Features

✅ **Pre-population**: When user returns to a step, fields are automatically pre-populated from session  
✅ **Save for Later**: Data persists when user clicks "Save for Later"  
✅ **Cross-field Validation**: All step data is available for validation  
✅ **Data Processing**: Checkboxes normalized, date fields consolidated automatically  

### Manual Persistence (Manual Step Definition)

If you're **not** using `createFormStep`, you must handle persistence manually:

```typescript
postController: {
  post: async (req: Request, res: Response) => {
    // Manually save to session
    if (!req.session.formData) {
      req.session.formData = {};
    }
    req.session.formData[stepName] = req.body;
    
    // Handle save for later
    if (req.body.action === 'saveForLater') {
      return res.redirect(303, DASHBOARD_ROUTE);
    }
    
    // Continue to next step
    const redirectPath = await stepNavigation.getNextStepUrl(req, stepName, req.body);
    res.redirect(303, redirectPath);
  },
}
```

### Accessing Saved Data

#### Within `createFormStep`:

Form data is automatically loaded and merged into field values. You can access it in `extendGetContent`:

```typescript
extendGetContent: (req: Request) => {
  // Access this step's data
  const currentStepData = req.session.formData?.['current-step-name'];
  
  // Access another step's data
  const previousStepData = req.session.formData?.['previous-step-name'];
  
  return {
    someValue: previousStepData?.someField || 'default',
  };
}
```

#### In validation functions:

```typescript
validate: (value, formData, allData) => {
  // formData = current step's form submission
  // allData = merged data from ALL steps in session
  
  if (allData.previousStep?.someField === 'value') {
    return 'Error based on previous step data';
  }
  return undefined;
}
```

### CCD Case Data

CCD (Case Data) is stored separately from form data:

**Location**: `req.session.ccdCase`

```typescript
// Example CCD structure
req.session.ccdCase = {
  id: '1234567890',
  data: {
    claimantName: 'Treetops Housing',
    defendantName: 'John Smith',
    caseReference: 'CASE-12345',
    // ... other case fields
  }
}
```

**Accessing CCD data**:

```typescript
extendGetContent: (req: Request) => {
  const caseData = req.session.ccdCase?.data;
  const claimantName = (caseData?.claimantName as string) || 'Default';
  
  return {
    claimantName,
  };
}
```

### Data Lifecycle Summary

```
User fills form
     ↓
Submits (POST)
     ↓
Validation runs
     ↓
   ┌─────────────┐
   │ Valid?      │
   └─────────────┘
        ↓
   ┌────┴────┐
   │         │
 YES        NO
   │         │
   ↓         ↓
Save to   Re-render
session   with errors
   │      (no save)
   ↓
Redirect to
next step or
dashboard
```

### Important Notes

⚠️ **Session data is temporary** - It exists only during the user's session and is lost if:
- User closes browser (depending on session config)
- Session expires
- Server restarts (if using memory store)

⚠️ **Form data vs CCD data**:
- `req.session.formData` = User's current journey form submissions
- `req.session.ccdCase` = Case data from CCD system (persistent, from backend)

⚠️ **Validation must pass** - Data is ONLY saved after successful validation in `createFormStep`

---

## Dynamic Content Patterns

### Overview

Dynamic content refers to data that changes based on:
- User session data
- CCD case information
- Computed values
- API responses

This section provides **proven patterns** from the codebase for implementing dynamic content correctly.

### Pattern 1: Simple Dynamic Values

**Use Case**: Display user name, case reference, or other single values.

**Example** (`defendant-name-confirmation`):

```typescript
extendGetContent: (req: Request) => {
  // Pull from session
  const defendantName = req.session.defendantName ?? 'Unknown';
  
  // Pull from CCD
  const organisationName = req.session.ccdCase?.data?.organisationName || 'Treetops';
  
  return {
    defendantName,
    organisationName,
  };
}
```

**Template Usage**:

```nunjucks
<p class="govuk-body">Is your name {{ defendantName }}?</p>
<p class="govuk-body">Claim from {{ organisationName }}</p>
```

### Pattern 2: Dynamic Arrays with Interpolation

**Use Case**: Display a list where items contain dynamic values (e.g., claimant name in bullet points).

**⚠️ Common Mistake**: Using `req.t` or trying automatic interpolation with arrays.

**✅ Correct Pattern** (`non-rent-arrears-dispute`):

```typescript
import { getTranslationFunction } from '../../../modules/steps';

extendGetContent: (req: Request) => {
  // 1. Get dynamic value from session/CCD
  const claimantName = (req.session?.ccdCase?.data?.claimantName as string) || 'Treetops Housing';
  
  // 2. Get step-scoped translation function
  const t = getTranslationFunction(req, 'non-rent-arrears-dispute', ['common']);
  
  // 3. Get array from translations
  const includesListRaw = t('includesList', { returnObjects: true }) as string[];
  
  // 4. Manually interpolate dynamic values
  const includesList = includesListRaw.map(item => 
    item.replace('{{claimantName}}', claimantName)
  );
  
  return {
    includesList,
  };
}
```

**Translation File**:

```json
{
  "includesList": [
    "{{claimantName}}'s grounds for possession (their reasons for making the claim)",
    "any documents they've uploaded to support their claim",
    "any other information they've given as part of their claim"
  ]
}
```

**Template Usage**:

```nunjucks
<ul class="govuk-list govuk-list--bullet">
  {% for item in includesList %}
    <li>{{ item }}</li>
  {% endfor %}
</ul>
```

**Why This Pattern?**:
- ✅ Proper step namespace scoping
- ✅ Type-safe array handling
- ✅ Explicit interpolation (no surprises)
- ✅ Works on both GET and POST

### Pattern 3: Dynamic Text with Inline Interpolation

**Use Case**: Inject dynamic values directly into translated strings.

**Example** (`dispute-claim-interstitial`):

```typescript
getController: () => {
  return createGetController(
    'respond-to-claim/dispute-claim-interstitial/disputeClaimInterstitial.njk',
    stepName,
    async (req: Request) => {
      // Get dynamic value
      const claimantName = (req.session?.ccdCase?.data?.claimantName as string) || 'Treetops Housing';

      const t = req.t;
      if (!t) {
        throw new Error('Translation function not available');
      }

      return {
        backUrl: await stepNavigation.getBackUrl(req, stepName),
        dashboardUrl: DASHBOARD_ROUTE,
        // i18next automatically interpolates {{ }} placeholders
        heading: t('heading', { claimantName }),
        paragraph1: t('paragraph1', { claimantName }),
      };
    },
    'respondToClaim'
  );
}
```

**Translation File**:

```json
{
  "heading": "Respond to {{claimantName}}'s claim",
  "paragraph1": "{{claimantName}} has made a claim against you..."
}
```

**When to Use**:
- ✅ Simple string interpolation
- ✅ Single values in text
- ✅ Using manual step definition

**Limitation**: Doesn't work reliably for arrays in `createFormStep`.

### Pattern 4: Computed/Conditional Dynamic Values

**Use Case**: Generate values based on logic or conditions.

**Example**:

```typescript
extendGetContent: (req: Request) => {
  const caseData = req.session.ccdCase?.data;
  
  // Compute display values
  const isWelshProperty = caseData?.propertyLocation === 'Wales';
  const additionalInfoNeeded = isWelshProperty;
  
  // Format dates
  const hearingDate = caseData?.hearingDate 
    ? new Date(caseData.hearingDate as string).toLocaleDateString('en-GB')
    : 'Not set';
  
  // Conditional text
  const warningText = additionalInfoNeeded 
    ? 'Additional information is required for Welsh properties'
    : '';
  
  return {
    isWelshProperty,
    hearingDate,
    warningText,
  };
}
```

### Pattern 5: Multiple Dynamic Values in Arrays

**Use Case**: Replace multiple placeholders in list items.

**Example**:

```typescript
extendGetContent: (req: Request) => {
  const claimantName = req.session.ccdCase?.data?.claimantName || 'Landlord';
  const propertyAddress = req.session.ccdCase?.data?.address || '123 Main St';
  
  const t = getTranslationFunction(req, 'step-name', ['common']);
  const listRaw = t('myList', { returnObjects: true }) as string[];
  
  const myList = listRaw.map(item => 
    item
      .replace('{{claimantName}}', claimantName)
      .replace('{{propertyAddress}}', propertyAddress)
  );
  
  return {
    myList,
    claimantName,
    propertyAddress,
  };
}
```

### Pattern 6: Dynamic Link Interpolation

**Use Case**: Insert a dynamic link into a paragraph.

**Example** (`non-rent-arrears-dispute`):

**Step Config**:

```typescript
translationKeys: {
  introParagraph: 'introParagraph',
  introLinkText: 'introLinkText',
  introLinkHref: 'introLinkHref',
}
```

**Translation**:

```json
{
  "introParagraph": "You should {{link}} to see if there's any other parts of the claim that are incorrect or you disagree with.",
  "introLinkText": "view the claim (opens in new tab)",
  "introLinkHref": "#"
}
```

**Template**:

```nunjucks
<p class="govuk-body">
  {{ introParagraph | replace("{{link}}", '<a href="' ~ introLinkHref ~ '" class="govuk-link" target="_blank" rel="noopener noreferrer">' ~ introLinkText ~ '</a>') | safe }}
</p>
```

**Pattern Breakdown**:
1. Translation has `{{link}}` placeholder
2. Link text and href are separate translation keys
3. Template uses Nunjucks `replace` filter to inject the anchor tag
4. `| safe` allows HTML rendering

### Pattern Comparison Table

| Pattern | Use Case | Complexity | Recommended For |
|---------|----------|------------|-----------------|
| Pattern 1 | Simple values | Low | Single dynamic values |
| Pattern 2 | Dynamic arrays | Medium | Lists with interpolation |
| Pattern 3 | Inline text | Low | Manual step definition |
| Pattern 4 | Computed values | Medium | Logic-based content |
| Pattern 5 | Multi-value arrays | High | Complex list interpolation |
| Pattern 6 | Dynamic links | Medium | Links in paragraphs |

### Best Practices

✅ **Always use `getTranslationFunction`** in `extendGetContent`  
✅ **Manually interpolate arrays** - Don't rely on automatic interpolation  
✅ **Type-cast translation results** - `as string[]` or `as string`  
✅ **Provide defaults** - Always have fallback values  
✅ **Keep logic in `extendGetContent`** - Not in templates  
✅ **Test with missing data** - Ensure graceful degradation  

❌ **Don't use `req.t`** directly in `extendGetContent`  
❌ **Don't put dynamic logic in templates** - Keep templates simple  
❌ **Don't assume session data exists** - Always check with `?.` or `||`  

### Debugging Dynamic Content

**Problem**: Dynamic value not showing

1. Check `extendGetContent` returns the value
2. Verify variable name matches template usage
3. Check session data exists: `console.log(req.session)`
4. Ensure `getTranslationFunction` uses correct step name

**Problem**: Array shows as "i, n, c, l, u, d, e..."

1. Confirm `returnObjects: true` in translation call
2. Type-cast result: `as string[]`
3. Use `getTranslationFunction`, not `req.t`

**Problem**: Interpolation not working

1. For arrays: Use manual `.map()` interpolation
2. Check placeholder syntax: `{{variableName}}`
3. Verify variable name matches exactly

---

## Field Configuration Guide

### Basic Field Types

#### Text Input

```typescript
{
  name: 'firstName',
  type: 'text',
  required: true,
  maxLength: 100,
  translationKey: {
    label: 'firstNameLabel',
    hint: 'firstNameHint',
  },
  classes: 'govuk-input--width-20',
  attributes: {
    autocomplete: 'given-name',
    spellcheck: false,
  },
}
```

#### Textarea

```typescript
{
  name: 'description',
  type: 'textarea',
  required: true,
  maxLength: 500,
  translationKey: {
    label: 'descriptionLabel',
  },
  attributes: {
    rows: 5,
  },
}
```

#### Character Count (with word limit)

```typescript
{
  name: 'detailedExplanation',
  type: 'character-count',
  required: true,
  translationKey: {
    label: 'explanationLabel',
  },
  attributes: {
    maxwords: 6500,  // Word limit
    rows: 8,
  },
}
```

**Note**: Word count validation is automatic - don't add `maxLength` for word-limited fields.

#### Radio Buttons

```typescript
{
  name: 'confirmName',
  type: 'radio',
  required: true,
  translationKey: {
    label: 'confirmNameLabel',
  },
  legendClasses: 'govuk-fieldset__legend--m',
  options: [
    {
      value: 'yes',
      translationKey: 'yesOption',
    },
    {
      value: 'no',
      translationKey: 'noOption',
    },
  ],
}
```

#### Conditional Fields (Radio with SubFields)

```typescript
{
  name: 'disputeClaim',
  type: 'radio',
  required: true,
  translationKey: {
    label: 'disputeQuestion',
  },
  options: [
    {
      value: 'yes',
      translationKey: 'yesOption',
      subFields: {
        // These fields only show when "yes" is selected
        disputeDetails: {
          name: 'disputeDetails',
          type: 'character-count',
          required: true,  // Required only when visible
          translationKey: {
            label: 'disputeDetailsLabel',
          },
          attributes: {
            maxwords: 6500,
            rows: 5,
          },
        },
      },
    },
    {
      value: 'no',
      translationKey: 'noOption',
    },
  ],
}
```

**Key Point**: SubFields are automatically validated only when their parent option is selected.

#### Date Input

```typescript
{
  name: 'dateOfBirth',
  type: 'date',
  required: true,
  noFutureDate: true,  // Disallow future dates
  translationKey: {
    label: 'dateOfBirthLabel',
    hint: 'dateOfBirthHint',
  },
  legendClasses: 'govuk-fieldset__legend--m',
}
```

### Field Validation Options

#### Required Validation

```typescript
// Simple required
required: true

// Conditional required (function)
required: (formData, allData) => {
  // Only required if another field has a specific value
  return formData.needsAddress === 'yes';
}
```

#### Pattern Validation (Regex)

```typescript
{
  name: 'postcode',
  type: 'text',
  pattern: '^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$',
  errorMessage: 'errors.invalidPostcode',
}
```

#### Custom Validator

```typescript
{
  name: 'postcode',
  type: 'text',
  validator: (value): boolean | string => {
    if (typeof value === 'string' && value.trim()) {
      const isValid = isPostalCode(value.trim(), 'GB');
      if (!isValid) {
        return 'Enter a valid UK postcode';
      }
    }
    return true;  // Valid
  },
}
```

**Returns**:
- `true` = valid
- `false` = invalid (uses default error message)
- `string` = invalid with custom error message

#### Cross-Field Validation

```typescript
{
  name: 'confirmEmail',
  type: 'text',
  validate: (value, formData, allData) => {
    if (value !== formData.email) {
      return 'Email addresses must match';
    }
    return undefined;  // Valid
  },
}
```

---

## Validation Patterns

### Automatic Validation

When using `createFormStep`, validation runs automatically on form submission:

1. **Required fields** - Checked first
2. **Pattern validation** - Regex patterns
3. **MaxLength** - Character limit
4. **MaxWords** - Word count (for character-count fields)
5. **Custom validators** - Field-level validation
6. **Cross-field validation** - `validate` functions

### Error Message Priority

Error messages are resolved in this order:

1. **Step-specific error** - `errors.fieldName` in step JSON
2. **Field errorMessage** - `field.errorMessage` in config
3. **Translation defaults** - `errors.defaultRequired`, etc. in common.json
4. **Hardcoded fallback** - "This field is required"

### Validation Translation Keys

**In your step's JSON file**:

```json
{
  "errors": {
    "myField": "You must enter a value for my field",
    "anotherField": "Custom validation message"
  }
}
```

**Common validation errors** (`locales/en/common.json`):

```json
{
  "errors": {
    "defaultRequired": "This field is required",
    "defaultInvalid": "Invalid format",
    "defaultMaxLength": "Must be {max} characters or fewer",
    "defaultMaxWords": "Must be {max} words or fewer"
  }
}
```

### Conditional Field Validation

SubFields are **only validated when visible**:

```typescript
options: [
  {
    value: 'yes',
    subFields: {
      details: {
        name: 'details',
        required: true,  // Only required when "yes" selected
      },
    },
  },
  {
    value: 'no',
    // No subfields - "details" won't be validated
  },
]
```

---

## Custom Templates

### When to Use

Use a custom template when you need:
- ✅ Custom content (paragraphs, lists) before/after form
- ✅ Complex layouts
- ✅ Multiple sections
- ✅ Content that doesn't fit the default formBuilder layout

### How to Create

1. **Configure in step**:

```typescript
export const step: StepDefinition = createFormStep({
  stepName: 'my-step',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/myCustomTemplate.njk`,  // ← Custom template
  translationKeys: {
    paragraph1: 'paragraph1',
    listHeading: 'listHeading',
  },
  fields: [ /* ... */ ],
});
```

2. **Create template** (`myCustomTemplate.njk`):

```nunjucks
{% extends "stepsTemplate.njk" %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/radios/macro.njk" import govukRadios %}
{% from "govuk/components/character-count/macro.njk" import govukCharacterCount %}

{% block pageTitle %}
  {{ title }} - HM Courts &amp; Tribunals Service &ndash; GOV.UK
{% endblock %}

{% block mainContent %}
  {# Error summary - always include #}
  {% if errorSummary %}
    {{ govukErrorSummary(errorSummary) }}
  {% endif %}

  {# Caption and title #}
  {% if caption %}
    <span class="govuk-caption-xl">{{ caption }}</span>
  {% endif %}

  <h1 class="govuk-heading-l">{{ title }}</h1>

  {# Custom content - your paragraphs, lists, etc. #}
  <p class="govuk-body">{{ paragraph1 }}</p>
  
  <p class="govuk-body">{{ listHeading }}</p>
  <ul class="govuk-list govuk-list--bullet">
    {% for item in myList %}
      <li>{{ item }}</li>
    {% endfor %}
  </ul>

  {# Form with fields - render from createFormStep #}
  <form method="post" action="{{ url }}" novalidate>
    {% for field in fields %}
      {% if field.component and field.componentType %}
        {% if field.componentType == 'radios' %}
          {{ govukRadios(field.component) }}
        {% elif field.componentType == 'characterCount' %}
          {{ govukCharacterCount(field.component) }}
        {% elif field.componentType == 'input' %}
          {{ govukInput(field.component) }}
        {% elif field.componentType == 'textarea' %}
          {{ govukTextarea(field.component) }}
        {% elif field.componentType == 'dateInput' %}
          {{ govukDateInput(field.component) }}
        {% elif field.componentType == 'checkboxes' %}
          {{ govukCheckboxes(field.component) }}
        {% endif %}
      {% endif %}
    {% endfor %}
    
    {# Buttons #}
    <div class="govuk-button-group">
      {{ govukButton({
        text: continue,
        attributes: { type: 'submit', name: 'action', value: 'continue' }
      }) }}
      {{ govukButton({
        text: saveForLater,
        classes: 'govuk-button--secondary',
        attributes: { type: 'submit', name: 'action', value: 'saveForLater' }
      }) }}
    </div>
  </form>
{% endblock %}
```

### Important Template Variables

These are automatically available in your template:

- `title` - Page title (from translations)
- `caption` - Caption (from translationKeys)
- `fields` - Array of processed field configs with validation
- `errorSummary` - Error summary component config (if errors)
- `continue` - "Continue" button text (from common.json)
- `saveForLater` - "Save for later" button text
- `url` - Current URL for form action
- `backUrl` - Back link URL
- `dashboardUrl` - Dashboard URL

Plus anything you return from `extendGetContent`.

---

## Common Gotchas & Quirks

### 1. Array Translations Rendering as Characters

**Problem**: A list renders as individual letters (i, n, c, l, u, d, e, s...)

**Cause**: The translation function returned a string instead of an array.

**Fix**:
```typescript
// ❌ BAD
const t = req.t;
const items = t('myList', { returnObjects: true });

// ✅ GOOD
const t = getTranslationFunction(req, 'step-name', ['common']);
const items = t('myList', { returnObjects: true }) as string[];
```

### 2. Dynamic Values in Arrays Not Interpolating

**Problem**: `{{dynamicValue}}` shows literally in list items instead of being replaced.

**Cause**: Automatic interpolation doesn't work for arrays.

**Fix**: Manually interpolate:
```typescript
const items = t('myList', { returnObjects: true }) as string[];
const interpolated = items.map(item => 
  item.replace('{{userName}}', userName)
);
```

### 3. SubFields Not Validating

**Problem**: Conditional fields don't show validation errors.

**Cause**: Field name doesn't match subField definition.

**Fix**: Ensure parent option `value` matches and subField `name` is unique:
```typescript
options: [
  {
    value: 'yes',  // ← This value
    subFields: {
      mySubField: {
        name: 'mySubField',  // ← Must match this key and name
        required: true,
      },
    },
  },
]
```

### 4. Validation Not Running

**Problem**: Form submits without validating fields.

**Cause**: Using manual step definition instead of `createFormStep`.

**Fix**: Convert to `createFormStep` or implement validation manually in `postController`.

### 5. Word Count Not Validating

**Problem**: Users can submit forms with too many words.

**Cause**: Using `maxLength` instead of `maxwords` in attributes.

**Fix**:
```typescript
{
  type: 'character-count',
  // ❌ DON'T use maxLength for word count
  // maxLength: 6500,
  
  // ✅ DO use maxwords in attributes
  attributes: {
    maxwords: 6500,
    rows: 5,
  },
}
```

### 6. Custom Template Not Loading

**Problem**: Template path incorrect, page shows blank.

**Cause**: Using relative path instead of `__dirname`.

**Fix**:
```typescript
// ❌ BAD
customTemplate: './myTemplate.njk'

// ✅ GOOD
customTemplate: `${__dirname}/myTemplate.njk`
```

### 7. Translation Namespace Not Loading

**Problem**: Translations show as keys (e.g., "myLabel" instead of "My Label").

**Cause**: Step name doesn't match folder name or JSON file name.

**Fix**: Ensure these all match:
- Folder: `src/main/steps/respond-to-claim/my-step-name/`
- JSON: `locales/en/respondToClaim/myStepName.json`
- Config: `stepName: 'my-step-name'`

### 8. Fields Not Appearing in Template

**Problem**: Form fields don't render in custom template.

**Cause**: Missing GOV.UK component imports or wrong componentType.

**Fix**: Import all needed components at top of template:
```nunjucks
{% from "govuk/components/radios/macro.njk" import govukRadios %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/character-count/macro.njk" import govukCharacterCount %}
```

---

## Complete Examples

### Example 1: Simple Form with Default Template

**Step: `free-legal-advice/index.ts`**

```typescript
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'free-legal-advice',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  fields: [
    {
      name: 'hadLegalAdvice',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: {
        label: 'question',
      },
      options: [
        { value: 'yes', translationKey: 'options.yes' },
        { value: 'no', translationKey: 'options.no' },
        { divider: 'options.or' },
        { value: 'preferNotToSay', translationKey: 'options.preferNotToSay' },
      ],
    },
  ],
});
```

**Translation: `locales/en/respondToClaim/freeLegalAdvice.json`**

```json
{
  "title": "Have you had any free legal advice?",
  "question": "Have you had any free legal advice?",
  "options": {
    "yes": "Yes",
    "no": "No",
    "or": "or",
    "preferNotToSay": "Prefer not to say"
  },
  "errors": {
    "hadLegalAdvice": "You must say if you've had any free legal advice"
  }
}
```

### Example 2: Custom Template with Dynamic Content

**Step: `non-rent-arrears-dispute/index.ts`**

```typescript
import type { Request } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'non-rent-arrears-dispute',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/nonRentArrearsDispute.njk`,
  translationKeys: {
    introParagraph: 'introParagraph',
    introLinkText: 'introLinkText',
    introLinkHref: 'introLinkHref',
    includesHeading: 'includesHeading',
    caption: 'captionHeading',
  },
  extendGetContent: (req: Request) => {
    const claimantName = (req.session?.ccdCase?.data?.claimantName as string) || 'Treetops Housing';
    
    const t = getTranslationFunction(req, 'non-rent-arrears-dispute', ['common']);
    
    const includesListRaw = t('includesList', { returnObjects: true }) as string[];
    const includesList = includesListRaw.map(item => 
      item.replace('{{claimantName}}', claimantName)
    );
    
    return {
      includesList,
    };
  },
  fields: [
    {
      name: 'disputeClaim',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'disputeQuestion',
      },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        {
          value: 'yes',
          translationKey: 'disputeOptions.yes',
          subFields: {
            disputeDetails: {
              name: 'disputeDetails',
              type: 'character-count',
              required: true,
              translationKey: {
                label: 'disputeDetails.label',
              },
              attributes: {
                maxwords: 6500,
                rows: 5,
              },
            },
          },
        },
        {
          value: 'no',
          translationKey: 'disputeOptions.no',
        },
      ],
    },
  ],
});
```

**Template: `nonRentArrearsDispute.njk`**

```nunjucks
{% extends "stepsTemplate.njk" %}
{% from "govuk/components/error-summary/macro.njk" import govukErrorSummary %}
{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/radios/macro.njk" import govukRadios %}
{% from "govuk/components/character-count/macro.njk" import govukCharacterCount %}

{% block pageTitle %}
  {{ title }} - HM Courts &amp; Tribunals Service &ndash; GOV.UK
{% endblock %}

{% block mainContent %}
  {% if errorSummary %}
    {{ govukErrorSummary(errorSummary) }}
  {% endif %}

  {% if caption %}
    <span class="govuk-caption-xl">{{ caption }}</span>
  {% endif %}

  <h1 class="govuk-heading-l">{{ title }}</h1>

  <p class="govuk-body">
    {{ introParagraph | replace("{{link}}", '<a href="' ~ introLinkHref ~ '" class="govuk-link" target="_blank" rel="noopener noreferrer">' ~ introLinkText ~ '</a>') | safe }}
  </p>
  
  <p class="govuk-body">{{ includesHeading }}</p>
  <ul class="govuk-list govuk-list--bullet">
    {% for item in includesList %}
      <li>{{ item }}</li>
    {% endfor %}
  </ul>

  <form method="post" action="{{ url }}" novalidate>
    {% for field in fields %}
      {% if field.component and field.componentType %}
        {% if field.componentType == 'radios' %}
          {{ govukRadios(field.component) }}
        {% elif field.componentType == 'characterCount' %}
          {{ govukCharacterCount(field.component) }}
        {% endif %}
      {% endif %}
    {% endfor %}
    
    <div class="govuk-button-group">
      {{ govukButton({
        text: continue,
        attributes: { type: 'submit', name: 'action', value: 'continue' }
      }) }}
      {{ govukButton({
        text: saveForLater,
        classes: 'govuk-button--secondary',
        attributes: { type: 'submit', name: 'action', value: 'saveForLater' }
      }) }}
    </div>
  </form>
{% endblock %}
```

### Example 3: Conditional Fields with Validation

**Step: `defendant-name-confirmation/index.ts`**

```typescript
import type { Request } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'defendant-name-confirmation',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/defendantNameConfirmation.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  extendGetContent: (req: Request) => {
    const defendantName = req.session.defendantName ?? '';
    const organisationName = 'Treetops';

    return {
      defendantName,
      organisationName,
    };
  },
  fields: [
    {
      name: 'nameConfirmation',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'nameConfirmationLabel',
      },
      legendClasses: 'govuk-fieldset__legend--l',
      options: [
        {
          value: 'yes',
          translationKey: 'yesOption',
        },
        {
          value: 'no',
          translationKey: 'noOption',
          subFields: {
            firstName: {
              name: 'firstName',
              type: 'text',
              required: true,
              errorMessage: 'errors.firstName',
              translationKey: {
                label: 'firstNameLabel',
              },
              attributes: {
                autocomplete: 'given-name',
              },
            },
            lastName: {
              name: 'lastName',
              type: 'text',
              required: true,
              errorMessage: 'errors.lastName',
              translationKey: {
                label: 'lastNameLabel',
              },
              attributes: {
                autocomplete: 'family-name',
              },
            },
          },
        },
      ],
    },
  ],
});
```

### Example 4: Manual Interstitial Page

**Step: `dispute-claim-interstitial/index.ts`**

```typescript
import type { Request, Response } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { DASHBOARD_ROUTE } from '../../../routes/dashboard';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

const stepName = 'dispute-claim-interstitial';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/dispute-claim-interstitial`,
  name: stepName,
  view: 'respond-to-claim/dispute-claim-interstitial/disputeClaimInterstitial.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/dispute-claim-interstitial/disputeClaimInterstitial.njk',
      stepName,
      async (req: Request) => {
        const claimantName = (req.session?.ccdCase?.data?.claimantName as string) || 'Treetops Housing';

        const t = req.t;
        if (!t) {
          throw new Error('Translation function not available');
        }

        return {
          backUrl: await stepNavigation.getBackUrl(req, stepName),
          dashboardUrl: DASHBOARD_ROUTE,
          heading: t('heading', { claimantName }),
          paragraph1: t('paragraph1', { claimantName }),
        };
      },
      'respondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const redirectPath = await stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
```

---

## Quick Reference Checklist

### Starting a New Form Step

- [ ] Create folder: `src/main/steps/[journey]/[step-name]/`
- [ ] Create `index.ts` with `createFormStep`
- [ ] Create translation files: `locales/en/[journey]/[stepName].json`
- [ ] Define fields with validation rules
- [ ] Add error messages to translations
- [ ] If custom layout needed, create `.njk` template
- [ ] If dynamic data needed, add `extendGetContent`
- [ ] Register step in journey's `stepRegistry.ts`
- [ ] Add step to `flowConfig` stepOrder

### Debugging Checklist

**Configuration Issues:**
- [ ] Step name matches folder name?
- [ ] Translation JSON file named correctly (camelCase)?
- [ ] Field names unique and match subField keys?
- [ ] GOV.UK components imported in custom template?
- [ ] Error translation keys defined in step JSON?
- [ ] Required fields have `required: true` or function?
- [ ] Word count using `maxwords` in attributes (not `maxLength`)?

**Dynamic Content Issues:**
- [ ] Using `getTranslationFunction` for arrays in `extendGetContent`?
- [ ] Arrays type-cast as `as string[]`?
- [ ] Dynamic values have fallback defaults (using `||` or `??`)?
- [ ] Session data accessed safely with `?.` operator?
- [ ] Manual interpolation used for arrays (not automatic)?

**Data Persistence Issues:**
- [ ] Using `createFormStep` (auto-saves) or manual `setFormData`?
- [ ] Validation passing before expecting data in session?
- [ ] Checking correct session location (`formData` vs `ccdCase`)?
- [ ] Step data accessible via `req.session.formData[stepName]`?

---

## Key Takeaways: Data & Dynamic Content

### 🔐 Data Persistence

**Where form data lives:**
```typescript
req.session.formData[stepName]  // ← User's form submissions
req.session.ccdCase.data        // ← Case data from CCD system
```

**When data is saved:**
- ✅ `createFormStep`: Automatic after validation passes
- ❌ Manual step: You must call `setFormData` yourself

**Important:**
- Data is NOT saved if validation fails
- Data persists only during user session
- All steps' data available via `allData` in validation

### 🎨 Dynamic Content

**Always use this pattern for arrays:**
```typescript
import { getTranslationFunction } from '../../../modules/steps';

extendGetContent: (req: Request) => {
  const t = getTranslationFunction(req, 'step-name', ['common']);
  const listRaw = t('myList', { returnObjects: true }) as string[];
  const list = listRaw.map(item => item.replace('{{value}}', dynamicValue));
  return { list };
}
```

**Golden Rules:**
1. ✅ Use `getTranslationFunction` in `extendGetContent` (not `req.t`)
2. ✅ Manually interpolate arrays with `.map()` and `.replace()`
3. ✅ Always provide defaults: `req.session?.data || 'fallback'`
4. ✅ Type-cast translation results: `as string[]`

---

## Further Resources

- **GOV.UK Design System**: https://design-system.service.gov.uk/
- **Nunjucks Documentation**: https://mozilla.github.io/nunjucks/
- **i18next Documentation**: https://www.i18next.com/

---

**Document Version**: 1.1  
**Last Updated**: 2026-02-05  
**Maintainer**: Development Team

**Version History:**
- v1.1 (2026-02-05): Added Data Persistence & Dynamic Content Patterns sections
- v1.0 (2026-02-05): Initial comprehensive guide

---

## Contributing to This Guide

If you discover additional quirks, patterns, or gotchas, please update this document and share with the team. This guide should evolve as the codebase grows.
