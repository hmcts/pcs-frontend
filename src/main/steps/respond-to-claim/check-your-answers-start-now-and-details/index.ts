import { createSectionCyaStep } from '../section-cya/createSectionCyaStep';

import { buildSectionCyaRows } from './buildSectionCyaRows';

// start-now has no `cardTitle` of its own — it shares the task-list copy for this section.
export const step = createSectionCyaStep({
  stepName: 'check-your-answers-start-now-and-details',
  cardTitleKey: 'taskList.startNowAndDetails',
  stepDir: __dirname,
  buildRows: buildSectionCyaRows,
});
