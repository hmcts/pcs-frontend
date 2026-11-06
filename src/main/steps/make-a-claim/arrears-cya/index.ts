import { createMakeAClaimStep } from '../formStep';
import { rentArrearsCard } from '../summary';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'arrears-cya',
  stepDir: __dirname,
  customTemplate: 'make-a-claim/templates/summary.njk',
  fields: [],
  extendGetContent: req => ({ cards: [rentArrearsCard(req)] }),
});
