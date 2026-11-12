import { ORGANISATION_TYPES } from '../claimMapping';
import { radioQuestion } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'individual-or-organisation',
  stepDir: __dirname,
  fields: [radioQuestion('individualOrOrganisation', ORGANISATION_TYPES)],
});
