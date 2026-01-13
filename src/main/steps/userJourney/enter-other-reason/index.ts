import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { normalizeCheckboxValue } from '../../../modules/steps/formBuilder/helpers';

export const step: StepDefinition = createFormStep({
  stepName: 'enter-other-reason',
  journeyFolder: 'userJourney',
  stepDir: __dirname,
  fields: [
    {
      name: 'otherReason',
      type: 'character-count',
      // Only required if "other" option was selected in enter-ground step
      required: (formData: Record<string, unknown>, allData: Record<string, unknown>) => {
        const enterGroundData = allData['grounds'];
        // Normalize checkbox value - handles strings, arrays, and Docker edge case: [{ '0': 'value1', '1': 'value2' }]
        const normalizedGrounds = normalizeCheckboxValue(enterGroundData);
        return normalizedGrounds.includes('other-10');
      },
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
