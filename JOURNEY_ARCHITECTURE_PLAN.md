# Journey Architecture & Scaling Plan

## Executive Summary

You currently have **two journey systems** in your codebase:

1. **Journey Engine (Newer)** - Used in `eligibility` journey
   - Declarative, configuration-driven
   - Auto-generates views, validation, routing
   - Type-safe with Zod schemas
   - Less boilerplate

2. **StepDefinition System (Older)** - Used in `userJourney`
   - Manual step creation
   - Full control, more boilerplate
   - Custom controllers for complex logic

## Current State Analysis

### Journey Engine (Recommended for Scale)

**Pros:**

- ✅ **90% less boilerplate** - No manual controllers, views, or validation
- ✅ **Type-safe** - Zod schema validation catches errors at compile time
- ✅ **Auto-generated views** - Uses smart template resolution
- ✅ **Built-in features** - Validation, conditional navigation, summary pages
- ✅ **Consistent patterns** - Enforces best practices
- ✅ **Easier maintenance** - Changes in one place (step config)
- ✅ **Better for non-developers** - Can be configured by business analysts

**Cons:**

- ⚠️ Less flexibility for complex custom logic
- ⚠️ Learning curve for the schema
- ⚠️ Requires migration from existing StepDefinition system

**Example:**

```typescript
// eligibility/steps/page2/step.ts - Just 40 lines!
const step: StepDraft = {
  id: 'page2',
  type: 'form',
  fields: {
    age: {
      type: 'radios',
      fieldset: { legend: { text: 'page2.ageLabel', isPageHeading: true } },
      items: [
        { value: 'yes', text: 'page2.ageOptions.yes' },
        { value: 'no', text: 'page2.ageOptions.no' },
      ],
      validate: { required: true },
    },
  },
  next: {
    when: stepData => stepData['age'] === 'yes',
    goto: 'page3',
    else: 'ineligible',
  },
};
```

### StepDefinition System (Current userJourney)

**Pros:**

- ✅ Full control over every aspect
- ✅ Easy to add custom business logic
- ✅ Familiar Express patterns
- ✅ Already working

**Cons:**

- ❌ **High boilerplate** - ~70 lines per step (controller + view + translations)
- ❌ **Manual validation** - Must write validation for each field
- ❌ **Manual views** - Must create Nunjucks templates
- ❌ **Manual routing** - Must register in flow.config.ts and index.ts
- ❌ **Error-prone** - Easy to miss steps, typos in field names
- ❌ **Hard to scale** - 50+ steps = 3500+ lines of repetitive code

**Example:**

```typescript
// userJourney/enter-age/index.ts - 49 lines
// + enterAge.njk - 53 lines
// + enterAge.json (en) - 10 lines
// + enterAge.json (cy) - 10 lines
// + flow.config.ts updates
// + index.ts registration
// = ~130 lines for one simple step!
```

## Recommendation: Migrate to Journey Engine

### Why Migrate?

For a journey with **lots of forms**, the Journey Engine provides:

1. **10x faster development** - Define step in ~20 lines vs ~130 lines
2. **Consistency** - All steps follow same patterns
3. **Type safety** - Catch errors before runtime
4. **Maintainability** - Change validation rules in one place
5. **Scalability** - Add 50 steps without drowning in boilerplate

### Migration Strategy

#### Phase 1: Hybrid Approach (Recommended Start)

Keep both systems running side-by-side:

1. **New steps** → Use Journey Engine
2. **Existing steps** → Migrate gradually
3. **Complex steps** → Can stay in StepDefinition if needed

#### Phase 2: Gradual Migration

Migrate userJourney steps one by one:

**Priority Order:**

1. Simple form steps (text, radio, checkbox) - Easy wins
2. Medium complexity (date, select) - Standard patterns
3. Complex steps (address lookup, custom logic) - Evaluate case-by-case

#### Phase 3: Full Migration

Once all steps migrated, remove StepDefinition system.

## Best Practices for Journey Engine

### 1. Step Organization

```
journeys/
  userJourney/
    index.ts              # Journey config
    steps/
      enter-age/
        step.ts           # Step definition
        step.njk          # Optional custom template
      enter-ground/
        step.ts
      enter-user-details/
        step.ts
```

### 2. Field Definitions

**Text Fields:**

```typescript
{
  type: 'text',
  label: { text: 'field.label' },
  hint: { text: 'field.hint' },
  validate: {
    required: true,
    minLength: 2,
    maxLength: 50,
  },
}
```

**Radio Buttons:**

```typescript
{
  type: 'radios',
  fieldset: {
    legend: {
      text: 'field.label',
      isPageHeading: true,
      classes: 'govuk-fieldset__legend--l',
    },
  },
  items: [
    { value: 'yes', text: 'field.options.yes' },
    { value: 'no', text: 'field.options.no' },
  ],
  validate: { required: true },
}
```

**Checkboxes:**

```typescript
{
  type: 'checkboxes',
  items: [
    {
      value: 'option1',
      text: 'field.options.option1.text',
      hint: 'field.options.option1.hint',
    },
    { value: 'option2', text: 'field.options.option2' },
  ],
  validate: {
    required: true,
    minLength: 1,
  },
}
```

**Date Fields:**

```typescript
{
  type: 'date',
  label: { text: 'field.label' },
  hint: { text: 'field.hint' },
  validate: {
    required: true,
    mustBePast: true,
  },
}
```

### 3. Conditional Navigation

```typescript
next: {
  when: (stepData, allData) => {
    return stepData['age'] === 'yes';
  },
  goto: 'next-step',
  else: 'alternative-step',
}
```

