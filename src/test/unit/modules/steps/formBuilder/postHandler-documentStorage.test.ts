import type { NextFunction, Request, Response } from 'express';

import type { DocumentStorage } from '@modules/documents/storage';
import * as flowModule from '@modules/steps/flow';
import * as errorUtils from '@modules/steps/formBuilder/errorUtils';
import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import * as helpers from '@modules/steps/formBuilder/helpers';
import { createPostHandler } from '@modules/steps/formBuilder/postHandler';
import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';
import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';

jest.mock('@modules/i18n');
jest.mock('@modules/steps/flow');

const flowConfig: JourneyFlowConfig = {
  stepOrder: [],
  steps: {},
};

const fileFields: FormFieldConfig[] = [
  {
    name: 'documents',
    type: 'file',
    required: true,
    translationKey: { label: 'uploadLabel' },
  },
];

const ccdDoc: CcdCollectionItem<CcdUploadedDocument> = {
  id: 'doc-1',
  value: {
    document: {
      document_url: 'http://dm-store/documents/abc-123',
      document_binary_url: 'http://dm-store/documents/abc-123/binary',
      document_filename: 'evidence.pdf',
    },
    contentType: 'application/pdf',
    sizeInBytes: 1024,
  },
};

function buildRequest(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    originalUrl: '/case/1234567890123456/upload-additional-documents/upload-your-documents?lang=en',
    session: { formData: {} },
    app: {
      locals: {
        nunjucksEnv: {
          render: jest.fn(() => '<div>test</div>'),
        },
      },
    },
    res: { locals: {} },
    ...overrides,
  } as unknown as Request;
}

describe('PostHandler - documentStorage', () => {
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockRead: jest.Mock;
  let documentStorage: DocumentStorage;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRead = jest.fn().mockResolvedValue([]);
    documentStorage = {
      read: mockRead,
      readFresh: jest.fn(),
      save: jest.fn(),
    };

    mockResponse = {
      redirect: jest.fn(),
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest
      .spyOn(require('../../../../../main/modules/i18n'), 'getTranslationFunction')
      .mockReturnValue(jest.fn((key: string) => key));

    (flowModule.createStepNavigation as jest.Mock).mockReturnValue({
      getBackUrl: jest.fn().mockResolvedValue('/back'),
      getNextStepUrl: jest.fn().mockResolvedValue('/next-step'),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws when nunjucks environment is not initialized', async () => {
    const req = buildRequest({
      app: { locals: {} } as Request['app'],
    });
    const { post } = createPostHandler(
      fileFields,
      'upload-your-documents',
      'test.njk',
      'uploadAdditionalDocuments',
      flowConfig,
      undefined,
      undefined,
      undefined,
      undefined,
      documentStorage
    );

    await expect(post(req, mockResponse as Response, mockNext)).rejects.toThrow('Nunjucks environment not initialized');
  });

  it('hydrates req.body from documentStorage — empty storage clears file field value', async () => {
    mockRead.mockResolvedValue([]);
    const validateSpy = jest.spyOn(helpers, 'validateForm').mockReturnValue({ documents: 'Upload a file' });

    const req = buildRequest();
    const { post } = createPostHandler(
      fileFields,
      'upload-your-documents',
      'test.njk',
      'uploadAdditionalDocuments',
      flowConfig,
      undefined,
      undefined,
      undefined,
      undefined,
      documentStorage
    );

    await post(req, mockResponse as Response, mockNext);

    expect(mockRead).toHaveBeenCalledWith(req);
    expect(validateSpy.mock.calls[0][0].body.documents).toBeUndefined();
  });

  it('hydrates req.body from documentStorage — stored docs become display documents', async () => {
    mockRead.mockResolvedValue([ccdDoc]);
    jest.spyOn(helpers, 'validateForm').mockReturnValue({});

    const req = buildRequest();
    const { post } = createPostHandler(
      fileFields,
      'upload-your-documents',
      'test.njk',
      'uploadAdditionalDocuments',
      flowConfig,
      undefined,
      undefined,
      undefined,
      undefined,
      documentStorage
    );

    await post(req, mockResponse as Response, mockNext);

    expect(req.body.documents).toEqual([
      {
        index: 0,
        id: 'doc-1',
        document_filename: 'evidence.pdf',
        content_type: 'application/pdf',
        sizeInBytes: 1024,
      },
    ]);
    expect(mockResponse.redirect).toHaveBeenCalledWith(303, '/next-step');
  });

  it('wires upload and delete URLs onto the file field when re-rendering validation errors', async () => {
    mockRead.mockResolvedValue([]);
    jest.spyOn(helpers, 'validateForm').mockReturnValue({ documents: 'Upload a file' });

    let capturedFormContent: Record<string, unknown> | undefined;
    jest
      .spyOn(errorUtils, 'renderWithErrors')
      .mockImplementation(async (_req, _res, _view, _errors, _fields, formContent) => {
        capturedFormContent = formContent;
      });

    const req = buildRequest();
    const { post } = createPostHandler(
      fileFields,
      'upload-your-documents',
      'test.njk',
      'uploadAdditionalDocuments',
      flowConfig,
      undefined,
      undefined,
      undefined,
      undefined,
      documentStorage
    );

    await post(req, mockResponse as Response, mockNext);

    const fields = (capturedFormContent?.fields ?? []) as {
      componentType?: string;
      component?: { uploadUrl?: string; deleteUrl?: string };
    }[];
    const fileField = fields.find(f => f.componentType === 'fileUpload');

    expect(fileField?.component?.uploadUrl).toBe(
      '/case/1234567890123456/upload-additional-documents/upload-your-documents/upload'
    );
    expect(fileField?.component?.deleteUrl).toBe(
      '/case/1234567890123456/upload-additional-documents/upload-your-documents/delete'
    );
    expect(mockResponse.redirect).not.toHaveBeenCalled();
  });
});
