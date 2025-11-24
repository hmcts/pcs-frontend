# Journey Engine Quick Reference

Common patterns and examples for building steps with the Journey Engine.

## Field Types

### Text Input

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

### Textarea

```typescript
{
  type: 'textarea',
  label: { text: 'field.label' },
  rows: 5,
  validate: {
    required: true,
    maxLength: 500,
  },
}
```

### Radio Buttons

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
    { value: 'option1', text: 'field.options.option1' },
    { value: 'option2', text: 'field.options.option2' },
  ],
  validate: {
    required: true,
  },
}
```

### Checkboxes

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

### Select Dropdown

```typescript
{
  type: 'select',
  label: { text: 'field.label' },
  items: [
    { value: '', text: 'Select an option' },
    { value: 'option1', text: 'Option 1' },
    { value: 'option2', text: 'Option 2' },
  ],
  validate: {
    required: true,
  },
}
```

### Date Input

```typescript
{
  type: 'date',
  label: { text: 'field.label' },
  hint: { text: 'field.hint' },
  validate: {
    required: true,
    mustBePast: true,
    // or: mustBeFuture, mustBeTodayOrPast, etc.
  },
}
```

### Email

```typescript
{
  type: 'email',
  label: { text: 'field.label' },
  validate: {
    required: true,
    email: true,
  },
}
```

### Number

```typescript
{
  type: 'number',
  label: { text: 'field.label' },
  validate: {
    required: true,
    min: 0,
    max: 100,
  },
}
```

### Address Lookup

```typescript
{
  type: 'address',
  label: { text: 'field.label' },
  validate: {
    required: true,
  },
}
```

## Validation Rules

### Required Field

```typescript
validate: {
  required: true,
}
```

### Conditional Required

```typescript
validate: {
  required: (data, allData) => {
    return allData['previousStep']?.someField === 'value';
  },
}
```

### Text Length

```typescript
validate: {
  required: true,
  minLength: 2,
  maxLength: 50,
}
```

### Number Range

```typescript
validate: {
  required: true,
  min: 0,
  max: 100,
}
```

### Pattern (Regex)

```typescript
validate: {
  required: true,
  pattern: '^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}$',
}
```

### Custom Error Messages

```typescript
validate: {
  required: true,
  customMessage: 'field.errors.required',
  // or function:
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

## Navigation

### Simple Next Step

```typescript
next: 'next-step-id',
```

### Conditional Navigation

```typescript
next: {
  when: (stepData, allData) => {
    return stepData['age'] === 'yes';
  },
  goto: 'next-step',
  else: 'alternative-step',
}
```

### Multiple Conditions

```typescript
// Use multiple routes in flow.config.ts instead
// Or chain conditions:
next: {
  when: (stepData) => stepData['field1'] === 'value1',
  goto: 'step-a',
  else: {
    when: (stepData) => stepData['field2'] === 'value2',
    goto: 'step-b',
    else: 'step-c',
  },
}
```

## Step Types

### Form Step

```typescript
{
  id: 'step-id',
  type: 'form',
  title: 'step.title',
  description: 'step.description',
  fields: { /* ... */ },
  next: 'next-step',
}
```

### Summary Step

```typescript
{
  id: 'summary',
  type: 'summary',
  title: 'summary.title',
  next: 'confirmation',
}
```

### Confirmation Step

```typescript
{
  id: 'confirmation',
  type: 'confirmation',
  title: 'confirmation.title',
}
```

### Ineligible Step

```typescript
{
  id: 'ineligible',
  type: 'ineligible',
  title: 'ineligible.title',
  description: 'ineligible.reason',
}
```

## Translation Keys Structure

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
        "invalid": "Invalid value",
        "too_small": "Value too small",
        "too_big": "Value too large"
      }
    }
  }
}
```

## Complete Step Example

```typescript
import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'enter-details',
  type: 'form',
  title: 'enterDetails.title',
  description: 'enterDetails.description',
  fields: {
    firstName: {
      type: 'text',
      label: { text: 'enterDetails.firstName' },
      validate: {
        required: true,
        minLength: 2,
        maxLength: 50,
      },
    },
    lastName: {
      type: 'text',
      label: { text: 'enterDetails.lastName' },
      validate: {
        required: true,
        minLength: 2,
        maxLength: 50,
      },
    },
    email: {
      type: 'email',
      label: { text: 'enterDetails.email' },
      validate: {
        required: true,
        email: true,
      },
    },
    age: {
      type: 'radios',
      fieldset: {
        legend: {
          text: 'enterDetails.age',
          isPageHeading: false,
        },
      },
      items: [
        { value: '18-25', text: 'enterDetails.ageOptions.18-25' },
        { value: '26-35', text: 'enterDetails.ageOptions.26-35' },
        { value: '36+', text: 'enterDetails.ageOptions.36+' },
      ],
      validate: {
        required: true,
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
  next: 'next-step',
};

export default step;
```

## Common Patterns

### Multi-Step Form with Dependencies

```typescript
// Step 1
{
  id: 'step1',
  fields: { /* ... */ },
  next: 'step2',
}

// Step 2 (depends on step1)
{
  id: 'step2',
  fields: { /* ... */ },
  next: {
    when: (stepData) => stepData['field'] === 'value',
    goto: 'step3a',
    else: 'step3b',
  },
}
```

### Conditional Field Display

```typescript
// Use conditional validation
{
  type: 'text',
  label: { text: 'field.label' },
  validate: {
    required: (data, allData) => {
      return allData['previousStep']?.showField === true;
    },
  },
}
```

### Dynamic Options

```typescript
// Options can be generated programmatically
const step: StepDraft = {
  // ...
  fields: {
    country: {
      type: 'select',
      items: getCountries().map(c => ({
        value: c.code,
        text: `countries.${c.code}`,
      })),
    },
  },
};
```

## Tips

1. **Keep step IDs consistent** - Use kebab-case: `enter-user-details`
2. **Use translation keys** - Never hardcode text
3. **Group related fields** - Use fieldsets for radio/checkbox groups
4. **Validate early** - Add validation rules upfront
5. **Test navigation** - Verify all conditional paths
6. **Use hints** - Help users understand what's expected
7. **Consistent naming** - Use same patterns across all steps

## Troubleshooting

### Field not showing

- Check field type is correct
- Verify translation keys exist
- Check field is in `fields` object

### Validation not working

- Ensure `validate` object is present
- Check validation rule syntax
- Verify customMessage keys exist in translations

### Navigation not working

- Check `next` property is set
- Verify step IDs match
- Check conditional logic returns boolean

### Translations missing

- Ensure keys exist in both `en` and `cy` files
- Check namespace matches journey config
- Verify key path matches usage
