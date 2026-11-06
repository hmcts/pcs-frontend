import { createMakeAClaimStep } from '../formStep';
import { defendantsCard } from '../summary';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'defendant-cya',
  stepDir: __dirname,
  customTemplate: 'make-a-claim/templates/summary.njk',
  fields: [],
  extendGetContent: req => ({ cards: [defendantsCard(req)] }),
});
