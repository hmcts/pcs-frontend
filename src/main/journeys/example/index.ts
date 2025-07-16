import { $ZodIssue } from 'zod/v4/core';

import { JourneyDraft, StepDraft } from '../../modules/journey/engine/schema';

// Helper to simplify next linking
const chain = (ids: string[]): Record<string, StepDraft> => {
  const obj: Record<string, StepDraft> = {};
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const next = ids[i + 1] ?? (id === 'summary' ? 'confirmation' : undefined);
    const step = stepsById[id];
    if (next) {
      step.next = next;
    }
    obj[id] = step;
  }
  return obj;
};

const stepsById: Record<string, StepDraft> = {
  text: {
    id: 'text',
    title: 'Enter some text',
    type: 'form',
    fields: {
      text: {
        type: 'text',
        label: 'Full name',
        validate: {
          required: true,
          minLength: 1,
          maxLength: 6,
          customMessage: (code: $ZodIssue['code']) => {
            switch (code) {
              case 'too_small':
                return 'Please fill this in';
              case 'too_big':
                return 'Too many characters! Max 6';
              case 'invalid_type':
                return 'Need at least 1 character';
              default:
                return 'Something went wrong';
            }
          },
        },
      },
      continueButton: {
        type: 'button',
        attributes: {
          type: 'submit',
        },
      },
    },
  },
  textarea: {
    id: 'textarea',
    title: 'Enter a description',
    type: 'form',
    fields: {
      description: {
        type: 'textarea',
        label: 'Tell us about yourself',
        rows: 5,
        validate: { required: true },
      },
      continueButton: {
        type: 'button',
        attributes: {
          type: 'submit',
        },
      },
    },
  },
  radios: {
    id: 'radios',
    title: 'Choose an option',
    type: 'form',
    fields: {
      choice: {
        type: 'radios',
        fieldset: {
          legend: {
            text: 'Do you agree?',
            isPageHeading: true,
            classes: 'govuk-fieldset__legend--l',
          },
        },
        items: [
          { value: 'yes', text: 'Yes' },
          { value: 'no', text: 'No' },
        ],
        validate: { required: true },
      },
      continueButton: {
        type: 'button',
        attributes: {
          type: 'submit',
        },
      },
    },
  },
  checkboxes: {
    id: 'checkboxes',
    title: 'Select applicable options',
    type: 'form',
    fields: {
      fruits: {
        type: 'checkboxes',
        label: 'Which fruits do you like?',
        items: [
          { value: 'apple', text: 'Apple' },
          { value: 'banana', text: 'Banana' },
          { value: 'orange', text: 'Orange' },
        ],
        validate: { required: true, minLength: 1, customMessage: 'Please select at least one fruit' },
      },
      continueButton: {
        type: 'button',
        attributes: {
          type: 'submit',
        },
      },
    },
  },
  select: {
    id: 'select',
    title: 'Select a colour',
    type: 'form',
    fields: {
      colour: {
        type: 'select',
        label: 'Favourite colour',
        items: [
          { value: '', text: 'Select a colour' },
          { value: 'red', text: 'Red' },
          { value: 'green', text: 'Green' },
          { value: 'blue', text: 'Blue' },
        ],
        validate: {
          required: true,
          customMessage: (code: $ZodIssue['code']) => {
            switch (code) {
              case 'invalid_value':
                return 'Please select at least one colour';
              default:
                return 'Something went wrong';
            }
          },
        },
      },
      continueButton: {
        type: 'button',
        attributes: {
          type: 'submit',
        },
      },
    },
  },
  date: {
    id: 'date',
    title: 'Enter a date',
    type: 'form',
    fields: {
      dob: {
        type: 'date',
        fieldset: {
          legend: { text: 'Date of birth', isPageHeading: true },
        },
        validate: { required: true },
        errorMessages: {
          required: 'Please enter a date',
          invalid: 'Please enter a valid date now!!!',
          day: 'Please enter a valid day',
          month: 'Please enter a valid month',
          year: 'Please enter a valid year',
        },
      },
      continueButton: {
        type: 'button',
        attributes: {
          type: 'submit',
        },
      },
    },
  },
  number: {
    id: 'number',
    title: 'Enter a number',
    type: 'form',
    fields: {
      quantity: {
        type: 'number',
        label: 'Quantity',
        validate: { required: true, min: 1, max: 100 },
      },
      continueButton: {
        type: 'button',
        attributes: {
          type: 'submit',
        },
      },
    },
  },
  email: {
    id: 'email',
    title: 'Enter an email',
    type: 'form',
    fields: {
      email: {
        type: 'email',
        label: 'Email address',
        validate: { required: true, email: true },
      },
      continueButton: {
        type: 'button',
        attributes: {
          type: 'submit',
        },
      },
    },
  },
  tel: {
    id: 'tel',
    title: 'Enter a phone number',
    type: 'form',
    fields: {
      phone: {
        type: 'tel',
        label: 'Telephone number',
        validate: { required: true },
      },
      continueButton: {
        type: 'button',
        attributes: {
          type: 'submit',
        },
      },
    },
  },
  url: {
    id: 'url',
    title: 'Enter a website',
    type: 'form',
    fields: {
      website: {
        type: 'url',
        label: 'Website URL',
        validate: { required: true, url: true },
      },
      continueButton: {
        type: 'button',
        attributes: {
          type: 'submit',
        },
      },
    },
  },
  password: {
    id: 'password',
    title: 'Create a password',
    type: 'form',
    fields: {
      password: {
        type: 'password',
        label: 'Password',
        validate: { required: true, minLength: 8 },
      },
      continueButton: {
        type: 'button',
        attributes: {
          type: 'submit',
        },
      },
    },
  },
  postalCode: {
    id: 'postalCode',
    title: 'Enter a postal code',
    type: 'form',
    fields: {
      postalCode: {
        type: 'text',
        label: 'Postcode',
        validate: { required: true, postcode: true },
      },
      continueButton: {
        type: 'button',
        attributes: {
          type: 'submit',
        },
      },
    },
  },
  file: {
    id: 'file',
    title: 'Upload a file',
    type: 'form',
    fields: {
      upload: {
        type: 'file',
        label: 'Choose a file to upload',
        validate: { required: true },
      },
      continueButton: {
        type: 'button',
        attributes: {
          type: 'submit',
        },
      },
    },
  },
  summary: {
    id: 'summary',
    title: 'Check your answers',
    type: 'summary',
  },
  confirmation: {
    id: 'confirmation',
    title: 'All done!',
    type: 'confirmation',
    data: {
      referenceNumber: true,
    },
  },
};

const orderedIds = [
  'text',
  'textarea',
  'radios',
  'checkboxes',
  'select',
  'date',
  'number',
  'email',
  'tel',
  'url',
  'postalCode',
  'password',
  // 'file',
  'summary',
  'confirmation',
];

const journey: JourneyDraft = {
  meta: {
    name: 'Example Components Journey',
    description: 'Demonstrates every supported GOV.UK component in separate steps',
    version: '1.0.0',
  },
  steps: chain(orderedIds),
};

export default journey;
