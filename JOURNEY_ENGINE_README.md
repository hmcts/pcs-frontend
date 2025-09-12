# Journey Engine

A flexible, JSON-driven journey engine for building multi-step forms and wizards.

## Features

- **JSON Configuration**: Define entire journeys using JSON, no code required
- **Type Safety**: Full TypeScript support with Zod schema validation
- **Flexible Templates**: Smart template resolution with fallbacks
- **Validation**: Built-in validation with custom error messages
- **Conditional Logic**: Simple conditional navigation between steps
- **Summary Pages**: Automatic summary generation with change links
- **Back Navigation**: Smart back button handling
- **Session Storage**: Built-in session storage with extensible storage interface

## Journey Configuration

A journey is defined by a JSON file with the following structure:

```json
{
  "meta": {
    "name": "Journey Name",
    "description": "Journey description",
    "version": "1.0.0"
  },
  "steps": {
    "stepId": {
      "title": "Step Title",
      "type": "form",
      "fields": {
        "fieldName": {
          "type": "text",
          "label": "Field Label",
          "validation": {
            "required": true
          }
        }
      },
      "next": "nextStepId"
    }
  },
  "config": {
    "store": {
      "type": "session"
    }
  }
}
```

### Step Types

- `form`: Regular form step with fields
- `summary`: Shows summary of all collected data
- `confirmation`: Final confirmation step
- `ineligible`: Shows when user is ineligible
- `error`: Shows error messages
- `complete`: Shows completion message
- `success`: Shows success message

### Field Types

- `text`: Single line text input
- `textarea`: Multi-line text input
- `radios`: Radio button group
- `checkboxes`: Checkbox group
- `select`: Dropdown select
- `date`: Date input
- `number`: Number input
- `email`: Email input
- `tel`: Telephone input

### Validation Rules

- `required`: Field is required
- `minLength`: Minimum length for text
- `maxLength`: Maximum length for text
- `min`: Minimum value for numbers
- `max`: Maximum value for numbers
- `regex`: Regular expression pattern
- `custom`: Custom validation function

### Conditional Navigation

Use the `next` property to define conditional navigation:

```json
"next": {
  "when": "fieldName == 'value'",
  "goto": "nextStepId",
  "else": "alternativeStepId"
}
```

## Usage

1. Create a journey JSON file (e.g. `journeys/my-journey.json`)
2. Create your view templates in the `views` directory
3. The engine will automatically handle routing, validation, and state management

Example journey JSON:

```json
{
  "meta": {
    "name": "My Journey",
    "description": "A simple journey example",
    "version": "1.0.0"
  },
  "steps": {
    "start": {
      "title": "First step",
      "fields": {
        "name": {
          "type": "text",
          "label": "Your name",
          "validate": {
            "required": true
          }
        }
      },
      "next": "summary"
    },
    "summary": {
      "title": "Check your answers",
      "type": "summary",
      "next": "confirmation"
    },
    "confirmation": {
      "title": "Complete",
      "type": "confirmation"
    }
  }
}
```

The engine will automatically:

- Create routes for each step
- Handle form validation
- Manage journey state
- Generate summary pages
- Handle navigation between steps

## Templates

The engine uses a smart template resolution system:

1. Looks for journey-specific template first
2. Falls back to generic step type template
3. Uses default form template for regular steps
4. Falls back to step ID as template path

Place templates in `views/journey-slug/` or use the defaults in `views/_defaults/`.

## Address Lookup (OS Places)

The engine includes a composite `address` field type that adds UK postcode lookup via the OS Places API and a manual entry form.

Example usage in a step:

```
fields: {
  homeAddress: {
    type: 'address',
    label: { text: 'Address lookup' },
    validate: { required: true }
  },
  continueButton: { type: 'button', attributes: { type: 'submit' } }
}
```

Config required:

- `osPostcodeLookup.url` (e.g. `https://api.os.uk/search/places/v1`)
- `secrets.pcs.pcs-os-client-lookup-key` – OS Places API key

The lookup is performed client-side against `/api/postcode-lookup` and returns a list of addresses to populate the form.
