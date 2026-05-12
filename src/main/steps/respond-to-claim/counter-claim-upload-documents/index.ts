import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-upload-documents',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/counterClaimUploadDocuments.njk`,
});
