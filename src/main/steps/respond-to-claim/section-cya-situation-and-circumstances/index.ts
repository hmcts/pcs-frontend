import { createSectionCyaStep } from '../section-cya/createSectionCyaStep';

import { buildSectionCyaRows } from './buildSectionCyaRows';

export const step = createSectionCyaStep({
  stepName: 'section-cya-situation-and-circumstances',
  cardTitleKey: 'cardTitle',
  stepDir: __dirname,
  buildRows: buildSectionCyaRows,
});
