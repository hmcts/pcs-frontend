import { createMakeAClaimStep } from '../formStep';
import { circumstancesCard } from '../summary';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'situation-cya',
  stepDir: __dirname,
  customTemplate: 'make-a-claim/templates/summary.njk',
  fields: [],
  extendGetContent: req => ({ cards: [circumstancesCard(req)] }),
});
