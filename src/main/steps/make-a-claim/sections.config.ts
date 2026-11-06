import type { Request } from 'express';

import { readClaim } from './claimDraft';

import type { SectionConfig } from '@modules/steps/stepFlow.interface';

export const MAKE_A_CLAIM_SECTION_GROUPS = [
  { id: 'beforeYouStart', titleKey: 'taskList.groups.beforeYouStart' },
  { id: 'yourClaim', titleKey: 'taskList.groups.yourClaim' },
  { id: 'otherInformation', titleKey: 'taskList.groups.otherInformation' },
  { id: 'reviewAndSubmit', titleKey: 'taskList.groups.reviewAndSubmit' },
] as const;

export const makeAClaimSections: readonly SectionConfig[] = [
  {
    id: 'eligibility',
    groupId: 'beforeYouStart',
    titleKey: 'taskList.sections.eligibility',
    steps: ['eligible'],
  },
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
    id: 'tenancyGroundsAndNotice',
    groupId: 'yourClaim',
    titleKey: 'taskList.sections.tenancyGroundsAndNotice',
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
      'notice-details',
      'notice-served',
      'notice-type',
      'notice-date',
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
      'rent-due-day',
      'arrears-at-notice',
      'current-arrears',
      'arrears-proof',
      'upload-rent-statement',
      'ledger-transaction',
      'ledger-summary',
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
    steps: [
      'circumstances',
      'defendant-circumstances',
      'claimant-circumstances',
      'underlessee',
      'underlessee-name',
      'underlessee-address',
      'situation-cya',
    ],
  },
  {
    id: 'otherInformation',
    groupId: 'otherInformation',
    titleKey: 'taskList.sections.otherInformation',
    steps: [
      'other-information',
      'upload-other-documents',
      'other-reasons',
      'general-application',
      'your-support',
      'equality-and-diversity',
      'language-used',
    ],
  },
  {
    id: 'checkAndSubmit',
    groupId: 'reviewAndSubmit',
    titleKey: 'taskList.sections.checkAndSubmit',
    steps: ['check-your-answers'],
    dependsOn: [
      'eligibility',
      'aboutYou',
      'defendants',
      'tenancyGroundsAndNotice',
      'rentArrears',
      'circumstances',
      'otherInformation',
    ],
  },
];

/** The summary pages that end a section: Save and continue on them returns to the task list. */
export const SECTION_SUMMARY_STEPS = [
  'claimant-cya',
  'defendant-cya',
  'notice-cya',
  'arrears-cya',
  'situation-cya',
] as const;
