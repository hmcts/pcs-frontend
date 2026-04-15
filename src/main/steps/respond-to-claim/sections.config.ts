import type { SectionConfig } from '../../interfaces/stepFlow.interface';
import { hasAnyRentArrearsGround } from '../utils';

export const respondToClaimSections = {
  startNowAndDetails: {
    titleKey: 'taskList.startNowAndDetails',
    order: 1,
    steps: ['start-now', 'free-legal-advice'],
  },
  personalDetails: {
    titleKey: 'taskList.personalDetails',
    order: 2,
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
  disputeAndTenancy: {
    titleKey: 'taskList.disputeAndTenancy',
    order: 3,
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
    ],
  },
  payments: {
    titleKey: 'taskList.payments',
    order: 4,
    steps: [
      'payment-interstitial',
      'repayments-made',
      'repayments-agreed',
      'installment-payments',
      'how-much-afford-to-pay',
    ],
    isApplicable: req => hasAnyRentArrearsGround(req),
  },
  situationAndCircumstances: {
    titleKey: 'taskList.situationAndCircumstances',
    order: 5,
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
  incomeAndExpenditure: {
    titleKey: 'taskList.incomeAndExpenditure',
    order: 6,
    steps: [
      'income-and-expenditure',
      'what-regular-income-do-you-receive',
      'have-you-applied-for-universal-credit',
      'priority-debts',
      'priority-debt-details',
      'what-other-regular-expenses-do-you-have',
    ],
  },
  uploadFiles: {
    titleKey: 'taskList.uploadFiles',
    order: 7,
    steps: [],
  },
  checkYourAnswersAndSubmit: {
    titleKey: 'taskList.checkYourAnswersAndSubmit',
    order: 8,
    steps: [],
  },
} satisfies Record<string, SectionConfig>;

export type RespondToClaimSectionId = keyof typeof respondToClaimSections;
