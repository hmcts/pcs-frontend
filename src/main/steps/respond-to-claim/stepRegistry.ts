import { step as wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome } from './alternative-accommodation';
import { step as doYouHaveAnyOtherDependants } from './any-other-dependants';
import { step as checkYourAnswers } from './check-your-answers';
import { step as checkYourAnswersDocuments } from './check-your-answers-documents';
import { step as checkYourAnswersIncomeAndExpenses } from './check-your-answers-income-and-expenses';
import { step as checkYourAnswersPaymentsAndAgreements } from './check-your-answers-payments-and-agreements';
import { step as checkYourAnswersPersonalDetails } from './check-your-answers-personal-details';
import { step as checkYourAnswersStartNowAndDetails } from './check-your-answers-start-now-and-details';
import { step as checkYourAnswersYourCircumstances } from './check-your-answers-your-circumstances';
import { step as checkYourAnswersYourResponse } from './check-your-answers-your-response';
import { step as confirmationOfNoticeDateNotProvided } from './confirmation-of-notice-date-when-not-provided';
import { step as confirmationOfNoticeDateProvided } from './confirmation-of-notice-date-when-provided';
import { step as confirmationOfNoticeGiven } from './confirmation-of-notice-given';
import { step as contactPreferencesEmailOrPost } from './contact-preferences-email-or-post';
import { step as contactPreferencesTelephone } from './contact-preferences-telephone';
import { step as contactPreferencesTextMessage } from './contact-preferences-text-message';
import { step as correspondenceAddress } from './correspondence-address';
import { step as counterClaim } from './counter-claim';
import { step as counterClaimAbout } from './counter-claim-about';
import { step as counterClaimAgainstWhom } from './counter-claim-against-whom';
import { step as counterClaimDoYouWantToUploadFiles } from './counter-claim-do-you-want-to-upload-files';
import { step as counterClaimFee } from './counter-claim-fee';
import { step as counterClaimHaveYouAppliedForHelp } from './counter-claim-have-you-applied-for-help';
import { step as counterClaimOrderOtherThanSum } from './counter-claim-order-other-than-sum';
import { step as counterClaimSpecificSum } from './counter-claim-specific-sum';
import { step as counterClaimUploadFiles } from './counter-claim-upload-files';
import { step as counterClaimWhatAreYouClaimingFor } from './counter-claim-what-are-you-claiming-for';
import { step as counterClaimYouNeedToApplyForHelpWithYourFees } from './counter-claim-you-need-to-apply-for-help-with-your-fees';
import { step as yourCircumstances } from './current-circumstances';
import { step as defendantDateOfBirth } from './defendant-date-of-birth';
import { step as defendantNameCapture } from './defendant-name-capture';
import { step as defendantNameConfirmation } from './defendant-name-confirmation';
import { step as doYouHaveAnyDependantChildren } from './dependant-children';
import { step as disputeClaimInterstitial } from './dispute-claim-interstitial';
import { step as endNow } from './end-now';
import { step as equalityAndDiversityEnd } from './equality-and-diversity-end';
import { step as equalityAndDiversityStart } from './equality-and-diversity-start';
import { step as exceptionalHardship } from './exceptional-hardship';
import { step as freeLegalAdvice } from './free-legal-advice';
import { step as howMuchAffordToPay } from './how-much-afford-to-pay';
import { step as incomeAndExpenses } from './income-and-expenditure';
import { step as installmentPayments } from './installment-payments';
import { step as landlordLicensed } from './landlord-licensed';
import { step as landlordRegistered } from './landlord-registered';
import { step as languageUsed } from './language-used';
import { step as nonRentArrearsDispute } from './non-rent-arrears-dispute';
import { step as doAnyOtherAdultsLiveInYourHome } from './other-adults';
import { step as otherConsiderations } from './other-considerations';
import { step as paymentInterstitial } from './payment-interstitial';
import { step as priorityDebtDetails } from './priority-debt-details';
import { step as priorityDebts } from './priority-debts';
import { step as reasonableAdjustmentsTriage } from './reasonable-adjustments-triage';
import { step as regularExpenses } from './regular-expenses';
import { step as whatRegularIncomeDoYouReceive } from './regular-income';
import { step as rentArrearsDispute } from './rent-arrears-dispute';
import { step as repaymentsAgreed } from './repayments-agreed';
import { step as repaymentsMade } from './repayments-made';
import { step as yourHouseholdAndCircumstances } from './situation-interstitial';
import { step as startNow } from './start-now';
import { step as taskList } from './task-list';
import { step as tenancyDateDetails } from './tenancy-date-details';
import { step as tenancyDateUnknown } from './tenancy-date-unknown';
import { step as tenancyTypeDetails } from './tenancy-type-details';
import { step as haveYouAppliedForUniversalCredit } from './universal-credit';
import { step as uploadDocument } from './upload-document';
import { step as writtenTerms } from './written-terms';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const stepRegistry = {
  'start-now': startNow,
  'correspondence-address': correspondenceAddress,
  'free-legal-advice': freeLegalAdvice,
  'defendant-name-confirmation': defendantNameConfirmation,
  'defendant-name-capture': defendantNameCapture,
  'defendant-date-of-birth': defendantDateOfBirth,
  'contact-preferences-email-or-post': contactPreferencesEmailOrPost,
  'contact-preferences-telephone': contactPreferencesTelephone,
  'contact-preferences-text-message': contactPreferencesTextMessage,
  'dispute-claim-interstitial': disputeClaimInterstitial,
  'end-now': endNow,
  'task-list': taskList,
  'check-your-answers-start-now-and-details': checkYourAnswersStartNowAndDetails,
  'check-your-answers-personal-details': checkYourAnswersPersonalDetails,
  'check-your-answers-your-response': checkYourAnswersYourResponse,
  'check-your-answers-payments-and-agreements': checkYourAnswersPaymentsAndAgreements,
  'check-your-answers-your-circumstances': checkYourAnswersYourCircumstances,
  'check-your-answers-income-and-expenses': checkYourAnswersIncomeAndExpenses,
  'check-your-answers-documents': checkYourAnswersDocuments,
  'landlord-registered': landlordRegistered,
  'landlord-licensed': landlordLicensed,
  'written-terms': writtenTerms,
  'tenancy-type-details': tenancyTypeDetails,
  'tenancy-date-details': tenancyDateDetails,
  'tenancy-date-unknown': tenancyDateUnknown,
  'confirmation-of-notice-given': confirmationOfNoticeGiven,
  'confirmation-of-notice-date-when-provided': confirmationOfNoticeDateProvided,
  'confirmation-of-notice-date-when-not-provided': confirmationOfNoticeDateNotProvided,
  'rent-arrears-dispute': rentArrearsDispute,
  'non-rent-arrears-dispute': nonRentArrearsDispute,
  'upload-document': uploadDocument,
  'counter-claim': counterClaim,
  'counter-claim-what-are-you-claiming-for': counterClaimWhatAreYouClaimingFor,
  'counter-claim-specific-sum': counterClaimSpecificSum,
  'counter-claim-fee': counterClaimFee,
  'counter-claim-have-you-applied-for-help': counterClaimHaveYouAppliedForHelp,
  'counter-claim-you-need-to-apply-for-help-with-your-fees': counterClaimYouNeedToApplyForHelpWithYourFees,
  'counter-claim-against-whom': counterClaimAgainstWhom,
  'counter-claim-about': counterClaimAbout,
  'counter-claim-order-other-than-sum': counterClaimOrderOtherThanSum,
  'counter-claim-do-you-want-to-upload-files': counterClaimDoYouWantToUploadFiles,
  'counter-claim-upload-files': counterClaimUploadFiles,
  'payment-interstitial': paymentInterstitial,
  'repayments-made': repaymentsMade,
  'repayments-agreed': repaymentsAgreed,
  'installment-payments': installmentPayments,
  'how-much-afford-to-pay': howMuchAffordToPay,
  'your-household-and-circumstances': yourHouseholdAndCircumstances,
  'do-you-have-any-dependant-children': doYouHaveAnyDependantChildren,
  'do-you-have-any-other-dependants': doYouHaveAnyOtherDependants,
  'do-any-other-adults-live-in-your-home': doAnyOtherAdultsLiveInYourHome,
  'would-you-have-somewhere-else-to-live-if-you-had-to-leave-your-home':
    wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome,
  'your-circumstances': yourCircumstances,
  'exceptional-hardship': exceptionalHardship,
  'income-and-expenses': incomeAndExpenses,
  'what-regular-income-do-you-receive': whatRegularIncomeDoYouReceive,
  'have-you-applied-for-universal-credit': haveYouAppliedForUniversalCredit,
  'priority-debts': priorityDebts,
  'priority-debt-details': priorityDebtDetails,
  'what-other-regular-expenses-do-you-have': regularExpenses,
  'other-considerations': otherConsiderations,
  'reasonable-adjustments-triage': reasonableAdjustmentsTriage,
  'equality-and-diversity-start': equalityAndDiversityStart,
  'equality-and-diversity-end': equalityAndDiversityEnd,
  'language-used': languageUsed,
  'check-your-answers': checkYourAnswers,
} satisfies Record<string, StepDefinition>;

export type RespondToClaimStepName = keyof typeof stepRegistry;
