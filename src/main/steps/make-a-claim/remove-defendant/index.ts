import { createRemoveItemStep } from '../removeItemStep';
import { defendantDisplayName } from '../summary';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRemoveItemStep({
  stepName: 'remove-defendant',
  stepDir: __dirname,
  summaryStep: 'defendant-cya',
  items: claim => claim.defendants,
  nameKey: 'defendantName',
  displayName: (defendant, _index, req) => defendantDisplayName(defendant, req),
});
