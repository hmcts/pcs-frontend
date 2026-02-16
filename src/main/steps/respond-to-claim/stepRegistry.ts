import type { StepDefinition } from '../../interfaces/stepFormData.interface';

import { step as wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome } from './alternative-accommodation';
import { step as doYouHaveAnyOtherDependants } from './any-other-dependants';
import { step as contactPreferences } from './contact-preferences';
import { step as correspondenceAddress } from './correspondence-address';
import { step as counterClaim } from './counter-claim';
import { step as yourCircumstances } from './current-circumstances';
import { step as defendantDateOfBirth } from './defendant-date-of-birth';
import { step as defendantNameCapture } from './defendant-name-capture';
import { step as defendantNameConfirmation } from './defendant-name-confirmation';
import { step as doYouHaveAnyDependantChildren } from './dependant-children';
import { step as disputeClaimInterstitial } from './dispute-claim-interstitial';
import { step as exceptionalHardship } from './exceptional-hardship';
import { step as freeLegalAdvice } from './free-legal-advice';
import { step as incomeAndExpenditure } from './income-and-expenditure';
import { step as landlordRegistered } from './landlord-registered';
import { step as doAnyOtherAdultsLiveInYourHome } from './other-adults';
import { step as paymentInterstitial } from './payment-interstitial';
import { step as priorityDebtDetails } from './priority-debt-details';
import { step as priorityDebts } from './priority-debts';
import { step as whatOtherRegularExpensesDoYouHave } from './regular-expenses';
import { step as whatRegularIncomeDoYouReceive } from './regular-income';
import { step as repayments } from './repayments';
import { step as yourHouseholdAndCircumstances } from './situation-interstitial';
import { step as startNow } from './start-now';
import { step as tenancyDetails } from './tenancy-details';
import { step as haveYouAppliedForUniversalCredit } from './universal-credit';

export const stepRegistry: Record<string, StepDefinition> = {
  'start-now': startNow,
  'correspondence-address': correspondenceAddress,
  'free-legal-advice': freeLegalAdvice,
  'defendant-name-confirmation': defendantNameConfirmation,
  'defendant-name-capture': defendantNameCapture,
  'defendant-date-of-birth': defendantDateOfBirth,
  'payment-interstitial': paymentInterstitial,
  repayments,
  'counter-claim': counterClaim,
  'dispute-claim-interstitial': disputeClaimInterstitial,
  'landlord-registered': landlordRegistered,
  'tenancy-details': tenancyDetails,
  'contact-preferences': contactPreferences,
  'your-household-and-circumstances': yourHouseholdAndCircumstances,
  'do-you-have-any-dependant-children': doYouHaveAnyDependantChildren,
  'do-you-have-any-other-dependants': doYouHaveAnyOtherDependants,
  'do-any-other-adults-live-in-your-home': doAnyOtherAdultsLiveInYourHome,
  'would-you-have-somewhere-else-to-live-if-you-had-to-leave-your-home':
    wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  'your-circumstances': yourCircumstances,
  'exceptional-hardship': exceptionalHardship,
  'income-and-expenditure': incomeAndExpenditure,
  'what-regular-income-do-you-receive': whatRegularIncomeDoYouReceive,
  'have-you-applied-for-universal-credit': haveYouAppliedForUniversalCredit,
  'priority-debts': priorityDebts,
  'priority-debt-details': priorityDebtDetails,
  'what-other-regular-expenses-do-you-have': whatOtherRegularExpensesDoYouHave,
};
