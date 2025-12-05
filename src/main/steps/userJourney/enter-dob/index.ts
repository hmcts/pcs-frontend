import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'enter-dob',
  journeyFolder: 'userJourney',
  stepDir: __dirname,
  fields: [
    {
      name: 'dateOfBirth',
      type: 'date',
      required: true,
      translationKey: {
        label: 'question', // Uses 'question' from enterDob.json
      },
    },
  ],
});
