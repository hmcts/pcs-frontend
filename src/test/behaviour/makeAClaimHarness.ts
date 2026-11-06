/**
 * Runs the private landlord make a claim journey as the application does: real routes, middleware, templates and
 * translations. Only the boundary is faked: CCD and pcs-api are tiny HTTP servers, LaunchDarkly answers as the Test
 * environment is configured to, and the signed-in citizen is placed on the session.
 */
import * as http from 'node:http';
import { type AddressInfo } from 'node:net';

import express, { type Express, type Request, type Response } from 'express';

export const CASE_REFERENCE = '1777027600017761';

export interface StoredCase {
  propertyAddress?: Record<string, string>;
  citizenPossessionClaim?: Record<string, unknown>;
}

/** What CCD holds and what it was asked, for a test to set up and inspect. */
export const ccd = {
  stored: undefined as StoredCase | undefined,
  createRequests: [] as Record<string, unknown>[],
  draftSaves: [] as Record<string, unknown>[],
  submissions: [] as Record<string, unknown>[],
  cardPayments: [] as Record<string, unknown>[],
  refuseCreate: undefined as string | undefined,
  refuseSubmit: undefined as string[] | undefined,
  changeDraftBeforeNextSave: false,
};

/** pcs-api's draft version: every save that names the stored version moves it on; a stale one is refused. */
function draftVersion(): number {
  return Number(ccd.stored?.citizenPossessionClaim?.draftVersion ?? 0);
}

