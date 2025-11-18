import { JourneyDraft } from '../../modules/journey/engine/schema';

import legalAdvice from './steps/legalAdvice/step';
import start from './steps/start/step';

const journey: JourneyDraft = {
  meta: {
    name: 'Respond to a property possession claim',
    description: 'Respond to a property possession claim',
    version: '1.0.0',
  },
  steps: {
    start,
    legalAdvice,
    correctName: {
      id: 'correctName',
      type: 'form',
      fields: {
        correctName: {
          type: 'radios',
          fieldset: {
            legend: {
              text: 'Is your name Billy Wright?',
              classes: 'govuk-fieldset__legend--l',
            },
          },
          hint: {
            text: 'This is the name provided by Treetops Housing.',
          },
          items: [
            { value: 'yes', text: 'Yes' },
            { value: 'no', text: 'No' },
          ],
          validate: {
            required: true,
            customMessage: 'Select yes or no',
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
    },
  },
};

export default journey;
