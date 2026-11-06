import { forgetCreatedClaim } from '../createClaim';
import { createStartStep } from '../startStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createStartStep({
  stepName: 'start',
  stepDir: __dirname,
  fields: [],
  customTemplate: 'make-a-claim/templates/start.njk',
  beforeGet: async req => forgetCreatedClaim(req),
  extendGetContent: () => ({ startUrl: '/make-a-claim/claimant-type' }),
});
