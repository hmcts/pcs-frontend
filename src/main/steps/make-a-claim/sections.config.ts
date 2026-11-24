import type { Request } from 'express';

import { readClaim } from './claimDraft';

import type { SectionConfig } from '@modules/steps/stepFlow.interface';

export const MAKE_A_CLAIM_SECTION_GROUPS = [
  { id: 'yourClaim', titleKey: 'taskList.groups.yourClaim' },
  { id: 'provideEvidence', titleKey: 'taskList.groups.provideEvidence' },
  { id: 'reviewAndSubmit', titleKey: 'taskList.groups.reviewAndSubmit' },
] as const;

export const makeAClaimSections: readonly SectionConfig[] = [
  {
    id: 'aboutYou',
    groupId: 'yourClaim',
    titleKey: 'taskList.sections.aboutYou',
    steps: [
      'your-details',
      'individual-or-organisation',
      'claimant-name',
      'organisation-name',
      'claimant-address',
      'claimant-email',
      'claimant-phone',
      'claimant-text-message',
      'multiple-claimants',
      'claimant-cya',
    ],
  },
  {
    id: 'defendants',
    groupId: 'yourClaim',
    titleKey: 'taskList.sections.defendants',
    steps: ['defendant-details', 'defendant-name', 'defendant-address', 'additional-defendants', 'defendant-cya'],
  },
  {
    id: 'tenancyAndGrounds',
    groupId: 'yourClaim',
    titleKey: 'taskList.sections.tenancyAndGrounds',
    steps: [
      'tenancy-details',
      'tenancy-type',
      'tenancy-start-date',
      'tenancy-agreement',
      'upload-tenancy-agreement',
      'rent-arrears-claim',
      'rent-arrears-grounds',
      'other-grounds-claim',
      'other-grounds',
      'ground-reason',
      'tenancy-cya',
    ],
  },
  {
    id: 'notice',
    groupId: 'yourClaim',
    titleKey: 'taskList.sections.notice',
    steps: [
      'notice-details',
      'notice-served',
      'notice-type',
      'notice-method',
      'notice-available',
      'upload-notice',
      'notice-cya',
    ],
  },
  {
    id: 'rentArrears',
    groupId: 'yourClaim',
    titleKey: 'taskList.sections.rentArrears',
    steps: [
      'rent-arrears',
      'rent-amount',
      'rent-frequency',
      'arrears-at-notice',
      'current-arrears',
      'arrears-proof',
      'upload-rent-statement',
      'rent-due-day',
      'statement-period',
      'rent-statement',
      'rent-statement-payment',
      'money-judgment',
      'recovery-steps',
      'arrears-cya',
    ],
    isApplicable: async (req: Request) => readClaim(req).grounds?.hasRentArrearsGrounds === 'YES',
  },
  {
    id: 'circumstances',
    groupId: 'yourClaim',
    titleKey: 'taskList.sections.circumstances',
    steps: ['circumstances', 'defendant-circumstances', 'claimant-circumstances', 'situation-cya'],
  },
  {
    id: 'uploadDocuments',
    groupId: 'provideEvidence',
    titleKey: 'taskList.sections.uploadDocuments',
    steps: ['upload-other-documents'],
  },
  {
    id: 'checkAndSubmit',
    groupId: 'reviewAndSubmit',
    titleKey: 'taskList.sections.checkAndSubmit',
    steps: [
      'other-information',
      'other-reasons',
      'general-application',
      'your-support',
      'equality-and-diversity',
      'language-used',
      'check-your-answers',
    ],
    dependsOn: [
      'aboutYou',
      'defendants',
      'tenancyAndGrounds',
      'notice',
      'rentArrears',
      'circumstances',
      'uploadDocuments',
    ],
  },
];

/** The check your answers pages the claimant must continue from before each section is done. */
export const SECTION_CYAS = {
  aboutYou: ['claimant-cya'],
  defendants: ['defendant-cya'],
  tenancyAndGrounds: ['tenancy-cya'],
  notice: ['notice-cya'],
  rentArrears: ['arrears-cya'],
  circumstances: ['situation-cya'],
} as const satisfies Partial<Record<string, readonly string[]>>;

export type SectionCya = (typeof SECTION_CYAS)[keyof typeof SECTION_CYAS][number];

/** The summary pages that end a section: Save and continue on them returns to the task list. */
export const SECTION_SUMMARY_STEPS = [
  'claimant-cya',
  'defendant-cya',
  'tenancy-cya',
  'notice-cya',
  'arrears-cya',
  'situation-cya',
] as const;
