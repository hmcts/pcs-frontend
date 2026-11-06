import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'multiple-claimants-ineligible',
  stepDir: __dirname,
  customTemplate: 'make-a-claim/templates/info.njk',
  fields: [],
  extendGetContent: () => ({ exitUrl: 'https://www.gov.uk' }),
});
