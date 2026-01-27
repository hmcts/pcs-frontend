import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep(
  {
    stepName: 'defendant-name-capture',
    journeyFolder: 'respondToClaim',
    stepDir: __dirname,
    flowConfig,
    translationKeys: {
      // Browser/tab title
      pageTitle: 'pageTitle',
      // On-page H1
      heading: 'heading',
      caption: 'caption',
      contactUs: 'contactUs',
    },
    fields: [
      {
        name: 'firstName',
        type: 'text',
        required: true,
        translationKey: {
          label: 'firstNameLabel',
        },
        labelClasses: 'govuk-label--s',
        attributes: {
          autocomplete: 'given-name',
          spellcheck: false,
        },
      },
      {
        name: 'lastName',
        type: 'text',
        required: true,
        translationKey: {
          label: 'lastNameLabel',
        },
        attributes: {
          autocomplete: 'family-name',
          spellcheck: false,
        },
      },
    ],
  },
  `${__dirname}/defendantNameCapture.njk`
);