function jwt(claims: Record<string, unknown>): string {
  const encode = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode(claims)}.`;
}

function ccdStub(): Express {
  const stub = express();
  stub.use(express.json({ limit: '10mb' }));
  stub.get('/case-types/:caseType/event-triggers/citizenCreatePossessionClaim', (_req, res) => {
    res.json({ token: 'create-token' });
  });
  stub.post('/case-types/:caseType/cases', (req: Request, res: Response) => {
    ccd.createRequests.push(req.body);
    if (ccd.refuseCreate) {
      return res.status(422).json({ callbackErrors: [ccd.refuseCreate] });
    }
    ccd.stored = { citizenPossessionClaim: { ...req.body.data.citizenPossessionClaim, draftVersion: 1 } };
    res.status(201).json({ id: Number(CASE_REFERENCE), data: {} });
  });
  stub.post('/case-types/:caseType/validate', (req: Request, res: Response) => {
    ccd.draftSaves.push({ pageId: req.query.pageId, ...req.body });
    if (!ccd.stored) {
      return res.status(404).json({ message: 'No case' });
    }
    const sent = req.body.event_data.citizenPossessionClaim;
    if (ccd.changeDraftBeforeNextSave) {
      ccd.changeDraftBeforeNextSave = false;
      ccd.stored.citizenPossessionClaim = { ...ccd.stored.citizenPossessionClaim, draftVersion: draftVersion() + 1 };
    }
    if (sent.draftVersion !== undefined && sent.draftVersion !== draftVersion()) {
      return res.status(422).json({ callbackErrors: ['DRAFT_CHANGED'] });
    }
    ccd.stored.citizenPossessionClaim = {
      ...sent,
      propertyAddress: ccd.stored.citizenPossessionClaim?.propertyAddress,
      draftVersion: draftVersion() + 1,
    };
    res.json({ data: { citizenPossessionClaim: ccd.stored.citizenPossessionClaim } });
  });
  stub.get('/cases/:id/event-triggers/:event', (req: Request, res: Response) => {
    if (!ccd.stored || req.params.id !== CASE_REFERENCE) {
      return res.status(404).json({ message: 'Case not found' });
    }
    res.json({ token: `${req.params.event}-token`, case_details: { case_data: ccd.stored } });
  });
  stub.get('/cases/:id', (req: Request, res: Response) => {
    if (!ccd.stored || req.params.id !== CASE_REFERENCE) {
      return res.status(404).json({ message: 'Case not found' });
    }
    res.json({ id: CASE_REFERENCE, data: ccd.stored });
  });
  stub.post('/cases/:id/events', (req: Request, res: Response) => {
    ccd.submissions.push(req.body);
    if (ccd.refuseSubmit) {
      return res.status(422).json({ callbackErrors: ccd.refuseSubmit });
    }
    if (req.body.data?.citizenPossessionClaim?.draftVersion !== draftVersion()) {
      return res.status(422).json({ callbackErrors: ['DRAFT_CHANGED'] });
    }
    const draft = ccd.stored?.citizenPossessionClaim ?? {};
    const fee = { serviceRequestReference: '2026-1777027600017', feeAmount: '40400' };
    ccd.stored = {
      ...ccd.stored,
      citizenPossessionClaim: { ...draft, submission: { ...(draft.submission as object), ...fee } },
    };
    res.json({
      id: CASE_REFERENCE,
      data: {},
      after_submit_callback_response: { confirmation_body: JSON.stringify(fee) },
    });
  });
  stub.post('/payment/service-request/:reference/card-payment', (req: Request, res: Response) => {
    ccd.cardPayments.push({ reference: req.params.reference, ...req.body });
    res.json({ paymentReference: 'RC-1111', status: 'Initiated', nextUrl: 'https://card.payments.test/pay/1' });
  });
  return stub;
}

function listen(app: Express): Promise<http.Server> {
  return new Promise(resolve => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

export interface HttpResponse {
  status: number;
  location?: string;
  text: string;
}

export interface TestApp {
  get(path: string): Promise<HttpResponse>;
  post(path: string, body: Record<string, string | string[]>): Promise<HttpResponse>;
  close(): Promise<void>;
}

let backend: http.Server | undefined;
afterAll(() => backend?.close());

export async function bootMakeAClaim(
  options: { enabled?: boolean; email?: string; rentHistoryDesign?: unknown; signedIn?: boolean } = {}
): Promise<TestApp> {
  ccd.stored = undefined;
  ccd.createRequests = [];
  ccd.draftSaves = [];
  ccd.submissions = [];
  ccd.cardPayments = [];
  ccd.refuseCreate = undefined;
  ccd.refuseSubmit = undefined;
  ccd.changeDraftBeforeNextSave = false;
  backend ??= await listen(ccdStub());
  const backendUrl = `http://127.0.0.1:${(backend.address() as AddressInfo).port}`;
  process.env.CCD_URL = backendUrl;
  process.env.PCS_API_URL = backendUrl;
  process.env.PAYMENT_RETURN_URL = 'https://pcs.test/payment/return';

  const [
    { Nunjucks },
    { I18n },
    { http: httpService },
    { setupErrorHandlers },
    { registerAllJourneys },
    { default: makeAClaimRoutes },
    middleware,
  ] = await Promise.all([
    import('../../main/modules/nunjucks'),
    import('../../main/modules/i18n'),
    import('../../main/modules/http'),
    import('../../main/modules/error-handler'),
    import('../../main/routes/registerSteps'),
    import('../../main/routes/makeAClaim'),
    import('../../main/middleware'),
  ]);
  httpService.setToken('s2s-token', Date.now() + 60 * 60 * 1000);

  const app = express();
  app.use(middleware.formBodyMiddleware);
  new Nunjucks(false).enableFor(app);
  app.locals.nunjucksEnv.addGlobal('sessionTimeout', {});
  new I18n().enableFor(app);
  // LaunchDarkly as the Test environment is set up: the journey on, and the table design for pl-table- users.
  app.locals.launchDarklyClient = {
    variation: async (flag: string, context: { email?: string }, fallback: unknown) => {
      if (flag === 'private-landlord-make-a-claim-enabled') {
        return options.enabled ?? true;
      }
      if (flag === 'private-landlord-rent-history-design') {
        return options.rentHistoryDesign ?? (context.email?.includes('pl-table-') ? 'table' : 'ledger');
      }
      return fallback;
    },
  };

  const user = {
    uid: 'landlord-uid',
    sub: 'landlord-uid',
    email: options.email ?? 'pl-ledger-0001@example.test',
    roles: ['citizen'],
  };
  const session: Record<string, unknown> = {
    save: (callback?: () => void) => callback?.(),
    ...(options.signedIn === false
      ? {}
      : { user: { ...user, accessToken: jwt({ ...user, exp: Math.floor(Date.now() / 1000) + 3600 }) } }),
  };
  app.use((req: Request, res: Response, next) => {
    Object.assign(req, { session });
    res.locals.csrfToken = 'csrf-test';
    next();
  });
  app.get('/login', (_req, res) => res.status(200).send('IDAM sign in'));
  app.use(middleware.makeAClaimPathsFeatureMiddleware);
  app.param('caseReference', middleware.caseReferenceParamMiddleware);
  registerAllJourneys(app);
  makeAClaimRoutes(app);
  setupErrorHandlers(app, 'test');
  const server = await listen(app);
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const request = (method: string, path: string, body?: string): Promise<HttpResponse> =>
    new Promise((resolve, reject) => {
      const req = http.request(
        `${baseUrl}${path}`,
        { method, agent: false, headers: body ? { 'content-type': 'application/x-www-form-urlencoded' } : {} },
        res => {
          let text = '';
          res.setEncoding('utf8');
          res.on('data', chunk => (text += chunk));
          res.on('end', () => resolve({ status: res.statusCode ?? 0, location: res.headers.location, text }));
        }
      );
      req.on('error', reject);
      req.end(body);
    });

  const encode = (body: Record<string, string | string[]>): string => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        params.append(key, item);
      }
    }
    return params.toString();
  };

  return {
    get: path => request('GET', path),
    post: (path, body) => request('POST', path, encode({ action: 'continue', ...body })),
    close: () => {
      server.closeAllConnections();
      return new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}

/** The journey's page for a case path, e.g. claimPath('task-list'). */
export function claimPath(step: string): string {
  return `/case/${CASE_REFERENCE}/make-a-claim/${step}`;
}

/** The claim as the last draft save or submission left it in CCD. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests read nested answers without restating the DTO
export function storedClaim(): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (ccd.stored?.citizenPossessionClaim ?? {}) as Record<string, any>;
}

/** Puts a case with this claim in CCD, as if the claimant had already answered these questions. */
export function givenClaim(claim: Record<string, unknown>): void {
  ccd.stored = {
    citizenPossessionClaim: {
      propertyAddress: { AddressLine1: '15 Garden Drive', PostTown: 'Luton', PostCode: 'LU1 1AB' },
      draftVersion: 1,
      ...claim,
    },
  };
}
