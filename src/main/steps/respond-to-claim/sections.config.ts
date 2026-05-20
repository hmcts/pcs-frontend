import type { Request } from 'express';

import type { SectionConfig } from '../../modules/steps/stepFlow.interface';
import { hasAnyRentArrearsGround } from '../utils';

const sectionDefs = [
  {
    id: 'startNowAndDetails',
    titleKey: 'taskList.startNowAndDetails',
    steps: ['start-now', 'free-legal-advice', 'section-cya-start-now-and-details'],
  },
  {
    id: 'personalDetails',
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
      'counter-claim-order-other-than-sum',
      'counter-claim-upload-documents',
      'section-cya-dispute-and-tenancy',
    ],
  },
  {
    id: 'payments',
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
    titleKey: 'taskList.uploadFiles',
    steps: ['upload-document', 'support-needs', 'section-cya-upload-files'],
  },
  {
    id: 'checkYourAnswersAndSubmit',
    titleKey: 'taskList.checkYourAnswersAndSubmit',
    steps: ['equality-and-diversity-start', 'equality-and-diversity-end', 'language-used', 'check-your-answers'],
  },
] as const;

export type RespondToClaimSectionId = (typeof sectionDefs)[number]['id'];

export const RESPOND_TO_CLAIM_SECTION_IDS: readonly RespondToClaimSectionId[] = sectionDefs.map(s => s.id);

export const respondToClaimSections: SectionConfig[] = sectionDefs.map(s => ({
  ...s,
  steps: [...s.steps],
}));
