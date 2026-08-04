import { createSectionCyaStep } from '../section-cya/createSectionCyaStep';

import { buildSectionCyaRows } from './buildSectionCyaRows';

export const step = createSectionCyaStep({
  stepName: 'check-your-answers-income-and-expenses',
  cardTitleKey: 'cardTitle',
  stepDir: __dirname,
  buildRows: buildSectionCyaRows,
  renderRowsAsPresentation: true,
});
