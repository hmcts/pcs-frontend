import { createFormStep } from '../../../app/utils/formBuilder';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'enter-other-reason',
  journeyFolder: 'userJourney',
  stepDir: __dirname,
  fields: [
    {
      name: 'otherReason',
      type: 'textarea',
      required: true,
      maxLength: 250,
      translationKey: {
        label: 'title',
        hint: 'hint',
      },
      attributes: {
        rows: 5,
      },
    },
  ],
});
