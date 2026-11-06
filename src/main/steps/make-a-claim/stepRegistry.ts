import { step as additionalDefendants } from './additional-defendants';
import { step as arrearsAtNotice } from './arrears-at-notice';
import { step as arrearsCya } from './arrears-cya';
import { step as arrearsProof } from './arrears-proof';
import { step as checkYourAnswers } from './check-your-answers';
import { step as circumstances } from './circumstances';
import { step as claimantAddress } from './claimant-address';
import { step as claimantCircumstances } from './claimant-circumstances';
import { step as claimantCya } from './claimant-cya';
import { step as claimantEmail } from './claimant-email';
import { step as claimantName } from './claimant-name';
import { step as claimantPhone } from './claimant-phone';
import { step as claimantTextMessage } from './claimant-text-message';
import { step as currentArrears } from './current-arrears';
import { step as defendantAddress } from './defendant-address';
import { step as defendantCircumstances } from './defendant-circumstances';
import { step as defendantCya } from './defendant-cya';
import { step as defendantDetails } from './defendant-details';
import { step as defendantName } from './defendant-name';
import { step as eligible } from './eligible';
import { step as equalityAndDiversity } from './equality-and-diversity';
import { step as generalApplication } from './general-application';
import { step as groundReason } from './ground-reason';
import { step as individualOrOrganisation } from './individual-or-organisation';
import { step as languageUsed } from './language-used';
import { step as ledgerSummary } from './ledger-summary';
import { step as ledgerTransaction } from './ledger-transaction';
import { step as moneyJudgment } from './money-judgment';
import { step as multipleClaimants } from './multiple-claimants';
import { step as multipleClaimantsIneligible } from './multiple-claimants-ineligible';
import { step as noticeAvailable } from './notice-available';
import { step as noticeCya } from './notice-cya';
import { step as noticeDate } from './notice-date';
import { step as noticeDetails } from './notice-details';
import { step as noticeMethod } from './notice-method';
import { step as noticeServed } from './notice-served';
import { step as noticeType } from './notice-type';
import { step as organisationName } from './organisation-name';
import { step as otherGrounds } from './other-grounds';
import { step as otherGroundsClaim } from './other-grounds-claim';
import { step as otherInformation } from './other-information';
import { step as otherReasons } from './other-reasons';
import { step as recoverySteps } from './recovery-steps';
import { step as removeDefendant } from './remove-defendant';
import { step as removeLedgerEntry } from './remove-ledger-entry';
import { step as rentAmount } from './rent-amount';
import { step as rentArrears } from './rent-arrears';
import { step as rentArrearsClaim } from './rent-arrears-claim';
import { step as rentArrearsGrounds } from './rent-arrears-grounds';
import { step as rentDueDay } from './rent-due-day';
import { step as rentFrequency } from './rent-frequency';
import { step as rentStatement } from './rent-statement';
import { step as rentStatementPayment } from './rent-statement-payment';
import { step as situationCya } from './situation-cya';
import { step as statementPeriod } from './statement-period';
import { step as taskList } from './task-list';
import { step as tenancyAgreement } from './tenancy-agreement';
import { step as tenancyCya } from './tenancy-cya';
import { step as tenancyDetails } from './tenancy-details';
import { step as tenancyStartDate } from './tenancy-start-date';
import { step as tenancyType } from './tenancy-type';
import { step as underlessee } from './underlessee';
import { step as underlesseeAddress } from './underlessee-address';
import { step as underlesseeName } from './underlessee-name';
import { step as uploadNotice } from './upload-notice';
import { step as uploadOtherDocuments } from './upload-other-documents';
import { step as uploadRentStatement } from './upload-rent-statement';
import { step as uploadTenancyAgreement } from './upload-tenancy-agreement';
import { step as yourDetails } from './your-details';
import { step as yourSupport } from './your-support';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const stepRegistry: Record<string, StepDefinition> = {
  eligible,
  'your-details': yourDetails,
  'individual-or-organisation': individualOrOrganisation,
  'claimant-name': claimantName,
  'organisation-name': organisationName,
  'claimant-address': claimantAddress,
  'claimant-email': claimantEmail,
  'claimant-phone': claimantPhone,
  'claimant-text-message': claimantTextMessage,
  'multiple-claimants': multipleClaimants,
  'claimant-cya': claimantCya,
  'defendant-details': defendantDetails,
  'defendant-name': defendantName,
  'defendant-address': defendantAddress,
  'additional-defendants': additionalDefendants,
  'defendant-cya': defendantCya,
  'tenancy-details': tenancyDetails,
  'tenancy-type': tenancyType,
  'tenancy-start-date': tenancyStartDate,
  'tenancy-agreement': tenancyAgreement,
  'upload-tenancy-agreement': uploadTenancyAgreement,
  'rent-arrears-claim': rentArrearsClaim,
  'rent-arrears-grounds': rentArrearsGrounds,
  'other-grounds-claim': otherGroundsClaim,
  'other-grounds': otherGrounds,
  'ground-reason': groundReason,
  'tenancy-cya': tenancyCya,
  'notice-details': noticeDetails,
  'notice-served': noticeServed,
  'notice-type': noticeType,
  'notice-date': noticeDate,
  'notice-method': noticeMethod,
  'notice-available': noticeAvailable,
  'upload-notice': uploadNotice,
  'notice-cya': noticeCya,
  'rent-arrears': rentArrears,
  'rent-amount': rentAmount,
  'rent-frequency': rentFrequency,
  'rent-due-day': rentDueDay,
  'arrears-at-notice': arrearsAtNotice,
  'current-arrears': currentArrears,
  'arrears-proof': arrearsProof,
  'upload-rent-statement': uploadRentStatement,
  'ledger-transaction': ledgerTransaction,
  'ledger-summary': ledgerSummary,
  'statement-period': statementPeriod,
  'rent-statement': rentStatement,
  'rent-statement-payment': rentStatementPayment,
  'money-judgment': moneyJudgment,
  'recovery-steps': recoverySteps,
  'arrears-cya': arrearsCya,
  circumstances,
  'defendant-circumstances': defendantCircumstances,
  'claimant-circumstances': claimantCircumstances,
  underlessee,
  'underlessee-name': underlesseeName,
  'underlessee-address': underlesseeAddress,
  'situation-cya': situationCya,
  'other-information': otherInformation,
  'upload-other-documents': uploadOtherDocuments,
  'other-reasons': otherReasons,
  'general-application': generalApplication,
  'your-support': yourSupport,
  'equality-and-diversity': equalityAndDiversity,
  'language-used': languageUsed,
  'check-your-answers': checkYourAnswers,
  'task-list': taskList,
  'remove-defendant': removeDefendant,
  'remove-ledger-entry': removeLedgerEntry,
  'multiple-claimants-ineligible': multipleClaimantsIneligible,
};
