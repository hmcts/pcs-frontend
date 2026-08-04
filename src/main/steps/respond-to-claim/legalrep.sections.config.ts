import { respondToClaimSections } from './sections.config';

import { SectionConfig } from '@modules/steps/stepFlow.interface';

const lrSection: SectionConfig = {
  id: 'selectDefendant',
  titleKey: 'taskList.selectDefendant',
  steps: ['select-defendant'],
};

export const legalRepRespondToClaimSections: SectionConfig[] = [
  respondToClaimSections[0],
  lrSection,
  ...respondToClaimSections.slice(1),
];
