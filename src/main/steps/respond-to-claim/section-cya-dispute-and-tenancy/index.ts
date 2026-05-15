import { createSectionCyaStep } from '../section-cya/createSectionCyaStep';

import { buildSectionCyaRows } from './buildSectionCyaRows';

export const step = createSectionCyaStep({
  stepName: 'section-cya-dispute-and-tenancy',
  cardTitleKey: 'cardTitle',
  stepDir: __dirname,
  buildRows: buildSectionCyaRows,
});
