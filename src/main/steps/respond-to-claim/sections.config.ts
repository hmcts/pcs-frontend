import type { Request } from 'express';

import type { SectionConfig } from '../../modules/steps/stepFlow.interface';
import { hasAnyRentArrearsGround } from '../utils';

// Visual groups on the task-list page (Figma decision #4 + #6).
// Section order within a group is the declaration order in sectionDefs below.
export const RESPOND_TO_CLAIM_SECTION_GROUPS = [
  { id: 'checkBeforeYouStart', titleKey: 'taskList.groups.checkBeforeYouStart' },
  { id: 'yourResponse', titleKey: 'taskList.groups.yourResponse' },
  { id: 'provideEvidence', titleKey: 'taskList.groups.provideEvidence' },
  { id: 'reviewAndSubmit', titleKey: 'taskList.groups.reviewAndSubmit' },
] as const;

export type RespondToClaimGroupId = (typeof RESPOND_TO_CLAIM_SECTION_GROUPS)[number]['id'];

const sectionDefs = [
  {
    id: 'startNowAndDetails',
    groupId: 'checkBeforeYouStart',
    titleKey: 'taskList.startNowAndDetails',
    steps: ['start-now', 'free-legal-advice', 'section-cya-start-now-and-details'],
  },
  {
    id: 'personalDetails',
    groupId: 'yourResponse',
    titleKey: 'taskList.personalDetails',
    steps: [
      'defendant-name-confirmation',
      'defendant-name-capture',
      'defendant-date-of-birth',
      'correspondence-address',
      'contact-preferences-email-or-post',
      'contact-preferences-telephone',
      'contact-preferences-text-message',
      'section-cya-personal-details',
    ],
  },
  {
    id: 'disputeAndTenancy',
    groupId: 'yourResponse',
    titleKey: 'taskList.disputeAndTenancy',
    steps: [
      'dispute-claim-interstitial',
      'landlord-registered',
      'landlord-licensed',
      'written-terms',
      'tenancy-type-details',
      'tenancy-date-details',
      'tenancy-date-unknown',
      'confirmation-of-notice-given',
      'confirmation-of-notice-date-when-provided',
      'confirmation-of-notice-date-when-not-provided',
      'rent-arrears-dispute',
      'non-rent-arrears-dispute',
      'counter-claim',
      'counter-claim-what-are-you-claiming-for',
      'counter-claim-specific-sum',
      'counter-claim-fee',
      'counter-claim-have-you-applied-for-help',
      'counter-claim-against-whom',
      'counter-claim-about',
      'section-cya-dispute-and-tenancy',
    ],
  },
  {
    id: 'payments',
    groupId: 'yourResponse',
    titleKey: 'taskList.payments',
    steps: [
      'payment-interstitial',
      'repayments-made',
      'repayments-agreed',
      'installment-payments',
      'how-much-afford-to-pay',
      'section-cya-payments',
    ],
    isApplicable: async (req: Request) => hasAnyRentArrearsGround(req),
  },
  {
    id: 'situationAndCircumstances',
    groupId: 'yourResponse',
    titleKey: 'taskList.situationAndCircumstances',
    steps: [
      'your-household-and-circumstances',
      'do-you-have-any-dependant-children',
      'do-you-have-any-other-dependants',
      'do-any-other-adults-live-in-your-home',
      'would-you-have-somewhere-else-to-live-if-you-had-to-leave-your-home',
      'your-circumstances',
      'exceptional-hardship',
      'section-cya-situation-and-circumstances',
    ],
  },
  {
    id: 'incomeAndExpenditure',
    groupId: 'yourResponse',
    titleKey: 'taskList.incomeAndExpenditure',
    steps: [
      'income-and-expenses',
      'what-regular-income-do-you-receive',
      'have-you-applied-for-universal-credit',
      'priority-debts',
      'priority-debt-details',
      'what-other-regular-expenses-do-you-have',
      'other-considerations',
      'section-cya-income-and-expenditure',
    ],
  },
  {
    id: 'uploadFiles',
    groupId: 'provideEvidence',
    titleKey: 'taskList.uploadFiles',
    steps: ['upload-document', 'support-needs', 'section-cya-upload-files'],
  },
  {
    id: 'checkYourAnswersAndSubmit',
    groupId: 'reviewAndSubmit',
    titleKey: 'taskList.checkYourAnswersAndSubmit',
    dependsOn: [
      'startNowAndDetails',
      'personalDetails',
      'disputeAndTenancy',
      'payments',
      'situationAndCircumstances',
      'incomeAndExpenditure',
      'uploadFiles',
    ],
    steps: ['equality-and-diversity-start', 'equality-and-diversity-end', 'language-used', 'check-your-answers'],
  },
] as const;

export type RespondToClaimSectionId = (typeof sectionDefs)[number]['id'];

export const RESPOND_TO_CLAIM_SECTION_IDS: readonly RespondToClaimSectionId[] = sectionDefs.map(s => s.id);

export const respondToClaimSections: SectionConfig[] = sectionDefs.map(s => {
  const out: SectionConfig = {
    id: s.id,
    groupId: s.groupId,
    titleKey: s.titleKey,
    steps: [...s.steps],
  };
  if ('isApplicable' in s) {
    out.isApplicable = s.isApplicable;
  }
  if ('dependsOn' in s) {
    out.dependsOn = [...s.dependsOn];
  }
  return out;
});
