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
      noFutureDate: true,
      translationKey: {
        label: 'question',
      },
    },
  ],
});
