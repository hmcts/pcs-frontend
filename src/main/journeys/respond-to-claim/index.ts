import type { Request } from 'express';

import { JourneyDraft } from '../../modules/journey/engine/schema';
import type { DataProvider } from '../../modules/journey/engine/dataProviders';
import type { JourneyConfig, StepConfig } from '../../modules/journey/engine/schema';

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
      next: 'summary',
      id: 'correctName',
      type: 'form',
      fields: {
        correctName: {
          type: 'radios',
          fieldset: {
            legend: {
              text: 'Is your name {{claimantName}}?',
              classes: 'govuk-fieldset__legend--l',
            },
          },
          hint: {
            text: 'This is the name provided by {{organisationName | upper}}.',
          },
          items: [
            { value: 'yes', text: 'Yes' },
            {
              value: 'no',
              text: 'No',
              conditional: {
                fields: {
                  correctNameFirstName: {
                    type: 'text',
                    label: {
                      text: 'What is your first name?',
                    },
                    hint: {
                      text: 'Enter your first name',
                    },
                    validate: {
                      requiredWhen: {
                        field: 'correctName',
                        value: 'no',
                      },
                    },
                  },
                  correctNameLastname: {
                    type: 'text',
                    label: {
                      text: 'What is your last name?',
                    },
                    hint: {
                      text: 'Enter your last name',
                    },
                    validate: {
                      requiredWhen: {
                        field: 'correctName',
                        value: 'no',
                      },
                    },
                  },
                },
              },
            },
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
    summary: {
      id: 'summary',
      type: 'summary',
      title: 'summary.title',
      description: 'summary.description',
      next: 'confirmation',
    },
    confirmation: {
      id: 'confirmation',
      type: 'confirmation',
      title: 'confirmation.title',
      description: 'confirmation.description',
    },
  },
  config: {
    dataProviders: {
      global: [(async (req: Request, step: StepConfig, allData: Record<string, unknown>, journey: JourneyConfig) => {
            // TODO: Replace with actual data source (API, database, etc.)
            // For now, using example data
            return {
              claimantName: 'Billy Wright',
              organisationName: 'Treetops Housing',
            };
          }) as DataProvider,
      ],
    },
  },
};

export default journey;
