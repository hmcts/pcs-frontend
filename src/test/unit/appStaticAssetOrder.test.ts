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
  const record = (name: string) => (app: Express) => {
    app.use(((_req, _res, next) => next()) as RequestHandler);
    mountedBy.push(name);
  };
  class Helmet {
    enableFor = record('helmet');
  }
  class Session {
    enableFor = record('session');
  }
  class Csrf {
    enableFor = record('csrf');
  }
  return { Helmet, Session, Csrf, modules: ['Session', 'Csrf'] };
});

jest.mock('../../main/modules/error-handler', () => ({ setupErrorHandlers: jest.fn() }));
jest.mock('../../main/routes/registerSteps', () => ({ registerAllJourneys: jest.fn() }));
// Every export is a no-op handler, so adding a middleware to app.ts doesn't break this suite.
jest.mock('../../main/middleware', () => {
  const noop: RequestHandler = (_req, _res, next) => next();
  return new Proxy({ __esModule: true } as Record<string, unknown>, {
    get: (target, name) => (name in target ? target[name as string] : noop),
  });
});

describe('app static asset ordering', () => {
  it('mounts helmet before the static assets, and both before session and csrf', async () => {
    await import('../../main/app');

    expect(mountedBy).toStrictEqual(['helmet', 'staticAssets', 'session', 'csrf']);
  });
});
