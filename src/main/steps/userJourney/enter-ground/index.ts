import { createFormStep } from '../../../app/utils/formBuilder';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'enter-ground',
  journeyFolder: 'userJourney',
  stepDir: __dirname,
  fields: [
    {
      name: 'grounds',
      type: 'checkbox',
      required: true,
      translationKey: {
        label: 'title', // Uses 'title' from enterGround.json
        hint: 'hint', // Uses 'hint' from enterGround.json
      },
      options: [
        { value: 'rent-arrears-8', translationKey: 'options.rentArrears' },
        { value: 'breach-contract-9', translationKey: 'options.breachContract' },
        { value: 'other-10', translationKey: 'options.other' },
      ],
    },
  ],
});
