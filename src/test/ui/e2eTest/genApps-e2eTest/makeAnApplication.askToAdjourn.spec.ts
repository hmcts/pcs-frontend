import { createCaseApiData, submitCaseApiData } from '../../data/api-data';
import { dashboard } from '../../data/page-data';
import {
  areThereAnyReasonsThatThisApplicationShouldNotBeShared,
  askToAdjournTheCourtHearing,
  checkYourAnswersGenApps,
  chooseAnApplication,
  doYouNeedHelpPayingTheFee,
  doYouWantToUploadDocumentsToSupportYourApplication,
  haveTheOtherPartiesAgreedToThisApplication,
  haveYouAlreadyAppliedForHelpWithFees,
  isTheCourtHearingInTheNext14Days,
  paymentDetails,
  uploadDocumentsToSupportYourApplication,
  whatOrderDoYouWantTheCourtToMakeAndWhy,
  whichLanguageDidYouUseToCompleteThisService,
} from '../../data/page-data/genApps-page-data';
import { FieldsStore } from '../../utils/actions/custom-actions/recordAnsweredFields.action';
import { test } from '../../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../../utils/controller';

const home_url = process.env.TEST_URL;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  FieldsStore.clear();
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadDefault });
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + `/access-your-case`);
  await performAction('accessYourCase', {
    caseNumber: process.env.CASE_NUMBER,
    defendantDetailsKnown: false,
  });
  await performValidation('mainHeader', dashboard.mainHeader);
  await performAction('clickLink', dashboard.askTheCourtToMakeAnOrderLink);
  await performValidation('mainHeader', chooseAnApplication.mainHeader);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Make an Application - e2e Journey @nightly', async () => {
  test('Select an Application - Ask to Adjourn journey - Court hearing in 14 days[Yes] @regression @smoke', async () => {
    await performAction('chooseAnApplication', {
      question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
      option: chooseAnApplication.adjournTheHearingRadioOption,
    });
    await performValidation('mainHeader', askToAdjournTheCourtHearing.mainHeader);
    await performAction('clickButton', askToAdjournTheCourtHearing.startNowButton);
    await performValidation('mainHeader', isTheCourtHearingInTheNext14Days.mainHeader);
    await performAction('confirmIfCourtHearingInNext14Days', {
      question: isTheCourtHearingInTheNext14Days.isTheCourtHearingInTheNext14DaysQuestion,
      option: isTheCourtHearingInTheNext14Days.yesRadioOption,
    });
    await performValidation('mainHeader', doYouNeedHelpPayingTheFee.mainHeader);
    await performAction('doYouNeedHelpPayingFee', {
      question: doYouNeedHelpPayingTheFee.doYouNeedHelpPayingTheFeeQuestion,
      option: doYouNeedHelpPayingTheFee.iNeedHelpPayingTheFeeRadioOption,
    });
    await performValidation('mainHeader', haveYouAlreadyAppliedForHelpWithFees.mainHeader);
    await performAction('confirmYouHaveAppliedForFeeHelp', {
      question: haveYouAlreadyAppliedForHelpWithFees.haveYouAlreadyAppliedForHelpQuestion,
      option: haveYouAlreadyAppliedForHelpWithFees.yesRadioOption,
      label: haveYouAlreadyAppliedForHelpWithFees.hwfReferenceHiddenTextLabel,
      input: haveYouAlreadyAppliedForHelpWithFees.hwfReferenceTextInput,
    });
    await performAction('confirmOtherPartiesAgreed', {
      question: haveTheOtherPartiesAgreedToThisApplication.haveTheOtherPartiesAgreedQuestion,
      option: haveTheOtherPartiesAgreedToThisApplication.yesRadioOption,
    });
    await performValidation('mainHeader', whatOrderDoYouWantTheCourtToMakeAndWhy.mainHeader);
    await performAction('confirmOrderDoYouWant', {
      label: whatOrderDoYouWantTheCourtToMakeAndWhy.explainWhatYouWantTextLabel,
      input: whatOrderDoYouWantTheCourtToMakeAndWhy.whatYouWantTheCourtToDoTextInput,
    });
    await performAction('confirmDocumentToUpload', {
      question: doYouWantToUploadDocumentsToSupportYourApplication.doYouWantToUploadDocumentQuestion,
      option: doYouWantToUploadDocumentsToSupportYourApplication.yesRadioOption,
    });
    await performValidation('mainHeader', uploadDocumentsToSupportYourApplication.mainHeader);
    await performAction('uploadFilesGenApps', { files: ['genApps.ppt'] });
    await performAction('selectLanguageUsedToComplete', {
      question: whichLanguageDidYouUseToCompleteThisService.whichLanguageDidYouUseQuestion,
      option: whichLanguageDidYouUseToCompleteThisService.englishRadioOption,
    });
    await performValidation('mainHeader', checkYourAnswersGenApps.mainHeader);
    await performAction('retrieveCYATableData');
    await performAction('validateCYA');
    await performAction('reviewCYA', 'journey1');
    await performAction('reviewAndUpdateCYA', {
      changeOption: isTheCourtHearingInTheNext14Days.isTheCourtHearingInTheNext14DaysQuestion,
      journey: 'journey2',
    });
    await performAction('retrieveCYATableData');
    await performAction('validateCYA');
    await performAction('selectStatementOfTruth', {
      question: checkYourAnswersGenApps.statementOfTruthQuestion,
      option: checkYourAnswersGenApps.iBelieveTheFactsHiddenCheckbox,
      label: checkYourAnswersGenApps.yourFullNameTextLabel,
      input: checkYourAnswersGenApps.yourFullNameTextInput,
    });
    await performAction('verifyApplicationSubmitted');
    await performValidation('mainHeader', dashboard.mainHeader);
  });

  test.skip('Select an Application - Ask to Adjourn journey - Court hearing 14 days[No]', async () => {
    await performAction('chooseAnApplication', {
      question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
      option: chooseAnApplication.adjournTheHearingRadioOption,
    });
    await performValidation('mainHeader', askToAdjournTheCourtHearing.mainHeader);
    await performAction('clickButton', askToAdjournTheCourtHearing.startNowButton);
    await performValidation('mainHeader', isTheCourtHearingInTheNext14Days.mainHeader);
    await performAction('confirmIfCourtHearingInNext14Days', {
      question: isTheCourtHearingInTheNext14Days.isTheCourtHearingInTheNext14DaysQuestion,
      option: isTheCourtHearingInTheNext14Days.noRadioOption,
    });
    await performAction('confirmOtherPartiesAgreed', {
      question: haveTheOtherPartiesAgreedToThisApplication.haveTheOtherPartiesAgreedQuestion,
      option: haveTheOtherPartiesAgreedToThisApplication.noRadioOption,
    });
    await performValidation('mainHeader', areThereAnyReasonsThatThisApplicationShouldNotBeShared.mainHeader);
    await performAction('reasonsApplicationShouldNotBeShared', {
      question: areThereAnyReasonsThatThisApplicationShouldNotBeShared.areThereAnyReasonQuestion,
      option: areThereAnyReasonsThatThisApplicationShouldNotBeShared.yesRadioOption,
      label: areThereAnyReasonsThatThisApplicationShouldNotBeShared.provideReasonHiddenTextLabel,
      input: areThereAnyReasonsThatThisApplicationShouldNotBeShared.provideReasonTextInput,
    });
    await performValidation('mainHeader', whatOrderDoYouWantTheCourtToMakeAndWhy.mainHeader);
    await performAction('confirmOrderDoYouWant', {
      label: whatOrderDoYouWantTheCourtToMakeAndWhy.explainWhatYouWantTextLabel,
      input: whatOrderDoYouWantTheCourtToMakeAndWhy.whatYouWantTheCourtToDoTextInput,
    });
    await performAction('confirmDocumentToUpload', {
      question: doYouWantToUploadDocumentsToSupportYourApplication.doYouWantToUploadDocumentQuestion,
      option: doYouWantToUploadDocumentsToSupportYourApplication.noRadioOption,
    });
    await performAction('selectLanguageUsedToComplete', {
      question: whichLanguageDidYouUseToCompleteThisService.whichLanguageDidYouUseQuestion,
      option: whichLanguageDidYouUseToCompleteThisService.englishRadioOption,
    });
    await performValidation('mainHeader', checkYourAnswersGenApps.mainHeader);
    await performAction('retrieveCYATableData');
    await performAction('validateCYA');
    await performAction('reviewAndUpdateCYA', {
      changeOption: isTheCourtHearingInTheNext14Days.isTheCourtHearingInTheNext14DaysQuestion,
      journey: 'journey3',
    });
    await performAction('retrieveCYATableData');
    await performAction('validateCYA');
    await performAction('selectStatementOfTruth', {
      question: checkYourAnswersGenApps.statementOfTruthQuestion,
      option: checkYourAnswersGenApps.iBelieveTheFactsHiddenCheckbox,
      label: checkYourAnswersGenApps.yourFullNameTextLabel,
      input: checkYourAnswersGenApps.yourFullNameTextInput,
    });
    await performAction('payForApplication');
    await performValidation('mainHeader', paymentDetails.mainHeader);
    await performAction('inputPaymentDetails', {
      question: paymentDetails.mainHeader,
      label1: paymentDetails.cardNumberTextLabel,
      input1: paymentDetails.cardNumberTextInput,
      label2: paymentDetails.monthTextLabel,
      input2: paymentDetails.monthTextInput,
      label3: paymentDetails.yearTextLabel,
      input3: paymentDetails.yearTextInput,
      label4: paymentDetails.nameOnCardTextLabel,
      input4: paymentDetails.nameOnCardTextInput,
      label5: paymentDetails.cardSecurityCodeTextLabel,
      input5: paymentDetails.cardSecurityCodeTextInput,
      label6: paymentDetails.addressLine1TextLabel,
      input6: paymentDetails.addressLine1TextInput,
      label7: paymentDetails.townOrCityTextLabel,
      input7: paymentDetails.townOrCityTextInput,
      label8: paymentDetails.postcodeTextLabel,
      input8: paymentDetails.postcodeTextInput,
      label9: paymentDetails.emailTextLabel,
      input9: paymentDetails.emailTextInput,
    });
    await performAction('confirmPayment');
    await performAction('verifyApplicationSubmitted');
    await performValidation('mainHeader', dashboard.mainHeader);
  });
});
