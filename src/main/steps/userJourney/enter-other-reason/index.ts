import { createFormStep } from '../../../app/utils/formBuilder/index';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'enter-other-reason',
  journeyFolder: 'userJourney',
  stepDir: __dirname,
  fields: [
    {
      name: 'otherReason',
      type: 'character-count',
      required: true,
      maxLength: 250,
      translationKey: {
        label: 'title',
      },
      attributes: {
        rows: 5,
      },
    },
  ],
});