### 4. Translation Keys

**Structure:**

```json
{
  "stepId": {
    "title": "Step Title",
    "description": "Step description",
    "fields": {
      "fieldName": {
        "label": "Field Label",
        "hint": "Field hint text",
        "options": {
          "option1": "Option 1",
          "option2": "Option 2"
        }
      }
    },
    "errors": {
      "fieldName": {
        "required": "This field is required",
        "invalid": "Invalid value"
      }
    }
  }
}
```

### 5. Custom Templates (When Needed)

Only create custom templates when:

- Default template doesn't meet design requirements
- Need complex conditional rendering
- Special layout requirements

**Location:** `views/journeys/userJourney/stepId.njk`

### 6. Custom Validation

```typescript
validate: {
  required: true,
  customMessage: (code: string) => {
    switch (code) {
      case 'too_small':
        return 'Need at least 2 characters';
      default:
        return 'Invalid value';
    }
  },
}
```

### 7. Complex Business Logic

For steps requiring custom logic (e.g., CCD case updates):

**Option A: Use `beforeRedirect` hook** (if Journey Engine supports it)
**Option B: Create custom step type** extending the engine
**Option C: Keep in StepDefinition** for that specific step

## Tooling & Automation

### 1. Step Generator Script

Create a CLI tool to generate step boilerplate:

```bash
npm run generate:step userJourney enter-new-step
```

**Generates:**

- `steps/enter-new-step/step.ts`
- Translation keys in JSON
- Registers in journey index

### 2. Validation Schema Generator

Tool to generate Zod schemas from step definitions for external validation.

### 3. Journey Visualizer

Tool to visualize journey flow, dependencies, and conditional paths.

### 4. Translation Key Validator

Ensure all translation keys referenced in steps exist.

### 5. Step Dependency Checker

Automatically validate step dependencies and routing.

## Migration Checklist

### For Each Step:

- [ ] Create step definition in `steps/stepName/step.ts`
- [ ] Define fields with proper types
- [ ] Add validation rules
- [ ] Configure conditional navigation if needed
- [ ] Add translation keys (en + cy)
- [ ] Test form submission
- [ ] Test validation errors
- [ ] Test conditional routing
- [ ] Test back navigation
- [ ] Remove old StepDefinition code
- [ ] Update flow.config.ts (if still using hybrid)

## Example: Migrating enter-age Step

### Before (StepDefinition - 130 lines):

- `index.ts` - 49 lines
- `enterAge.njk` - 53 lines
- `enterAge.json` (en) - 10 lines
- `enterAge.json` (cy) - 10 lines
- Flow config updates
- Index registration

### After (Journey Engine - 25 lines):

```typescript
// steps/enter-age/step.ts
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
      attributes: { type: 'submit' },
    },
  },
  next: {
    when: stepData => stepData['age'] === 'yes',
    goto: 'enter-ground',
    else: 'ineligible',
  },
};
```

**Translation file:**

```json
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
  }
}
```

**Result:** 80% reduction in code, same functionality!

## Roadmap

### Week 1-2: Setup & Planning

- [ ] Document all current userJourney steps
- [ ] Identify simple steps for migration
- [ ] Set up step generator tool
- [ ] Create migration checklist

### Week 3-4: Pilot Migration

- [ ] Migrate 3-5 simple steps (text, radio, checkbox)
- [ ] Test thoroughly
- [ ] Document learnings
- [ ] Refine process

### Week 5-8: Bulk Migration

- [ ] Migrate remaining simple steps
- [ ] Migrate medium complexity steps
- [ ] Handle edge cases

### Week 9-10: Complex Steps

- [ ] Evaluate complex steps (address, custom logic)
- [ ] Migrate or keep in StepDefinition
- [ ] Document exceptions

### Week 11-12: Cleanup

- [ ] Remove StepDefinition system
- [ ] Update documentation
- [ ] Train team on Journey Engine
- [ ] Create best practices guide

## Quick Start: Creating a New Step

1. **Create step file:**

   ```typescript
   // journeys/userJourney/steps/enter-name/step.ts
   import { StepDraft } from '../../../modules/journey/engine/schema';

   const step: StepDraft = {
     id: 'enter-name',
     type: 'form',
     fields: {
       firstName: {
         type: 'text',
         label: { text: 'enterName.firstName' },
         validate: { required: true, minLength: 2 },
       },
       continueButton: {
         type: 'button',
         attributes: { type: 'submit' },
       },
     },
     next: 'next-step-id',
   };

   export default step;
   ```

2. **Add to journey:**

   ```typescript
   // journeys/userJourney/index.ts
   import enterName from './steps/enter-name/step';

   const journey: JourneyDraft = {
     // ...
     steps: {
       // ...
       enterName,
     },
   };
   ```

3. **Add translations:**

   ```json
   // assets/locales/en/userJourney.json
   {
     "enterName": {
       "firstName": "First name"
     }
   }
   ```

4. **Done!** The engine handles routing, validation, and views automatically.

## Support & Questions

- Journey Engine README: `JOURNEY_ENGINE_README.md`
- Example journey: `journeys/eligibility/`
- Schema definitions: `modules/journey/engine/schema.ts`

## Conclusion

For building a journey with **lots of forms**, the Journey Engine is the clear winner:

- **10x less code** to write and maintain
- **Type-safe** configuration
- **Consistent** patterns across all steps
- **Scalable** to 100+ steps without complexity explosion
- **Faster development** - focus on business logic, not boilerplate

**Recommendation:** Start migrating userJourney to Journey Engine now, beginning with simple steps.
