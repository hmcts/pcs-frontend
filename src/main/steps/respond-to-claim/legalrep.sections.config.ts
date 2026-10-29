import { respondToClaimSections } from './sections.config';

import { SectionConfig } from '@modules/steps/stepFlow.interface';

const lrSections: SectionConfig[] = [
  {
    id: 'selectDefendant',
    titleKey: 'taskList.selectDefendant',
    steps: ['select-defendant'],
  },
  {
    id: 'resumeResponse',
    titleKey: 'taskList.resumeResponse',
    steps: ['resume-response'],
  },
];

export const legalRepRespondToClaimSections: SectionConfig[] = [
  respondToClaimSections[0],
  ...lrSections,
  ...respondToClaimSections.slice(1),
];
