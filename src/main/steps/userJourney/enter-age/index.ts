import { createFormStep } from '../../../app/utils/formBuilder';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'enter-age',
  journeyFolder: 'userJourney',
  stepDir: __dirname,
  fields: [
    {
      name: 'age',
      type: 'radio',
      required: true,
      // Explicitly map to 'question' key in translation file
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
