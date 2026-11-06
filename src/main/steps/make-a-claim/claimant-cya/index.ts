import { createMakeAClaimStep, isRendering } from '../formStep';
import { aboutYouCard } from '../summary';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'claimant-cya',
  stepDir: __dirname,
  customTemplate: 'make-a-claim/templates/summary.njk',
  fields: [],
  extendGetContent: (req, formContent) => (isRendering(formContent) ? { cards: [aboutYouCard(req)] } : {}),
});
