import { yesNoQuestion } from '../fieldBuilders';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';

import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'multiple-claimants',
  stepDir: __dirname,
  fields: [yesNoQuestion('multipleClaimants')],
  resolveRedirectAfterPost: async req =>
    req.body?.multipleClaimants === 'yes'
      ? getStepUrl('multiple-claimants-ineligible', flowConfig, req.res?.locals.validatedCase?.id)
      : undefined,
});
