import { yesNoWithReason } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'gas-safety-available',
  stepDir: __dirname,
  fields: [yesNoWithReason('hasGasSafetyReport', 'noGasSafetyReportReason', FIELD_LIMITS.noCertificateOrReportReason)],
});
