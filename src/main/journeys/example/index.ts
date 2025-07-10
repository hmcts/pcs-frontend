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
        validate: { required: true },
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
        validate: { required: true, minLength: 1 },
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
        validate: { required: true },
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
  // 'date',
  'number',
  'email',
  'tel',
  'url',
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
