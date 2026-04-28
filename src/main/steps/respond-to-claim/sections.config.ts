import type { SectionConfig } from '../../modules/steps/stepFlow.interface';
import { hasAnyRentArrearsGround } from '../utils';

export const respondToClaimSections = {
  startNowAndDetails: {
    titleKey: 'taskList.startNowAndDetails',
    steps: ['start-now', 'free-legal-advice'],
  },
  personalDetails: {
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
  disputeAndTenancy: {
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
    ],
  },
  payments: {
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
  situationAndCircumstances: {
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
  incomeAndExpenditure: {
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
  uploadFiles: {
    titleKey: 'taskList.uploadFiles',
    steps: ['upload-docs'],
  },
  checkYourAnswersAndSubmit: {
    titleKey: 'taskList.checkYourAnswersAndSubmit',
    steps: ['language-used', 'equality-and-diversity-start', 'equality-and-diversity-end', 'check-your-answers'],
  },
} satisfies Record<string, SectionConfig>;

export type RespondToClaimSectionId = keyof typeof respondToClaimSections;
