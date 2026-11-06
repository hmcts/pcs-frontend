import { createMakeAClaimStep, isRendering } from '../formStep';
import { noticeCard } from '../summary';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'notice-cya',
  stepDir: __dirname,
  customTemplate: 'make-a-claim/templates/summary.njk',
  fields: [],
  extendGetContent: (req, formContent) => (isRendering(formContent) ? { cards: [noticeCard(req)] } : {}),
});
