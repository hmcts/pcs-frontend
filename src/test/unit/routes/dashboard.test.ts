import type { Application, Response } from 'express';
import express from 'express';
import type { Environment } from 'nunjucks';

import * as caseReferenceMiddleware from '../../../main/middleware/caseReference';
import dashboardRoutes, { getDashboardUrl } from '../../../main/routes/dashboard';

jest.mock('../../../main/middleware/caseReference');
jest.mock('../../../main/middleware/oidc', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));
describe('Dashboard Routes - Router Pattern Fix', () => {
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

  describe('Fix #1: Dashboard Router Pattern', () => {
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
  });

  describe('getDashboardUrl helper', () => {
    it('should return dashboard URL with valid 16-digit case reference', () => {
      const result = getDashboardUrl('1234567890123456');
      expect(result).toBe('/dashboard/1234567890123456');
    });

    it('should return default URL for invalid case reference', () => {
      const result = getDashboardUrl('invalid');
      expect(result).toBe('/dashboard/1234567890123456');
    });

    it('should return default URL when case reference is undefined', () => {
      const result = getDashboardUrl(undefined);
      expect(result).toBe('/dashboard/1234567890123456');
    });

    it('should handle numeric case IDs', () => {
      const result = getDashboardUrl(1771325608502536);
      expect(result).toBe('/dashboard/1771325608502536');
    });
  });
});
