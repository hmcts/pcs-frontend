# Migration Example: enter-age Step

This document shows a side-by-side comparison of migrating the `enter-age` step from StepDefinition to Journey Engine.

## Current Implementation (StepDefinition)

### Files Required:

1. `src/main/steps/userJourney/enter-age/index.ts` (49 lines)
2. `src/main/views/steps/userJourney/enterAge.njk` (53 lines)
3. `src/main/assets/locales/en/userJourney/enterAge.json` (10 lines)
4. `src/main/assets/locales/cy/userJourney/enterAge.json` (10 lines)
5. Updates to `flow.config.ts`
6. Updates to `steps/index.ts`

**Total: ~130 lines across 6 files**

## Migrated Implementation (Journey Engine)

### Files Required:

1. `src/main/journeys/userJourney/steps/enter-age/step.ts` (25 lines)
2. Translation keys in `userJourney.json` (already exists)

**Total: ~25 lines in 1 file**

## Step-by-Step Migration

### Step 1: Create Journey Structure

```bash
mkdir -p src/main/journeys/userJourney/steps/enter-age
```

### Step 2: Create Step Definition

```typescript
// src/main/journeys/userJourney/steps/enter-age/step.ts
import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'enter-age',
  type: 'form',
  fields: {
    age: {
      type: 'radios',
      fieldset: {
        legend: {
          text: 'enterAge.question',
          isPageHeading: true,
          classes: 'govuk-fieldset__legend--l',
        },
      },
      items: [
        { value: 'yes', text: 'enterAge.options.yes' },
        { value: 'no', text: 'enterAge.options.no' },
      ],
      validate: {
        required: true,
        customMessage: 'enterAge.errors.age',
      },
    },
    continueButton: {
      type: 'button',
      text: 'buttons.continue',
      attributes: {
        type: 'submit',
      },
    },
  },
  next: {
    when: (stepData: Record<string, unknown>) => stepData['age'] === 'yes',
    goto: 'enter-ground',
    else: 'ineligible',
  },
};

export default step;
```

### Step 3: Register in Journey

```typescript
// src/main/journeys/userJourney/index.ts
import { JourneyDraft } from '../../modules/journey/engine/schema';
import enterAge from './steps/enter-age/step';
// ... other imports

const journey: JourneyDraft = {
  meta: {
    name: 'User Journey',
    description: 'Main user application journey',
    version: '1.0.0',
  },
  steps: {
    enterAge,
    // ... other steps
  },
  config: {
    i18nNamespace: 'userJourney',
    store: {
      type: 'session',
    },
    auth: {
      required: true,
    },
  },
};

export default journey;
```

### Step 4: Update Translations

```json
// src/main/assets/locales/en/userJourney.json
{
  "enterAge": {
    "question": "Are you over 18?",
    "options": {
      "yes": "Yes",
      "no": "No"
    },
    "errors": {
      "age": "Select an option to continue"
    }
  },
  "buttons": {
    "continue": "Continue"
  }
}
```

### Step 5: Remove Old Files

```bash
# Delete old StepDefinition files
rm -rf src/main/steps/userJourney/enter-age
rm src/main/views/steps/userJourney/enterAge.njk
rm src/main/assets/locales/en/userJourney/enterAge.json
rm src/main/assets/locales/cy/userJourney/enterAge.json

# Remove from flow.config.ts (if using Journey Engine routing)
# Remove from steps/index.ts
```

## Benefits

### Code Reduction

- **Before:** 130 lines across 6 files
- **After:** 25 lines in 1 file
- **Reduction:** 80%

### Maintenance

- **Before:** Update 6 files for changes
- **After:** Update 1 file for changes

### Type Safety

- **Before:** Runtime errors possible
- **After:** Compile-time validation with Zod

### Consistency

- **Before:** Each step has different patterns
- **After:** All steps follow same pattern

## Testing Checklist

After migration, verify:

- [ ] Form renders correctly
- [ ] Radio buttons work
- [ ] Validation shows error when nothing selected
- [ ] "Yes" → routes to `enter-ground`
- [ ] "No" → routes to `ineligible`
- [ ] Back button works
- [ ] Translations work (en + cy)
- [ ] Form data persists in session
- [ ] Error summary displays correctly

## Next Steps

1. Migrate `enter-ground` step (similar pattern)
2. Migrate `enter-user-details` step (text fields)
3. Migrate `enter-address` step (address lookup - may need custom template)
4. Continue with remaining steps
