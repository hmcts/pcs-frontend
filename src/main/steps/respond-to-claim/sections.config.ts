import type { SectionConfig } from '../../modules/steps/stepFlow.interface';
import { hasAnyRentArrearsGround } from '../utils';

export const RESPOND_TO_CLAIM_SECTION_IDS = [
  'startNowAndDetails',
  'personalDetails',
  'disputeAndTenancy',
  'payments',
  'situationAndCircumstances',
  'incomeAndExpenditure',
  'uploadFiles',
  'checkYourAnswersAndSubmit',
] as const;

export type RespondToClaimSectionId = (typeof RESPOND_TO_CLAIM_SECTION_IDS)[number];

export const respondToClaimSections: SectionConfig[] = [
  {
    id: 'startNowAndDetails',
    titleKey: 'taskList.startNowAndDetails',
    steps: ['start-now', 'free-legal-advice'],
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
    ],
    isApplicable: async req => hasAnyRentArrearsGround(req),
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
    ],
  },
  {
    id: 'uploadFiles',
    titleKey: 'taskList.uploadFiles',
    steps: ['upload-document', 'support-needs'],
  },
  {
    id: 'checkYourAnswersAndSubmit',
    titleKey: 'taskList.checkYourAnswersAndSubmit',
    steps: [
      'reasonable-adjustments-triage',
      'equality-and-diversity-start',
      'equality-and-diversity-end',
      'language-used',
      'check-your-answers',
    ],
  },
];
