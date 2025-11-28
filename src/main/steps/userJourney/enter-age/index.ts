import { createFormStep } from '../../../app/utils/formBuilder';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'enter-age',
  journeyFolder: 'userJourney',
  stepDir: __dirname,
  translationKeys: {
    pageTitle: 'pageTitle',
    content: 'content',
  },
  fields: [
    {
      name: 'age',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'question', // Uses 'question' from enterAge.json
      },
      options: [
        { value: 'yes', translationKey: 'options.yes' },
        { value: 'no', translationKey: 'options.no' },
      ],
    },
  ],
});
