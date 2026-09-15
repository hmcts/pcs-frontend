import type { Express, RequestHandler } from 'express';

const mountedBy: string[] = [];

jest.mock('serve-favicon', () => () => (_req: unknown, _res: unknown, next: () => void) => next());
jest.mock('../../main/development', () => ({ setupDev: jest.fn() }));

jest.mock('../../main/staticAssets', () => ({
  setupStaticAssets: (app: Express) => {
    app.use(((_req, _res, next) => next()) as RequestHandler);
    mountedBy.push('staticAssets');
  },
}));

jest.mock('../../main/modules', () => {
  class Session {
    enableFor(app: Express): void {
      app.use(((_req, _res, next) => next()) as RequestHandler);
      mountedBy.push('session');
    }
  }
  class Csrf {
    enableFor(app: Express): void {
      app.use(((_req, _res, next) => next()) as RequestHandler);
      mountedBy.push('csrf');
    }
  }
  return { Session, Csrf, modules: ['Session', 'Csrf'] };
});

jest.mock('../../main/modules/error-handler', () => ({ setupErrorHandlers: jest.fn() }));
jest.mock('../../main/routes/registerSteps', () => ({ registerAllJourneys: jest.fn() }));
jest.mock('../../main/middleware', () => ({
  caseReferenceParamMiddleware: jest.fn(),
  legalRepresentativeAccessMiddleware: jest.fn(),
  pageTrackingUrlMiddleware: jest.fn(),
}));

describe('app static asset ordering', () => {
  it('mounts static assets before the session and csrf modules', async () => {
    await import('../../main/app');

    expect(mountedBy).toStrictEqual(['staticAssets', 'session', 'csrf']);
  });
});
