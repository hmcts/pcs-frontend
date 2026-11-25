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
  uploadDocumentsToSupportYourApplication,
  whatOrderDoYouWantTheCourtToMakeAndWhy,
  whichLanguageDidYouUseToCompleteThisService,
  youNeedToApplyForHelpWithYourApplicationFee,
} from '../../data/page-data/genApps-page-data';
import { DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG } from '../../utils/actions/custom-actions/launchDarkly.action';
import { FieldsStore } from '../../utils/actions/custom-actions/recordAnsweredFields.action';
import { test } from '../../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../../utils/controller';

const home_url = process.env.TEST_URL;

let doYouNeedHelpPayingTheFeeSuspend: ReturnType<typeof doYouNeedHelpPayingTheFee>;

async function openChooseAnApplication(mainHeader: string) {
  FieldsStore.clear();
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
  await performValidation('mainHeader', dashboard.mainHeader);
  await performAction('clickLink', dashboard.askTheCourtToMakeAnOrderLink);
  await performValidation('mainHeader', mainHeader);

  doYouNeedHelpPayingTheFeeSuspend = doYouNeedHelpPayingTheFee(test.info().title);
}

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Make an Application - e2e Journey - R2 flag on @nightly', async () => {
  test.beforeEach(async ({ page }) => {
    initializeExecutor(page);
    await performAction('skipTestIfLdFlagDisabled', DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG);
    await openChooseAnApplication(chooseAnApplication.mainHeaderR2Dynamic);
  });

  test('Select an Application - Ask to Set aside - R2 flag on', async () => {
    await performAction('chooseAnApplication', {
      question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
      option: chooseAnApplication.setAsideRadioOption,
    });
    await performAction('clickButton', askTheCourtToSetAsideTheOrder.startNowButton);
    await performValidation('mainHeader', doYouNeedHelpPayingTheFeeSuspend.mainHeader);
    await performAction('doYouNeedHelpPayingFee', {
      question: doYouNeedHelpPayingTheFeeSuspend.doYouNeedHelpPayingTheFeeQuestion,
      option: doYouNeedHelpPayingTheFeeSuspend.iNeedHelpPayingTheFeeRadioOption,
      continueButton: doYouNeedHelpPayingTheFeeSuspend.continueButton,
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
      changeOption: doYouNeedHelpPayingTheFeeSuspend.doYouNeedHelpPayingTheFeeQuestion,
      journey: 'journey2',
      feeData: doYouNeedHelpPayingTheFeeSuspend,
    });
    await performAction('retrieveCYATableData');
    await performAction('validateCYA');
    await performAction('selectStatementOfTruth', {
      question: checkYourAnswersGenApps.statementOfTruthQuestion,
      option: checkYourAnswersGenApps.iBelieveTheFactsHiddenCheckbox,
      label: checkYourAnswersGenApps.yourFullNameTextLabel,
      input: checkYourAnswersGenApps.yourFullNameTextInput,
    });
  });

  test('Select an Application - Ask to Set aside - You need to apply for application fee - R2 flag on', async () => {
    await performAction('chooseAnApplication', {
      question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
      option: chooseAnApplication.setAsideRadioOption,
    });
    await performAction('clickButton', askTheCourtToSetAsideTheOrder.startNowButton);
    await performValidation('mainHeader', doYouNeedHelpPayingTheFeeSuspend.mainHeader);
    await performAction('doYouNeedHelpPayingFee', {
      question: doYouNeedHelpPayingTheFeeSuspend.doYouNeedHelpPayingTheFeeQuestion,
      option: doYouNeedHelpPayingTheFeeSuspend.iNeedHelpPayingTheFeeRadioOption,
      continueButton: doYouNeedHelpPayingTheFeeSuspend.continueButton,
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

test.describe('Make an Application - e2e Journey - R2 flag off @nightly', async () => {
  test.beforeEach(async ({ page }) => {
    initializeExecutor(page);
    await performAction('skipTestIfLdFlagEnabled', DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG);
    await openChooseAnApplication(chooseAnApplication.mainHeaderDynamic);
  });

  test('Select an Application - Ask to Set aside - R2 flag off', async () => {
    await performAction('chooseAnApplication', {
      question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
      option: chooseAnApplication.setAsideRadioOption,
    });
    await performAction('clickButton', askTheCourtToSetAsideTheOrder.startNowButton);
    await performValidation('mainHeader', doYouNeedHelpPayingTheFeeSuspend.mainHeader);
    await performAction('doYouNeedHelpPayingFee', {
      question: doYouNeedHelpPayingTheFeeSuspend.doYouNeedHelpPayingTheFeeQuestion,
      option: doYouNeedHelpPayingTheFeeSuspend.iNeedHelpPayingTheFeeRadioOption,
      continueButton: doYouNeedHelpPayingTheFeeSuspend.continueButton,
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
      changeOption: doYouNeedHelpPayingTheFeeSuspend.doYouNeedHelpPayingTheFeeQuestion,
      journey: 'journey2',
      feeData: doYouNeedHelpPayingTheFeeSuspend,
    });
    await performAction('retrieveCYATableData');
    await performAction('validateCYA');
    await performAction('selectStatementOfTruth', {
      question: checkYourAnswersGenApps.statementOfTruthQuestion,
      option: checkYourAnswersGenApps.iBelieveTheFactsHiddenCheckbox,
      label: checkYourAnswersGenApps.yourFullNameTextLabel,
      input: checkYourAnswersGenApps.yourFullNameTextInput,
    });
  });

  test('Select an Application - Ask to Set aside - You need to apply for application fee - R2 flag off', async () => {
    await performAction('chooseAnApplication', {
      question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
      option: chooseAnApplication.setAsideRadioOption,
    });
    await performAction('clickButton', askTheCourtToSetAsideTheOrder.startNowButton);
    await performValidation('mainHeader', doYouNeedHelpPayingTheFeeSuspend.mainHeader);
    await performAction('doYouNeedHelpPayingFee', {
      question: doYouNeedHelpPayingTheFeeSuspend.doYouNeedHelpPayingTheFeeQuestion,
      option: doYouNeedHelpPayingTheFeeSuspend.iNeedHelpPayingTheFeeRadioOption,
      continueButton: doYouNeedHelpPayingTheFeeSuspend.continueButton,
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
