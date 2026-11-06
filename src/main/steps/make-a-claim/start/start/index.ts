import { startNewAttempt } from '../createClaim';
import { createStartStep } from '../startStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createStartStep({
  stepName: 'start',
  stepDir: __dirname,
  fields: [],
  beforeGet: req => startNewAttempt(req),
  customTemplate: 'make-a-claim/templates/start.njk',
  extendGetContent: () => ({ startUrl: '/make-a-claim/claimant-type' }),
});
