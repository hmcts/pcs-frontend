import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep(
  {
    stepName: 'free-legal-advice',
    journeyFolder: 'respondToClaim',
    stepDir: __dirname,
    basePath: '/respond-to-claim',
    flowConfig,
    translationKeys: {
      pageTitle: 'title',
      content: 'content',
    },
    fields: [
      {
        name: 'hadLegalAdvice',
        type: 'radio',
        required: true,
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
  },
  `${__dirname}/free-legal-advice.njk`
);
