import { citizenCreateGenAppApiData, createCaseApiData, submitCaseApiData } from '../data/api-data';
import { citizenCreateGenAppApiDataSetAside } from '../data/api-data/citizenCreateGenAppSetAside.api.data';
import { citizenCreateGenAppApiDataSomethingElse } from '../data/api-data/citizenCreateGenAppSomethingElse.api.data copy';
import {
  confirmIfTheseDocumentsRelateToAnApplication,
  startEvidenceUpload,
  uploadYourDocuments,
  viewDocuments,
} from '../data/page-data/documents-page-data';
import { confirmDocumentsRelateToApplicationErrorValidation } from '../functional/documents-functional/confirmIfTheseDocumentsRelateToAnApplication.pft';
import { softErrorMessageValidation } from '../utils/common/error-message-validation-helper';
import { DASHBOARD_BEFORE_EACH_ENV_KEYS, logTestEnvAfterBeforeEach } from '../utils/common/log-test-env';
import { test } from '../utils/common/test-with-case-role-cleanup';
import { finaliseAllValidations, initializeExecutor, performAction, performValidation } from '../utils/controller';

const home_url = process.env.TEST_URL;

test.beforeEach(async ({ page }, testInfo) => {
  initializeExecutor(page);
  process.env.NOTICE_SERVED = 'NO';
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
  test('Upload documents when GenApps submitted @smoke @regression @crossbrowser', async () => {
    await performAction(
      'navigateToUrl',
      home_url + `/case/${process.env.CASE_NUMBER}/upload-additional-documents/start-evidence-upload`
    );
    await performAction('citizenCreateGenAppAPI', { data: citizenCreateGenAppApiData.citizenCreateGenAppPayload });
    await performAction('startEvidenceUpload', startEvidenceUpload.startNowButton);
    await performValidation('mainHeader', confirmIfTheseDocumentsRelateToAnApplication.mainHeader);
    await softErrorMessageValidation('confirmIfTheseDocumentsRelateToAnApplication', confirmDocumentsRelateToApplicationErrorValidation);
    await performAction('verifyDocumentRelatesToApplication', {
      question: confirmIfTheseDocumentsRelateToAnApplication.doTheseDocumentsQuestion,
      option: confirmIfTheseDocumentsRelateToAnApplication.relatedToAdjournRadioOptionHidden
    });
    await performValidation('mainHeader', uploadYourDocuments.mainHeader);
  });

  test('Upload documents when GenApps not submitted @regression', async () => {
    await performAction(
      'navigateToUrl',
      home_url + `/case/${process.env.CASE_NUMBER}/upload-additional-documents/start-evidence-upload`
    );
    await performAction('startEvidenceUpload', startEvidenceUpload.startNowButton);
    await performValidation('mainHeader', uploadYourDocuments.mainHeader);
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

  test('Verify confirm document options based on GenApp type @regression', async () => {
    await performAction(
      'navigateToUrl',
      home_url + `/case/${process.env.CASE_NUMBER}/upload-additional-documents/start-evidence-upload`
    );
    await performAction('citizenCreateGenAppAPI', { data: citizenCreateGenAppApiDataSetAside.citizenCreateGenAppPayload });
    await performAction('startEvidenceUpload', startEvidenceUpload.startNowButton);
    await performValidation('mainHeader', confirmIfTheseDocumentsRelateToAnApplication.mainHeader);
    await softErrorMessageValidation('confirmIfTheseDocumentsRelateToAnApplication', confirmDocumentsRelateToApplicationErrorValidation);
    await performAction('verifyDocumentRelatesToApplication', {
      question: confirmIfTheseDocumentsRelateToAnApplication.doTheseDocumentsQuestion,
      option: confirmIfTheseDocumentsRelateToAnApplication.relatedToSetAsideRadioOptionHidden
    });
    await performValidation('mainHeader', uploadYourDocuments.mainHeader);

    await performAction(
      'navigateToUrl',
      home_url + `/case/${process.env.CASE_NUMBER}/upload-additional-documents/start-evidence-upload`
    );
    await performAction('citizenCreateGenAppAPI', { data: citizenCreateGenAppApiDataSomethingElse.citizenCreateGenAppPayload });
    await performAction('startEvidenceUpload', startEvidenceUpload.startNowButton);
    await performValidation('mainHeader', confirmIfTheseDocumentsRelateToAnApplication.mainHeader);
    await performAction('verifyDocumentRelatesToApplication', {
      question: confirmIfTheseDocumentsRelateToAnApplication.doTheseDocumentsQuestion,
      previousApplicationOption: confirmIfTheseDocumentsRelateToAnApplication.relatedToSetAsideRadioOptionHidden,
      option: confirmIfTheseDocumentsRelateToAnApplication.relatedToApplicationRadioOptionHidden
    });
    await performValidation('mainHeader', uploadYourDocuments.mainHeader);

  });
});
