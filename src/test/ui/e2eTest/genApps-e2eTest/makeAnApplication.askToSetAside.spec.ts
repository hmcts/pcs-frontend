import { createCaseApiData, submitCaseApiData } from '../../data/api-data';
import {
  askTheCourtToSetAsideTheOrder,
  checkYourAnswersGenApps,
  chooseAnApplication,
  doYouNeedHelpPayingTheFee,
  doYouWantToUploadDocumentToSupportYourApplication,
  haveTheOtherPartiesAgreedToThisApplication,
  haveYouAlreadyAppliedForHelpWithFees,
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
  await performAction('validateAccessCodeAPI');
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction(
    'navigateToUrl',
    home_url + `/case/${process.env.CASE_NUMBER}/make-an-application/choose-an-application`
  );
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Make an Application - e2e Journey @nightly', async () => {
  test('Select an Application - Ask to Set aside', async () => {
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
    await performValidation('mainHeader', whatOrderDoYouWantTheCourtToMakeAndWhy.mainHeader);
    await performAction('confirmOrderDoYouWant', {
      label: whatOrderDoYouWantTheCourtToMakeAndWhy.explainWhatYouWantTextLabel,
      input: whatOrderDoYouWantTheCourtToMakeAndWhy.whatYouWantTheCourtToDoTextInput,
    });
    await performValidation('mainHeader', doYouWantToUploadDocumentToSupportYourApplication.mainHeader);
    await performAction('clickRadioButton', doYouWantToUploadDocumentToSupportYourApplication.yesRadioOption);
    await performAction('clickButton', doYouWantToUploadDocumentToSupportYourApplication.continueButton);
    await performValidation('mainHeader', uploadDocumentsToSupportYourApplication.mainHeader);
    await performAction('clickButton', uploadDocumentsToSupportYourApplication.continueButton);
    await performValidation('mainHeader', whichLanguageDidYouUseToCompleteThisService.mainHeader);
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
  });

  test('Select an Application - Ask to Set aside - You need to apply for application fee', async () => {
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
