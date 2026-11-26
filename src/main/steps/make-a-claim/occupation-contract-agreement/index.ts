import { yesNoWithReason } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'occupation-contract-agreement',
  stepDir: __dirname,
  fields: [
    yesNoWithReason('tenancyAgreementAvailable', 'noTenancyAgreementReason', FIELD_LIMITS.noTenancyAgreementReason),
  ],
});
