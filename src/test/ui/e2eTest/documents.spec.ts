import { citizenCreateGenAppApiData, createCaseApiData, submitCaseApiData } from '../data/api-data';
import {
  checkYourAnswers,
  confirmIfTheseDocumentsRelateToAnApplication,
  startEvidenceUpload,
  uploadYourDocuments,
  viewDocuments,
} from '../data/page-data/documents-page-data';
import {
  confirmDocumentsRelateToApplicationErrorValidation,
  uploadYourDocumentsErrorValidation,
} from '../functional/documents-functional';
import { softErrorMessageValidation } from '../utils/common/error-message-validation-helper';
import { DASHBOARD_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  process.env.NOTICE_SERVED = 'YES';
  process.env.TENANCY_TYPE = 'INTRODUCTORY_TENANCY';
  process.env.GROUNDS = 'RENT_ARREARS_GROUND10';
  await performAction('createCaseAPI', { data: createCaseApiData.createCasePayload });
  await performAction('submitCaseAPI', { data: submitCaseApiData.submitCasePayload });
  logTestEnvAfterBeforeEach(testInfo.title, DASHBOARD_BEFORE_EACH_ENV_KEYS);
  await performAction('fetchPINsAPI');
  await performAction('createUser', 'citizen', ['citizen']);
  await performAction('navigateToUrl', home_url);
  await performAction('login');
  await performAction('navigateToUrl', home_url + `/access-your-case`);
  await performAction('accessYourCase', { caseNumber: process.env.CASE_NUMBER });
});

test.afterEach(async () => {
  finaliseAllValidations();
});

test.describe('Documents - e2e Journey @nightly', async () => {
  // The test below need to be enabled once we have a workaround to change the case status to "Case Issued" as part of HDPI-7163.
  test.skip('Upload documents when GenApps submitted @smoke @regression @crossbrowser', async () => {
    await performAction('citizenCreateGenAppAPI', { data: citizenCreateGenAppApiData().citizenCreateGenAppPayload });
    await performAction(
      'navigateToUrl',
      home_url + `/case/${process.env.CASE_NUMBER}/upload-additional-documents/start-evidence-upload`
    );
    await performAction('startEvidenceUpload', startEvidenceUpload.startNowButton);
    await performAction('verifyDocumentRelatesToApplication', {
      question: confirmIfTheseDocumentsRelateToAnApplication.doTheseDocumentsQuestion,
      option: confirmIfTheseDocumentsRelateToAnApplication.relatedToAdjournRadioOptionHidden,
    });
    await performAction('uploadDocuments', { files: ['uploadYourDocuments.docx'] });
    await performValidation('mainHeader', checkYourAnswers.mainHeader);
  });

  // The test below need to be enabled once we have a workaround to change the case status to "Case Issued" as part of HDPI-7163.
  test.skip('Upload documents when GenApps not submitted @regression', async () => {
    await performAction(
      'navigateToUrl',
      home_url + `/case/${process.env.CASE_NUMBER}/upload-additional-documents/start-evidence-upload`
    );
    await performAction('startEvidenceUpload', startEvidenceUpload.startNowButton);
    await softErrorMessageValidation('uploadYourDocuments', uploadYourDocumentsErrorValidation);
    await performAction('uploadDocuments', { files: ['uploadYourDocuments.ppt'] });
    await performValidation('mainHeader', checkYourAnswers.mainHeader);
  });

  test('View documents submitted through make a claim @regression', async () => {
    await performAction('navigateToUrl', home_url + `/case/${process.env.CASE_NUMBER}/view-documents`);
    await performAction('validateViewDocuments', {
      caseNumber: viewDocuments.getCaseNumber(),
      documents: [
        {
          sectionHeader: viewDocuments.statementsOfCaseSubHeader,
          documentName: viewDocuments.noticeServiceJurisdictionLink,
          submittedDate: viewDocuments.getSubmittedDate(),
        },
        {
          sectionHeader: viewDocuments.propertyDocumentsSubHeader,
          documentName: viewDocuments.rentStatementLink,
          submittedDate: viewDocuments.getSubmittedDate(),
        },
        {
          sectionHeader: viewDocuments.evidenceSubHeader,
          documentName: viewDocuments.witnessStatementLink,
          submittedDate: viewDocuments.getSubmittedDate(),
        },
        {
          sectionHeader: viewDocuments.correspondenceSubHeader,
          documentName: viewDocuments.certificateOfSuitabilityLink,
          submittedDate: viewDocuments.getSubmittedDate(),
        },
      ],
    });
  });

  // The test below need to be enabled once we have a workaround to change the case status to "Case Issued" as part of HDPI-7163.
  test.skip('Verify confirm document options based on GenApp type', async () => {
    await performAction(
      'navigateToUrl',
      home_url + `/case/${process.env.CASE_NUMBER}/upload-additional-documents/start-evidence-upload`
    );
    // SET_ASIDE
    await performAction('citizenCreateGenAppAPI', {
      data: citizenCreateGenAppApiData('SET_ASIDE').citizenCreateGenAppPayload,
    });
    await performAction('startEvidenceUpload', startEvidenceUpload.startNowButton);
    await softErrorMessageValidation(
      'confirmIfTheseDocumentsRelateToAnApplication',
      confirmDocumentsRelateToApplicationErrorValidation
    );
    await performAction('verifyDocumentRelatesToApplication', {
      question: confirmIfTheseDocumentsRelateToAnApplication.doTheseDocumentsQuestion,
      option: confirmIfTheseDocumentsRelateToAnApplication.relatedToSetAsideRadioOptionHidden,
    });
    await performValidation('mainHeader', uploadYourDocuments.mainHeader);
    await performAction('clickLink', 'Back');
    await performAction('clickLink', 'Back');
    await performValidation('mainHeader', startEvidenceUpload.mainHeader);
    // SOMETHING_ELSE + default YES
    await performAction('citizenCreateGenAppAPI', {
      data: citizenCreateGenAppApiData('SOMETHING_ELSE').citizenCreateGenAppPayload,
    });
    await performAction('startEvidenceUpload', startEvidenceUpload.startNowButton);
    await performAction('verifyDocumentRelatesToApplication', {
      question: confirmIfTheseDocumentsRelateToAnApplication.doTheseDocumentsQuestion,
      previousApplicationOption: confirmIfTheseDocumentsRelateToAnApplication.relatedToSetAsideRadioOptionHidden,
      option: confirmIfTheseDocumentsRelateToAnApplication.relatedToApplicationRadioOptionHidden,
    });
    await performValidation('mainHeader', uploadYourDocuments.mainHeader);
  });
});
