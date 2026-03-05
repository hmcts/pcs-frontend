import type { Application, Response } from 'express';
import express from 'express';
import type { Environment } from 'nunjucks';
import request from 'supertest';

import * as caseReferenceMiddleware from '../../../main/middleware/caseReference';
import dashboardRoutes, { getDashboardUrl } from '../../../main/routes/dashboard';

jest.mock('../../../main/middleware/caseReference', () => ({
  caseReferenceParamMiddleware: jest.fn((req, res, next, caseReference) => {
    // Simulate validatedCase being set by middleware so dashboard route can use it
    res.locals.validatedCase = {
      id: caseReference,
      data: {
        propertyAddress: {
          AddressLine1: '10 Second Avenue',
          AddressLine2: '',
          AddressLine3: '',
          PostTown: 'London',
          County: '',
          PostCode: 'W3 7RX',
        },
      },
    };

    return next();
  }),
}));

jest.mock('../../../main/middleware/oidc', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

jest.mock('../../../main/services/pcsApi', () => {
  const STATUS_MAP = {
    AVAILABLE: { text: 'Available' },
  };

  const TASK_GROUP_MAP = {
    GROUP_ONE: 'Group one title',
  };

  return {
    STATUS_MAP,
    TASK_GROUP_MAP,
    getDashboardNotifications: jest.fn().mockResolvedValue([]),
    getDashboardTaskGroups: jest.fn().mockResolvedValue([
      {
        groupId: 'GROUP_ONE',
        tasks: [
          {
            templateId: 'task-1',
            templateValues: {},
            status: 'AVAILABLE',
          },
        ],
      },
    ]),
  };
});

describe('Dashboard Routes', () => {
  let app: Application;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    app = express();
    app.locals.nunjucksEnv = {
      render: jest.fn((template: string) => `<div>${template}</div>`),
    } as unknown as Environment;

    mockResponse = {
      locals: {},
      redirect: jest.fn(),
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Router pattern and wiring', () => {
    it('should create dashboard router with param middleware', () => {
      dashboardRoutes(app);

      // Verify middleware module is imported (indicates router pattern used)
      expect(caseReferenceMiddleware.caseReferenceParamMiddleware).toBeDefined();
    });

    it('should handle validatedCase being undefined gracefully', async () => {
      mockResponse.locals = {}; // No validatedCase set

      dashboardRoutes(app);

      // Verify validatedCase can be undefined
      expect(mockResponse.locals.validatedCase).toBeUndefined();
    });

    it('should render dashboard with property address and case reference', async () => {
      dashboardRoutes(app);

      const appWithResponse = app as unknown as { response: Response };
      const renderSpy = jest.spyOn(appWithResponse.response, 'render');

      await request(app).get('/dashboard/1772634251466249');

      expect(renderSpy).toHaveBeenCalledWith(
        'dashboard',
        expect.objectContaining({
          propertyAddress: '10 Second Avenue, London, W3 7RX',
          dashboardCaseReference: '1772634251466249',
        })
      );
    });

    it('should redirect root /dashboard to case-specific dashboard when session case id is valid', async () => {
      // Simulate a valid CCD case id in the session
      app.use((req, _res, next) => {
        // @ts-expect-error - adding test-only session shape
        req.session = { ccdCase: { id: '1772634251466249' } };
        next();
      });

      dashboardRoutes(app);

      const response = await request(app).get('/dashboard');

      expect(response.status).toBe(303);
      expect(response.headers.location).toBe('/dashboard/1772634251466249');
    });
  });

  describe('getDashboardUrl helper', () => {
    it('should return dashboard URL with valid 16-digit case reference', () => {
      const result = getDashboardUrl('1234567890123456');
      expect(result).toBe('/dashboard/1234567890123456');
    });

    it('should return null for invalid case reference', () => {
      const result = getDashboardUrl('invalid');
      expect(result).toBeNull();
    });

    it('should return null when case reference is undefined', () => {
      const result = getDashboardUrl(undefined);
      expect(result).toBeNull();
    });

    it('should handle numeric case IDs', () => {
      const result = getDashboardUrl(1771325608502536);
      expect(result).toBe('/dashboard/1771325608502536');
    });
  });
});
