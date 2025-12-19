import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';

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
        const enterGroundData = allData['enter-ground'] as { grounds?: string[] } | undefined;
        return Array.isArray(enterGroundData?.grounds) && enterGroundData.grounds.includes('other-10');
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
