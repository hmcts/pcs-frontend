import * as path from 'path';

import * as express from 'express';
import { glob } from 'glob';
import * as nunjucks from 'nunjucks';

import { Nunjucks } from '../../../../main/modules/nunjucks';

jest.mock('nunjucks');
jest.mock('glob');
jest.mock('path');

// Mock glob.sync before any tests run
const mockGlobSync = jest.fn().mockReturnValue([]);
(glob.sync as unknown as jest.Mock) = mockGlobSync;

// Mock dynamic import
jest.mock('node:module', () => ({
  createRequire: () => ({
    resolve: () => 'test/filter1.ts',
  }),
}));

describe('Nunjucks', () => {
  let mockApp: express.Express;
  let mockNunjucksEnv: nunjucks.Environment;
  let mockPathJoin: jest.Mock;
  let nunjucksInstance: Nunjucks;

  beforeEach(() => {
    mockApp = {
      set: jest.fn(),
      locals: {},
      use: jest.fn(),
    } as unknown as express.Express;

    mockNunjucksEnv = {
      addFilter: jest.fn(),
      addGlobal: jest.fn(),
    } as unknown as nunjucks.Environment;

    mockPathJoin = path.join as jest.Mock;
    mockPathJoin.mockReturnValue('test/filters/path');

    (nunjucks.configure as jest.Mock).mockReturnValue(mockNunjucksEnv);

    nunjucksInstance = new Nunjucks(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with development mode', () => {
      expect(nunjucksInstance.developmentMode).toBe(true);
    });

    it('should initialize without development mode', () => {
      const nonDevInstance = new Nunjucks(false);
      expect(nonDevInstance.developmentMode).toBe(false);
    });
  });

  describe('enableFor', () => {
    it('should configure nunjucks with correct settings', () => {
      mockPathJoin.mockReturnValue('test/views/path');

      nunjucksInstance.enableFor(mockApp);

      expect(mockApp.set).toHaveBeenCalledWith('view engine', 'njk');
      expect(nunjucks.configure).toHaveBeenCalledWith(['test/views/path', 'test/views/path'], {
        autoescape: true,
        watch: true,
        express: mockApp,
      });
      expect(mockApp.locals.nunjucksEnv).toBe(mockNunjucksEnv);
      expect(mockNunjucksEnv.addGlobal).toHaveBeenCalledWith('govukRebrand', true);
    });

    it('should add custom filters', () => {
      // Mock the private addCustomFilters method
      const mockAddCustomFilters = jest.fn();
      Object.defineProperty(nunjucksInstance, 'addCustomFilters', { value: mockAddCustomFilters });

      nunjucksInstance.enableFor(mockApp);

      expect(mockAddCustomFilters).toHaveBeenCalledWith(mockNunjucksEnv);
    });

    it('should add pagePath to res.locals', () => {
      nunjucksInstance.enableFor(mockApp);

      const mockReq = { path: '/test-path' };
      const mockRes = { locals: { pagePath: '' } };
      const mockNext = jest.fn();

      const middleware = (mockApp.use as jest.Mock).mock.calls[0][0];
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.locals.pagePath).toBe('/test-path');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
