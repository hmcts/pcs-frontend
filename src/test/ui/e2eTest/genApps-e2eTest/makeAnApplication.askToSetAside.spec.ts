import { createCaseApiData, submitCaseApiData } from '../../data/api-data';
import { dashboard } from '../../data/page-data';
import {
  askTheCourtToSetAsideTheOrder,
  checkYourAnswersGenApps,
  chooseAnApplication,
  doYouNeedHelpPayingTheFee,
  doYouWantToUploadDocumentsToSupportYourApplication,
  haveTheOtherPartiesAgreedToThisApplication,
  haveYouAlreadyAppliedForHelpWithFees,
  paymentDetails,
  uploadDocumentsToSupportYourApplication,
  whatOrderDoYouWantTheCourtToMakeAndWhy,
  whichLanguageDidYouUseToCompleteThisService,
  youNeedToApplyForHelpWithYourApplicationFee,
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
  test('Select an Application - Ask to Set aside @regression', async () => {
    await performAction('chooseAnApplication', {
      question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
      option: chooseAnApplication.setAsideRadioOption,
    });
    await performAction('clickButton', askTheCourtToSetAsideTheOrder.startNowButton);
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
    await performAction('confirmOrderDoYouWant', {
      label: whatOrderDoYouWantTheCourtToMakeAndWhy.explainWhatYouWantTextLabel,
      input: whatOrderDoYouWantTheCourtToMakeAndWhy.whatYouWantTheCourtToDoTextInput,
    });
    await performAction('confirmDocumentToUpload', {
      question: doYouWantToUploadDocumentsToSupportYourApplication.doYouWantToUploadDocumentQuestion,
      option: doYouWantToUploadDocumentsToSupportYourApplication.yesRadioOption,
    });
    await performValidation('mainHeader', uploadDocumentsToSupportYourApplication.mainHeader);
    await performAction('uploadFilesGenApps', { files: ['genApps.docx'] });
    await performAction('selectLanguageUsedToComplete', {
      question: whichLanguageDidYouUseToCompleteThisService.whichLanguageDidYouUseQuestion,
      option: whichLanguageDidYouUseToCompleteThisService.englishRadioOption,
    });
    await performValidation('mainHeader', checkYourAnswersGenApps.mainHeader);
    await performAction('retrieveCYATableData');
    await performAction('validateCYA');
    await performAction('reviewAndUpdateCYA', {
      changeOption: doYouNeedHelpPayingTheFee.doYouNeedHelpPayingTheFeeQuestion,
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
    await performAction('payForApplication');
    await performValidation('mainHeader', paymentDetails.mainHeader);
    await performAction('inputPaymentDetails', {
      question: paymentDetails.mainHeader,
      cardNumberLabel: paymentDetails.cardNumberTextLabel,
      cardNumber: paymentDetails.cardNumberTextInput,
      monthLabel: paymentDetails.monthTextLabel,
      month: paymentDetails.monthTextInput,
      yearLabel: paymentDetails.yearTextLabel,
      year: paymentDetails.yearTextInput,
      nameOnCardLabel: paymentDetails.nameOnCardTextLabel,
      nameOnCard: paymentDetails.nameOnCardTextInput,
      cardSecurityCodeLabel: paymentDetails.cardSecurityCodeTextLabel,
      cardSecurityCode: paymentDetails.cardSecurityCodeTextInput,
      addressLine1Label: paymentDetails.addressLine1TextLabel,
      addressLine1: paymentDetails.addressLine1TextInput,
      townOrCityLabel: paymentDetails.townOrCityTextLabel,
      townOrCity: paymentDetails.townOrCityTextInput,
      postcodeLabel: paymentDetails.postcodeTextLabel,
      postcode: paymentDetails.postcodeTextInput,
      emailLabel: paymentDetails.emailTextLabel,
      email: paymentDetails.emailTextInput,
    });
    await performAction('confirmPayment');
    await performAction('verifyApplicationSubmitted');
    await performValidation('mainHeader', dashboard.mainHeader);
  });

  test('Select an Application - Ask to Set aside - You need to apply for application fee @regression', async () => {
    await performAction('chooseAnApplication', {
      question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
      option: chooseAnApplication.setAsideRadioOption,
    });
    await performAction('clickButton', askTheCourtToSetAsideTheOrder.startNowButton);
    await performValidation('mainHeader', doYouNeedHelpPayingTheFee.mainHeader);
    await performAction('doYouNeedHelpPayingFee', {
      question: doYouNeedHelpPayingTheFee.doYouNeedHelpPayingTheFeeQuestion,
      option: doYouNeedHelpPayingTheFee.iNeedHelpPayingTheFeeRadioOption,
    });
    await performValidation('mainHeader', haveYouAlreadyAppliedForHelpWithFees.mainHeader);
    await performAction('confirmYouHaveAppliedForFeeHelp', {
      question: haveYouAlreadyAppliedForHelpWithFees.haveYouAlreadyAppliedForHelpQuestion,
      option: haveYouAlreadyAppliedForHelpWithFees.noRadioOption,
      label: haveYouAlreadyAppliedForHelpWithFees.hwfReferenceHiddenTextLabel,
      input: haveYouAlreadyAppliedForHelpWithFees.hwfReferenceTextInput,
    });
    await performValidation('mainHeader', youNeedToApplyForHelpWithYourApplicationFee.mainHeader);
  });
});
