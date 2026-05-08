
import { createRespondToClaimFormStep } from '../formStep';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'upload-docs',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/uploadDocs.njk`,
});
