import { AsyncLocalStorage } from 'async_hooks';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

import {
  type Context,
  type ContextManager,
  INVALID_SPAN_CONTEXT,
  ROOT_CONTEXT,
  context,
  trace,
} from '@opentelemetry/api';
import { type RPCMetadata, RPCType, setRPCMetadata } from '@opentelemetry/core';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import express, { type NextFunction, type Request, type Response } from 'express';

import { expressInstrumentationConfig } from '../../../../main/modules/opentelemetry';

jest.mock('@azure/monitor-opentelemetry', () => ({
  useAzureMonitor: jest.fn(),
  shutdownAzureMonitor: jest.fn(),
}));
jest.mock('config', () => ({ get: jest.fn() }));
jest.mock('@modules/logger', () => ({ Logger: { enableTelemetry: jest.fn() } }));

// Runs the real Express instrumentation with the app's settings.

const CASE_REFERENCE = '1234567890123456';

class AsyncLocalStorageContextManager implements ContextManager {
  private readonly storage = new AsyncLocalStorage<Context>();

  active(): Context {
    return this.storage.getStore() ?? ROOT_CONTEXT;
  }

  with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
    activeContext: Context,
    fn: F,
    thisArg?: ThisParameterType<F>,
    ...args: A
  ): ReturnType<F> {
    return this.storage.run(activeContext, () => fn.call(thisArg, ...args));
  }

  bind<T>(activeContext: Context, target: T): T {
    if (typeof target !== 'function') {
      return target;
    }
    const run = <R>(fn: () => R): R => this.storage.run(activeContext, fn);
    return function (this: unknown, ...args: unknown[]) {
      return run(() => target.apply(this, args));
    } as unknown as T;
  }

  enable(): this {
    return this;
  }

  disable(): this {
    this.storage.disable();
    return this;
  }
}

describe('route recorded for App Insights request names (HDPI-9884)', () => {
  const instrumentation = new ExpressInstrumentation(expressInstrumentationConfig);
  const [expressModule] = instrumentation.getModuleDefinitions();
  let server: Server;
  let baseUrl: string;
  let routeRecorded: (route: string | undefined) => void;

  const pass = (req: Request, res: Response, next: NextFunction): void => next();

  // Stands in for the HTTP instrumentation: opens the request span and reads the recorded route.
  const httpInstrumentationStandIn = (req: Request, res: Response, next: NextFunction): void => {
    const span = trace.wrapSpanContext(INVALID_SPAN_CONTEXT);
    const metadata: RPCMetadata = { type: RPCType.HTTP, span };
    res.on('finish', () => routeRecorded(metadata.route));
    context.with(setRPCMetadata(trace.setSpan(context.active(), span), metadata), next);
  };

  // Routers in the same order as app.ts: guidance, a journey, the dashboard on /case, then the rest.
  const buildApp = (): express.Express => {
    const app = express();
    app.use(httpInstrumentationStandIn);
    app.use(pass);

    const guidanceRouter = express.Router();
    guidanceRouter.get('/prepare-to-respond', (req, res) => void res.send('guidance'));
    app.use(guidanceRouter);

    const basePath = '/case/:caseReference/respond-to-claim';
    const journeyRouter = express.Router({ mergeParams: true });
    journeyRouter.param('caseReference', (req, res, next) => next());
    journeyRouter.use(basePath, pass);
    journeyRouter.get(`${basePath}/start-now`, pass, (req, res) => void res.send('step'));
    journeyRouter.post(`${basePath}/start-now`, pass, (req, res) => res.redirect('next-step'));
    journeyRouter.get(`${basePath}/broken`, () => {
      throw new Error('broken step');
    });
    app.use(journeyRouter);

    const dashboardRouter = express.Router({ mergeParams: true });
    dashboardRouter.use(pass);
    dashboardRouter.get('/:caseReference/dashboard', (req, res) => void res.send('dashboard'));
    app.use('/case', dashboardRouter);

    const eventRouter = express.Router({ mergeParams: true });
    eventRouter.get('/:caseReference/event/:eventId', (req, res) => void res.send('event'));
    app.use('/cases', eventRouter);

    app.get('/case/:caseReference/view-hearing-documents', pass, (req, res) => void res.send('hearings'));
    app.get('/health/liveness', (req, res) => void res.json({ status: 'UP' }));

    app.use((req, res) => void res.status(404).send('not found'));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => void res.status(500).send('error'));
    return app;
  };

  const recordedRouteFor = async (method: string, path: string): Promise<string | undefined> => {
    const recorded = new Promise<string | undefined>(resolve => {
      routeRecorded = resolve;
    });
    const response = await fetch(`${baseUrl}${path}`, { method, redirect: 'manual' });
    await response.text();
    return recorded;
  };

  beforeAll(async () => {
    context.setGlobalContextManager(new AsyncLocalStorageContextManager());
    // In the app, the instrumentation attaches itself to express when express is first loaded.
    // That does not happen under Jest, which loads modules its own way, so attach it by hand.
    expressModule.patch?.(express);
    server = buildApp().listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    expressModule.unpatch?.(express);
    context.disable();
  });

  it.each([
    ['GET', `/case/${CASE_REFERENCE}/respond-to-claim/start-now`, '/case/:caseReference/respond-to-claim/start-now'],
    ['POST', `/case/${CASE_REFERENCE}/respond-to-claim/start-now`, '/case/:caseReference/respond-to-claim/start-now'],
    [
      'GET',
      `/case/${CASE_REFERENCE}/respond-to-claim/start-now?lang=cy&token=abc123`,
      '/case/:caseReference/respond-to-claim/start-now',
    ],
    ['GET', `/case/${CASE_REFERENCE}/respond-to-claim/broken`, '/case/:caseReference/respond-to-claim/broken'],
    ['GET', `/case/${CASE_REFERENCE}/dashboard`, '/case/:caseReference/dashboard'],
    ['GET', `/cases/${CASE_REFERENCE}/event/respondToClaim`, '/cases/:caseReference/event/:eventId'],
    ['GET', '/prepare-to-respond', '/prepare-to-respond'],
    ['GET', '/health/liveness', '/health/liveness'],
  ])('names %s %s by its route template', async (method, path, expectedRoute) => {
    expect(await recordedRouteFor(method, path)).toBe(expectedRoute);
  });

  it('does not repeat the mount path of a router the request only passed through', async () => {
    // The dashboard router on /case sees this request first, but does not handle it.
    expect(await recordedRouteFor('GET', `/case/${CASE_REFERENCE}/view-hearing-documents`)).toBe(
      '/case/:caseReference/view-hearing-documents'
    );
  });

  it.each([
    ['under a mounted router', `/case/${CASE_REFERENCE}/no-such-page`],
    ['under a journey', `/case/${CASE_REFERENCE}/respond-to-claim/no-such-step`],
    ['anywhere else', `/no-such-page/${CASE_REFERENCE}?lang=cy`],
  ])('records no route for a page that does not exist %s', async (_description, path) => {
    expect(await recordedRouteFor('GET', path)).toBeUndefined();
  });
});
