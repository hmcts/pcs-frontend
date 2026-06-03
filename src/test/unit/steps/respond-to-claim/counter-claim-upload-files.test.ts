jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
}));

jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: jest.fn(),
  saveDraftDefendantResponse: jest.fn(),
}));

jest.mock('../../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseByIdForEvent: jest.fn(),
  },
}));

import type { Request } from 'express';

import type { FormFieldConfig } from '../../../../main/modules/steps/formBuilder/formFieldConfig.interface';
import { validateForm } from '../../../../main/modules/steps/formBuilder/helpers';
import { step } from '../../../../main/steps/respond-to-claim/counter-claim-upload-files';

type CounterClaimUploadFilesStep = {
  fields: {
    name: string;
    type: string;
    validate?: (value: unknown, formData: Record<string, unknown>) => string | undefined;
  }[];
};

describe('counter-claim-upload-files', () => {
  const testedStep = step as unknown as CounterClaimUploadFilesStep;
  const documentsField = testedStep.fields.find(f => f.name === 'documents');

  const translations = { documents: 'Select a file to support your counterclaim' };

  const makeReq = (body: Record<string, unknown>): Request =>
    ({ body, session: { formData: {} } }) as unknown as Request;

  describe('documents field validate', () => {
    it('returns errors.documents when saveForLater is submitted with no uploaded files', () => {
      const error = documentsField?.validate?.(undefined, {
        action: 'saveForLater',
        documents: '',
      });

      expect(error).toBe('errors.documents');
    });

    it('returns no error when saveForLater has uploadedDocuments[]', () => {
      const error = documentsField?.validate?.(undefined, {
        action: 'saveForLater',
        'uploadedDocuments[]': JSON.stringify({ index: 0, id: 'doc-1', document_filename: 'evidence.pdf' }),
      });

      expect(error).toBeUndefined();
    });

    it('returns errors.documents when saveAndContinue has no uploaded files', () => {
      const error = documentsField?.validate?.(undefined, {
        action: 'saveAndContinue',
        documents: '',
      });

      expect(error).toBe('errors.documents');
    });
  });

  describe('validateForm integration', () => {
    it('surfaces documents error on saveForLater when POST has no uploadedDocuments[]', () => {
      const errors = validateForm(
        makeReq({ action: 'saveForLater', documents: '' }),
        testedStep.fields as FormFieldConfig[],
        translations
      );

      expect(errors.documents).toBe(translations.documents);
    });
  });
});
