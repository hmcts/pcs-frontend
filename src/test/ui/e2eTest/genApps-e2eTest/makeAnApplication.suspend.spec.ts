import { createCaseApiData, submitCaseApiData } from '../../data/api-data';
import { dashboard } from '../../data/page-data';
import {
  checkYourAnswersGenApps,
  chooseAnApplication,
  doYouNeedHelpPayingTheFee,
  doYouWantToUploadDocumentsToSupportYourApplication,
  haveYouAlreadyAppliedForHelpWithFees,
  paymentDetails,
  uploadDocumentsToSupportYourApplication,
  whatOrderDoYouWantTheCourtToMakeAndWhy,
  whichLanguageDidYouUseToCompleteThisService,
} from '../../data/page-data/genApps-page-data';
import { applyToStopOrDelayEviction } from '../../data/page-data/genApps-page-data/applyToStopOrDelayEviction.page.data';
import { FieldsStore } from '../../utils/actions/custom-actions/recordAnsweredFields.action';
import { getFormattedDate } from '../../utils/common/date.utils';
import { test } from '../../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../../utils/controller';

const home_url = process.env.TEST_URL;

let doYouNeedHelpPayingTheFeeSuspend: ReturnType<typeof doYouNeedHelpPayingTheFee>;

test.beforeEach(async ({ page }) => {
  initializeExecutor(page);
  FieldsStore.clear();

  await test.step('Create and submit case, update payment and create new citizen user', async () => {
    await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
    await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayloadDefault });
    await performAction('updatePaymentAPI');
    await performAction('fetchPINsAPI');
    await performAction('createUser', 'citizen', ['citizen']);
  });

  await test.step('Login to Citizen dash portal to start an Application', async () => {
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

  doYouNeedHelpPayingTheFeeSuspend = doYouNeedHelpPayingTheFee(test.info().title);
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Make an Application - e2e Journey @nightly', async () => {
  test(
    'As a Defendant, I successfully apply to Suspend eviction and request help with fees',
    {
      tag: ['@regression'],
      annotation: [
        { type: 'jira', description: `The corresponding jira ticket : https://hmcts.atlassian.net/browse/HDPI-4622` },
        { type: 'ac', description: 'AC1 to AC7' },
      ],
    },
    async () => {
      const upLoadFile = uploadDocumentsToSupportYourApplication.uploadFileHiddenOption[1];

      await test.step(`Given the user selects Suspend the eviction`, async () => {
        await performAction('chooseAnApplication', {
          question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
          option: chooseAnApplication.suspendApplicationRadioOption,
        });
        await performValidation('mainHeader', applyToStopOrDelayEviction.mainHeader);
        await performAction('clickButton', applyToStopOrDelayEviction.startNowButton);
      });

      await test.step(`When the user requests help with fees`, async () => {
        await performValidation('mainHeader', doYouNeedHelpPayingTheFeeSuspend.mainHeader);
        console.log(doYouNeedHelpPayingTheFeeSuspend.itUsuallyCostParagraph);
        await performAction('doYouNeedHelpPayingFee', {
          question: doYouNeedHelpPayingTheFeeSuspend.doYouNeedHelpPayingTheFeeQuestion,
          option: doYouNeedHelpPayingTheFeeSuspend.iNeedHelpPayingTheFeeRadioOption,
          continueButton: doYouNeedHelpPayingTheFeeSuspend.continueButton,
        });
      });

      await test.step(`Then the user enters the Help with Fees reference details`, async () => {
        await performValidation('mainHeader', haveYouAlreadyAppliedForHelpWithFees.mainHeader);
        await performAction('confirmYouHaveAppliedForFeeHelp', {
          question: haveYouAlreadyAppliedForHelpWithFees.haveYouAlreadyAppliedForHelpQuestion,
          option: haveYouAlreadyAppliedForHelpWithFees.yesRadioOption,
          label: haveYouAlreadyAppliedForHelpWithFees.hwfReferenceHiddenTextLabel,
          input: haveYouAlreadyAppliedForHelpWithFees.hwfReferenceTextInput,
        });
      });

      await test.step(`And the user explains what they want the court to do and why `, async () => {
        await performValidation('mainHeader', whatOrderDoYouWantTheCourtToMakeAndWhy.mainHeader);
        await performAction('confirmOrderDoYouWant', {
          label: whatOrderDoYouWantTheCourtToMakeAndWhy.explainWhatYouWantTextLabel,
          input: whatOrderDoYouWantTheCourtToMakeAndWhy.whatYouWantTheCourtToDoTextInput,
        });
      });

      await test.step(`And the user uploads supporting documents`, async () => {
        await performAction('confirmDocumentToUpload', {
          question: doYouWantToUploadDocumentsToSupportYourApplication.doYouWantToUploadDocumentQuestion,
          option: doYouWantToUploadDocumentsToSupportYourApplication.yesRadioOption,
        });
        await performValidation('mainHeader', uploadDocumentsToSupportYourApplication.mainHeader);
        await performAction('uploadFilesGenApps', { files: [upLoadFile] });

        await test.step('And the user chooses correct Language used to complete the application', async () => {
          await performAction('selectLanguageUsedToComplete', {
            question: whichLanguageDidYouUseToCompleteThisService.whichLanguageDidYouUseQuestion,
            option: whichLanguageDidYouUseToCompleteThisService.englishRadioOption,
          });
        });
      });

      await test.step(`Then the user reviews the application and submits it`, async () => {
        await performValidation('mainHeader', checkYourAnswersGenApps.mainHeader);
        await performAction('retrieveCYATableData');
        await performAction('validateCYA');
        await performAction('selectStatementOfTruth', {
          question: checkYourAnswersGenApps.statementOfTruthQuestion,
          option: checkYourAnswersGenApps.iBelieveTheFactsHiddenCheckbox,
          label: checkYourAnswersGenApps.yourFullNameTextLabel,
          input: checkYourAnswersGenApps.yourFullNameTextInput,
        });
      });

      await test.step(`And the application is successfully submitted `, async () => {
        await performAction('verifyApplicationSubmitted');
        await performValidation('mainHeader', dashboard.mainHeader);
        await performAction('validateCompletedApplication', {
          app: uploadDocumentsToSupportYourApplication.uploadFileHiddenOption[0],
          doc: upLoadFile,
          subDate: getFormattedDate(),
        });
      });
    }
  );

  test(
    'As a Defendant, I successfully apply to Suspend eviction without a request for help with fees',
    {
      tag: ['@CM'],
      annotation: [
        { type: 'jira', description: `The corresponding jira ticket : https://hmcts.atlassian.net/browse/HDPI-4622` },
      ],
    },
    async () => {
      const upLoadFile = uploadDocumentsToSupportYourApplication.uploadFileHiddenOption[1];

      await test.step('Given the user selects Suspend the eviction', async () => {
        await performAction('chooseAnApplication', {
          question: chooseAnApplication.whatDoYouWantToApplyForQuestion,
          option: chooseAnApplication.suspendApplicationRadioOption,
        });
        await performValidation('mainHeader', applyToStopOrDelayEviction.mainHeader);
        await performAction('clickButton', applyToStopOrDelayEviction.startNowButton);
      });

      await test.step('Then the user requests no Help with Fees', async () => {
        await performValidation('mainHeader', doYouNeedHelpPayingTheFeeSuspend.mainHeader);
        await performAction('doYouNeedHelpPayingFee', {
          question: doYouNeedHelpPayingTheFeeSuspend.doYouNeedHelpPayingTheFeeQuestion,
          option: doYouNeedHelpPayingTheFeeSuspend.iDoNotNeedHelpPayingTheFeeRadioOption,
          continueButton: doYouNeedHelpPayingTheFeeSuspend.continueButton,
        });
      });

      await test.step('And the user explains what they want the court to do and why', async () => {
        await performValidation('mainHeader', whatOrderDoYouWantTheCourtToMakeAndWhy.mainHeader);
        await performAction('confirmOrderDoYouWant', {
          label: whatOrderDoYouWantTheCourtToMakeAndWhy.explainWhatYouWantTextLabel,
          input: whatOrderDoYouWantTheCourtToMakeAndWhy.whatYouWantTheCourtToDoTextInput,
        });
      });

      await test.step('And the user uploads supporting documents', async () => {
        await performAction('confirmDocumentToUpload', {
          question: doYouWantToUploadDocumentsToSupportYourApplication.doYouWantToUploadDocumentQuestion,
          option: doYouWantToUploadDocumentsToSupportYourApplication.yesRadioOption,
        });
        await performValidation('mainHeader', uploadDocumentsToSupportYourApplication.mainHeader);
        await performAction('uploadFilesGenApps', { files: [upLoadFile] });
      });

      await test.step('And the user chooses correct Language used to complete the application', async () => {
        await performAction('selectLanguageUsedToComplete', {
          question: whichLanguageDidYouUseToCompleteThisService.whichLanguageDidYouUseQuestion,
          option: whichLanguageDidYouUseToCompleteThisService.englishRadioOption,
        });
      });

      await test.step('Then the user reviews the application', async () => {
        await performValidation('mainHeader', checkYourAnswersGenApps.mainHeader);
        await performAction('retrieveCYATableData');
        await performAction('validateCYA');
        await performAction('selectStatementOfTruth', {
          question: checkYourAnswersGenApps.statementOfTruthQuestion,
          option: checkYourAnswersGenApps.iBelieveTheFactsHiddenCheckbox,
          label: checkYourAnswersGenApps.yourFullNameTextLabel,
          input: checkYourAnswersGenApps.yourFullNameTextInput,
        });
      });

      await test.step('And the user successfully pays the application fee', async () => {
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
      });

      await test.step('And the application is successfully submitted', async () => {
        await performAction('verifyApplicationSubmitted');
        await performValidation('mainHeader', dashboard.mainHeader);
      });
    }
  );
});
