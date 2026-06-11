import type { NextFunction, Request, Response } from 'express';

import type { DocumentStorage } from '@modules/documents/storage';
import * as flowModule from '@modules/steps/flow';
import { type FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import { createPostHandler } from '@modules/steps/formBuilder/postHandler';
import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';
import { CcdCaseModel } from '@services/ccdCaseData.model';

jest.mock('@modules/i18n');
jest.mock('@modules/steps/flow');

const stubDocumentStorage: DocumentStorage = {
  read: jest.fn(async () => []),
  readFresh: jest.fn(async () => []),
  save: jest.fn(async () => {}),
};

const flowConfig: JourneyFlowConfig = {
  stepOrder: [],
  steps: {},
};

describe('PostHandler — file upload validation error re-render', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const fileFields: FormFieldConfig[] = [
    {
      name: 'documents',
      type: 'file',
      required: false,
      accept: '.pdf',
      maxFileSize: 100,
      translationKey: { label: 'uploadLabel' },
      validate: () => 'Select a file to continue',
    },
  ];

  beforeEach(() => {
    jest
      .spyOn(require('../../../../../main/modules/i18n'), 'getTranslationFunction')
      .mockReturnValue(jest.fn((key: string) => key));

    (flowModule.createStepNavigation as jest.Mock).mockReturnValue({
      getBackUrl: jest.fn().mockResolvedValue('/previous-step'),
      getNextStepUrl: jest.fn().mockResolvedValue('/next-step'),
    });

    mockRequest = {
      body: {},
      originalUrl: '/case/1771325608502536/respond-to-claim/counter-claim-upload-files',
      session: {
        formData: {},
        user: {
          accessToken: 'test-token',
          idToken: 'test-id-token',
          refreshToken: 'test-refresh-token',
          sub: 'test-user-id',
        },
      },
      res: {
        locals: {
          validatedCase: { id: '1771325608502536' },
        },
      },
      app: {
        locals: {
          nunjucksEnv: {
            render: jest.fn(() => '<html></html>'),
          },
        },
      },
    } as unknown as Request;

    mockResponse = {
      redirect: jest.fn(),
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
      locals: {
        validatedCase: new CcdCaseModel({ id: '1771325608502536', data: {} }),
      },
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('re-renders with wired URLs and parsed uploadedDocuments[] when documentStorage is set', async () => {
    const { post } = createPostHandler(
      fileFields,
      'counter-claim-upload-files',
      'test.njk',
      'respondToClaim',
      flowConfig,
      undefined,
      { pageTitle: 'pageTitle', uploadLabel: 'uploadLabel' },
      true,
      undefined,
      stubDocumentStorage
    );

    const docPayload = JSON.stringify({
      index: 0,
      id: 'abc-uuid',
      document_filename: 'evidence.pdf',
    });

    (mockRequest as Request).body = {
      documents: '',
      action: 'saveAndContinue',
      'uploadedDocuments[]': docPayload,
    };

    await post(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.redirect).not.toHaveBeenCalled();
    expect(mockResponse.render).toHaveBeenCalled();

    const viewModel = (mockResponse.render as jest.Mock).mock.calls[0][1] as {
      fields: { componentType?: string; component?: Record<string, unknown> }[];
    };
    const fileField = viewModel.fields.find(f => f.componentType === 'fileUpload');
    expect(fileField?.component?.uploadUrl).toBe(
      '/case/1771325608502536/respond-to-claim/counter-claim-upload-files/upload'
    );
    expect(fileField?.component?.deleteUrl).toBe(
      '/case/1771325608502536/respond-to-claim/counter-claim-upload-files/delete'
    );
    expect(fileField?.component?.value).toEqual([
      {
        index: 0,
        id: 'abc-uuid',
        document_filename: 'evidence.pdf',
      },
    ]);
  });

  it('leaves uploadUrl/deleteUrl empty when documentStorage is omitted', async () => {
    const { post } = createPostHandler(
      fileFields,
      'counter-claim-upload-files',
      'test.njk',
      'respondToClaim',
      flowConfig,
      undefined,
      { pageTitle: 'pageTitle' },
      true
    );

    (mockRequest as Request).body = {
      action: 'saveAndContinue',
      'uploadedDocuments[]': JSON.stringify({ index: 0, document_filename: 'only.pdf' }),
    };

    await post(mockRequest as Request, mockResponse as Response, mockNext);

    const viewModel = (mockResponse.render as jest.Mock).mock.calls[0][1] as {
      fields: { componentType?: string; component?: Record<string, unknown> }[];
    };
    const fileField = viewModel.fields.find(f => f.componentType === 'fileUpload');
    expect(fileField?.component?.uploadUrl).toBe('');
    expect(fileField?.component?.deleteUrl).toBe('');
  });
});
