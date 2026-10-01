import { createCaseApiData, submitCaseApiData } from '../../data/api-data';
import { dashboard } from '../../data/page-data';
import {
  askTheCourtToMakeAnOrder,
  checkYourAnswersGenApps,
  chooseAnApplication,
  doYouNeedHelpPayingTheFee,
  doYouWantToUploadDocumentsToSupportYourApplication,
  haveTheOtherPartiesAgreedToThisApplication,
  haveYouAlreadyAppliedForHelpWithFees,
  uploadDocumentsToSupportYourApplication,
  whatOrderDoYouWantTheCourtToMakeAndWhy,
  whichLanguageDidYouUseToCompleteThisService,
} from '../../data/page-data/genApps-page-data';
import { test } from '../../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../../utils/controller';

const home_url = process.env.TEST_URL;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadDefault });
  await performAction('updatePaymentAPI');
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + `/access-your-case`);
  await performAction('accessYourCase', {
    caseNumber: process.env.CASE_NUMBER,
    defendantDetailsKnown: false,
  });
  await performValidation('Then the user sees the main header', dashboard.mainHeader);
  await performAction('clickLink', dashboard.askTheCourtToMakeAnOrderLink);
  await performValidation('Then the user sees the main header', chooseAnApplication.mainHeader);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Make an Application - e2e Journey @nightly', async () => {
  test('Select an Application - Something else', async () => {
    await performAction('chooseAnApplication', {
      question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
      option: chooseAnApplication.somethingElseRadioOption,
    });
    await performValidation('Then the user sees the main header', askTheCourtToMakeAnOrder.mainHeader);
    await performAction('When the user clicks the button', askTheCourtToMakeAnOrder.startNowButton);
    await performValidation('Then the user sees the main header', doYouNeedHelpPayingTheFee.mainHeader);
    await performAction('doYouNeedHelpPayingFee', {
      question: doYouNeedHelpPayingTheFee.doYouNeedHelpPayingTheFeeQuestion,
      option: doYouNeedHelpPayingTheFee.iNeedHelpPayingTheFeeRadioOption,
    });
    await performValidation('Then the user sees the main header', haveYouAlreadyAppliedForHelpWithFees.mainHeader);
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
    await performValidation('Then the user sees the main header', uploadDocumentsToSupportYourApplication.mainHeader);
    await performAction('uploadFilesGenApps', { files: ['genApps.xlsx'] });
    await performAction('selectLanguageUsedToComplete', {
      question: whichLanguageDidYouUseToCompleteThisService.whichLanguageDidYouUseQuestion,
      option: whichLanguageDidYouUseToCompleteThisService.englishRadioOption,
    });
    await performValidation('Then the user sees the main header', checkYourAnswersGenApps.mainHeader);
    await performAction('retrieveCYATableData');
    await performAction('validateCYA');
    await performAction('reviewAndUpdateCYA', {
      changeOption: 'What order do you want the court to make and why?',
      journey: 'journey4',
    });
    await performAction('retrieveCYATableData');
    await performAction('validateCYA');
    await performAction('reviewAndUpdateCYA', {
      changeOption: 'What is your Help with Fees reference number?',
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
    await performValidation('Then the user sees the main header', dashboard.mainHeader);
  });
});
