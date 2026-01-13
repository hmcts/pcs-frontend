import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'free-legal-advice',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  basePath: '/respond-to-claim',
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
        { value: 'preferNotToSay', translationKey: 'options.preferNotToSay' },
      ],
    },
  ],
});
