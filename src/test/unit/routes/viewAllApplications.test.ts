import type { Application, NextFunction, Request, RequestHandler, Response } from 'express';
import type { Environment } from 'nunjucks';

import { VIEW_ALL_APPLICATIONS_ROUTE } from '../../../main/constants/caseRoutes';
import { oidcMiddleware } from '../../../main/middleware';

import viewAllApplicationsRoutes from '@routes/viewAllApplications';
import { ccdCaseService } from '@services/ccdCaseService';

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseById: jest.fn(),
  },
}));

describe('View All Application Route', () => {
  let app: Application;
  // let logger: { error: jest.Mock; warn: jest.Mock };

  beforeEach(() => {
    (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue({
      data: {
        genApps: getTestGenApps(),
      },
    });

    app = {
      locals: {
        nunjucksEnv: {
          render: jest.fn((template: string) => `<div>${template}</div>`),
        } as unknown as Environment,
      },
      use: jest.fn(),
      get: jest.fn(),
    } as unknown as Application;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register handler with path and OIDC middleware', () => {
    viewAllApplicationsRoutes(app);

    expect((app.get as jest.Mock).mock.calls[0][0]).toBe('/case/:caseReference/view-all-applications');
    expect((app.get as jest.Mock).mock.calls[0][1]).toBe(oidcMiddleware);
  });

  it('should render gen apps overview', async () => {
    viewAllApplicationsRoutes(app);

    const handler = getConfiguredRequestHandler(app);

    const caseReference = '1234567890123456';
    const currentUserId = '355fe639-be35-3723-b802-c91d3a9372e7';
    const req = {
      params: { caseReference },
      session: {
        user: { uid: currentUserId, accessToken: 'access-token-1' },
      },
      res: {
        locals: {
          validatedCase: {
            id: caseReference,
          },
        },
      },
    } as unknown as Request;

    const res = {
      render: jest.fn(),
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    await handler(req, res, next);

    expect(ccdCaseService.getCaseById).toHaveBeenCalledWith('access-token-1', caseReference);
    expect(next).not.toHaveBeenCalled();

    const expectedOtherPartyMap = new Map();
    expectedOtherPartyMap.set('8af86e6f-dfc3-4b0c-b817-ee1c9546a300', {
      genApps: [
        {
          applicationType: 'ADJOURN',
          party: {
            firstName: 'Tom',
            id: '8af86e6f-dfc3-4b0c-b817-ee1c9546a300',
            idamId: '355fe639-be35-3723-b802-c91d3a937300',
            lastName: 'Smith',
          },
          submissionDocument: {
            documentId: 'bf112cdf-76d7-4d15-bb92-cd7c34830001',
            filename: 'General Application GA1 - Defendant 1.pdf',
          },
          supportingDocuments: [],
          submittedOn: '2026-05-06T17:29:33.301528',
        },
      ],
      party: {
        id: '8af86e6f-dfc3-4b0c-b817-ee1c9546a300',
        idamId: '355fe639-be35-3723-b802-c91d3a937300',
        firstName: 'Tom',
        lastName: 'Smith',
      },
    });

    expect(app.get).toHaveBeenCalledWith(VIEW_ALL_APPLICATIONS_ROUTE, expect.any(Function), expect.any(Function));
    expect(res.render).toHaveBeenCalledWith(
      'view-all-applications',
      expect.objectContaining({
        caseReference: `${caseReference}`,
        dashboardUrl: `/case/${caseReference}/dashboard`,
        formattedCaseReference: '1234 5678 9012 3456',
        otherPartyGenAppsMap: expectedOtherPartyMap,
        userGenApps: [
          {
            applicationType: 'ADJOURN',
            party: {
              id: '8af86e6f-dfc3-4b0c-b817-ee1c9546abc2',
              idamId: '355fe639-be35-3723-b802-c91d3a9372e7',
              firstName: 'Cyndi',
              lastName: 'Edwardson',
            },
            submissionDocument: {
              documentId: 'bf112cdf-76d7-4d15-bb92-cd7c34830001',
              filename: 'General Application GA1 - Defendant 3.pdf',
            },
            supportingDocuments: [
              {
                documentId: 'a9b92e15-c46e-474a-a1a0-27873ac6e771',
                filename: 'rent_statement2 GA3 - Defendant 2.txt',
              },
            ],
            submittedOn: '2026-05-03T17:29:33.301528',
          },
          {
            applicationType: 'ADJOURN',
            party: {
              firstName: 'Cyndi',
              id: '8af86e6f-dfc3-4b0c-b817-ee1c9546abc2',
              idamId: '355fe639-be35-3723-b802-c91d3a9372e7',
              lastName: 'Edwardson',
            },
            submissionDocument: {
              documentId: 'bf112cdf-76d7-4d15-bb92-cd7c34830002',
              filename: 'General Application GA2 - Defendant 3.pdf',
            },
            supportingDocuments: [],
            submittedOn: '2026-05-04T17:29:33.301528',
          },
        ],
      })
    );
  });

  it('should throw error when no access token in session', async () => {
    viewAllApplicationsRoutes(app);

    const handler = getConfiguredRequestHandler(app);

    const caseReference = '1234567890123456';
    const req = {
      params: { caseReference },
      session: {
        user: { accessToken: null },
      },
    } as unknown as Request;

    const res = {
      render: jest.fn(),
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    await expect(handler(req, res, next)).rejects.toThrow('Authentication required');
  });

  it('should return null without rendering for invalid case reference', async () => {
    viewAllApplicationsRoutes(app);

    const handler = getConfiguredRequestHandler(app);

    const caseReference = 'ZZ23456901234';
    const req = {
      params: { caseReference },
      session: {
        user: { accessToken: 'access-token-1' },
      },
    } as unknown as Request;

    const res = {
      render: jest.fn(),
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    const result = await handler(req, res, next);
    await expect(result).toBeNull();
    expect(res.render).not.toHaveBeenCalled();
  });
});

function getConfiguredRequestHandler(app: Application) {
  return (app.get as jest.Mock).mock.calls[0][2] as RequestHandler;
}

function getTestGenApps() {
  return [
    {
      id: '1530bf42-4bbc-4e14-95a1-2809c3c4f100',
      value: {
        applicationType: 'ADJOURN',
        party: {
          id: '8af86e6f-dfc3-4b0c-b817-ee1c9546abc2',
          idamId: '355fe639-be35-3723-b802-c91d3a9372e7',
          firstName: 'Cyndi',
          lastName: 'Edwardson',
        },
        submittedOn: '2026-05-03T17:29:33.301528',
        submissionDocument: {
          id: 'bf112cdf-76d7-4d15-bb92-cd7c34830001',
          document: {
            document_url: 'http://localhost:4506/documents/bf112cdf-76d7-4d15-bb92-cd7c3483a7ef',
            document_filename: 'General Application GA1 - Defendant 3.pdf',
            document_binary_url: 'http://localhost:4506/documents/bf112cdf-76d7-4d15-bb92-cd7c3483a7ef/binary',
          },
        },
        supportingDocuments: [
          {
            id: 'a9b92e15-c46e-474a-a1a0-27873ac6e771',
            value: {
              document_url: 'http://localhost:4506/documents/88a3402a-035b-4dcf-95c2-011e5f2099d9',
              document_filename: 'rent_statement2 GA3 - Defendant 2.txt',
              document_binary_url: 'http://localhost:4506/documents/88a3402a-035b-4dcf-95c2-011e5f2099d9/binary',
            },
          },
        ],
      },
    },
    {
      id: '1530bf42-4bbc-4e14-95a1-2809c3c4f200',
      value: {
        applicationType: 'ADJOURN',
        party: {
          id: '8af86e6f-dfc3-4b0c-b817-ee1c9546abc2',
          idamId: '355fe639-be35-3723-b802-c91d3a9372e7',
          firstName: 'Cyndi',
          lastName: 'Edwardson',
        },
        submittedOn: '2026-05-04T17:29:33.301528',
        submissionDocument: {
          id: 'bf112cdf-76d7-4d15-bb92-cd7c34830002',
          document: {
            document_url: 'http://localhost:4506/documents/bf112cdf-76d7-4d15-bb92-cd7c3483a200',
            document_filename: 'General Application GA2 - Defendant 3.pdf',
            document_binary_url: 'http://localhost:4506/documents/bf112cdf-76d7-4d15-bb92-cd7c3483a200/binary',
          },
        },
      },
    },
    {
      id: '1530bf42-4bbc-4e14-95a1-2809c3c4f300',
      value: {
        applicationType: 'ADJOURN',
        party: {
          id: '8af86e6f-dfc3-4b0c-b817-ee1c9546a300',
          idamId: '355fe639-be35-3723-b802-c91d3a937300',
          firstName: 'Tom',
          lastName: 'Smith',
        },
        submittedOn: '2026-05-06T17:29:33.301528',
        submissionDocument: {
          id: 'bf112cdf-76d7-4d15-bb92-cd7c34830001',
          document: {
            document_url: 'http://localhost:4506/documents/bf112cdf-76d7-4d15-bb92-cd7c3483a300',
            document_filename: 'General Application GA1 - Defendant 1.pdf',
            document_binary_url: 'http://localhost:4506/documents/bf112cdf-76d7-4d15-bb92-cd7c3483a300/binary',
          },
        },
      },
    },
  ];
}
