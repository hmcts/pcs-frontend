/**
 * Runs the make-order page as the application does: real route, real middleware, real
 * templates, real client code in jsdom. Only the boundary is faked: CCD is a tiny HTTP server
 * and the signed-in user is placed on the session.
 */
import * as http from 'node:http';
import { type AddressInfo } from 'node:net';

import express, { type Express, type Request, type Response } from 'express';

export const CASE_REFERENCE = '1777027600017760';
export const MANAGE_CASE_URL = `http://manage-case.test/cases/case-details/PCS/PCS/${CASE_REFERENCE}`;

const JUDGE = { uid: 'judge-uid', sub: 'judge-uid', roles: ['caseworker-civil-judge'] };
const CITIZEN = { uid: 'citizen-uid', sub: 'citizen-uid', roles: ['citizen'] };

function jwt(claims: Record<string, unknown>): string {
  const encode = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode(claims)}.`;
}

interface Envelope {
  order: { id?: string; state: string; version: number; draftPayload: Record<string, unknown> };
  caseContext: Record<string, unknown>;
}

const blankCase = (): Envelope => ({
  order: {
    state: 'DRAFT',
    version: 0,
    draftPayload: { version: 1, orderType: 'OUTRIGHT_POSSESSION', formData: {}, documents: {} },
  },
  caseContext: {
    caseReference: Number(CASE_REFERENCE),
    propertyAddress: { AddressLine1: '10 Test Street', PostTown: 'Bristol', PostCode: 'BS1 1AA' },
    claimants: [{ id: 'claimant-id', name: 'Example Housing' }],
    defendants: [{ id: 'defendant-id', name: 'Alex Example' }],
    caseFacts: { tenancyStartDate: '2024-01-09', currentRent: 750, arrearsOnIssue: 2400 },
  },
});

/** Minimal CCD: hands out the stored envelope and applies posted make-order events to it. */
let envelope = blankCase();
function ccdStub(): Express {
  const ccd = express();
  ccd.use(express.json());
  ccd.get('/cases/:id/event-triggers/:event', (req: Request, res: Response) => {
    res.json({ token: 'event-token', case_details: { case_data: { makeOrderPayload: JSON.stringify(envelope) } } });
  });
  ccd.post('/cases/:id/events', (req: Request, res: Response) => {
    const posted = JSON.parse(req.body.data.makeOrderPayload);
    envelope = {
      ...envelope,
      order: {
        id: posted.order.id ?? 'order-id',
        state: posted.action === 'SUBMIT_FOR_REVIEW' ? 'SUBMITTED_FOR_REVIEW' : 'DRAFT',
        version: posted.order.version + 1,
        draftPayload: posted.order.draftPayload,
      },
    };
    res.json({ id: req.params.id, data: {} });
  });
  return ccd;
}

function listen(app: Express): Promise<http.Server> {
  return new Promise(resolve => {
    const server = app.listen(0, () => resolve(server));
  });
}

export interface HttpResponse {
  status: number;
  location?: string;
  text: string;
}

export interface TestApp {
  get(path: string): Promise<HttpResponse>;
  post(path: string, body: URLSearchParams): Promise<HttpResponse>;
  close(): Promise<void>;
}

// config reads the environment once, so the stub keeps one address for the whole test file.
let ccd: http.Server | undefined;
afterAll(() => ccd?.close());

export async function bootApp(options: { judge?: boolean } = {}): Promise<TestApp> {
  envelope = blankCase();
  ccd ??= await listen(ccdStub());
  process.env.CCD_URL = `http://127.0.0.1:${(ccd.address() as AddressInfo).port}`;
  process.env.REDIRECTS_MANAGE_CASE_RETURN_URL = MANAGE_CASE_URL.slice(0, MANAGE_CASE_URL.lastIndexOf('/'));

  // config reads the environment when first loaded, so import the application after setting it.
  const [
    { Nunjucks },
    { http: httpService },
    { default: makeOrderRoutes },
    { default: decentralisedEventRoutes },
    { setupErrorHandlers },
    middleware,
  ] = await Promise.all([
    import('../../main/modules/nunjucks'),
    import('../../main/modules/http'),
    import('../../main/routes/makeOrder'),
    import('../../main/routes/decentralisedEvent'),
    import('../../main/modules/error-handler'),
    import('../../main/middleware'),
  ]);
  httpService.setToken('s2s-token', Date.now() + 60 * 60 * 1000);

  const app = express();
  app.use(express.urlencoded({ extended: false }));
  new Nunjucks(false).enableFor(app);
  app.locals.nunjucksEnv.addGlobal('sessionTimeout', {});
  app.locals.nunjucksEnv.addGlobal('t', (key: string, fallback?: unknown) =>
    typeof fallback === 'string' ? fallback : key
  );
  app.use((req: Request, res: Response, next) => {
    const user = options.judge === false ? CITIZEN : JUDGE;
    Object.assign(req, {
      session: { user: { ...user, accessToken: jwt({ ...user, exp: Math.floor(Date.now() / 1000) + 3600 }) } },
    });
    res.locals.csrfToken = 'csrf-test';
    next();
  });
  app.param('caseReference', middleware.caseReferenceParamMiddleware);
  makeOrderRoutes(app);
  decentralisedEventRoutes(app);
  setupErrorHandlers(app, 'test');
  const server = await listen(app);
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const request = (method: string, path: string, body?: string): Promise<HttpResponse> =>
    new Promise((resolve, reject) => {
      const req = http.request(
        `${baseUrl}${path}`,
        { method, headers: body ? { 'content-type': 'application/x-www-form-urlencoded' } : {} },
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

  return {
    get: path => request('GET', path),
    post: (path, body) => request('POST', path, body.toString()),
    close: () => {
      server.closeAllConnections();
      return new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}

export interface Page {
  form: HTMLFormElement;
  /** The order document the page builds from the current form state, as plain text. */
  orderText(): string;
  /** The form as the browser would submit it. */
  body(): URLSearchParams;
  dispose(): void;
}

/** Loads served HTML into jsdom and starts the page's JavaScript, as a browser would. */
export async function openPage(html: string): Promise<Page> {
  window.history.replaceState(null, '', '/');
  document.open();
  document.write(html);
  document.close();
  const { initAll } = await import('govuk-frontend');
  const { initMakeOrder, buildOrderDocument } = await import('../../main/assets/js/make-order');
  // The template's inline script adds these; jsdom does not run it.
  document.body.classList.add('js-enabled', 'govuk-frontend-supported');
  initAll();
  const dispose = initMakeOrder();
  const form = document.querySelector<HTMLFormElement>('#make-order-form');
  if (!form) {
    throw new Error('The make order form is not on the page');
  }
  return {
    form,
    orderText: () => buildOrderDocument(form).toText(),
    body: () => {
      const body = new URLSearchParams();
      new FormData(form).forEach((value, name) => body.append(name, String(value)));
      return body;
    },
    dispose,
  };
}

export function control<T extends HTMLElement = HTMLInputElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`No control matches ${selector}`);
  }
  return element;
}

export function check(name: string, value: string, checked = true): void {
  const input = control(`input[name="${name}"][value="${value}"]`);
  if (input.checked !== checked) {
    input.click();
  }
}

export function uncheck(name: string, value: string): void {
  check(name, value, false);
}

export function type(name: string, value: string): void {
  const input = control<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${name}"]`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export function typeDate(prefix: string, day: string, month: string, year: string): void {
  type(`${prefix}-day`, day);
  type(`${prefix}-month`, month);
  type(`${prefix}-year`, year);
}

/** Switches order type the way GOV.UK tabs do: by changing the fragment. */
export function selectTab(id: string): void {
  window.location.hash = `#${id}`;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function futureDate(days: number): { day: string; month: string; year: string } {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear()),
  };
}
