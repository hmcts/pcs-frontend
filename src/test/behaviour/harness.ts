/**
 * Runs the make-order page as the application does: real route, real middleware, real
 * templates, real client code in jsdom. Only the boundary is faked: CCD is a tiny HTTP server
 * and the signed-in user is placed on the session.
 */
import { randomUUID } from 'node:crypto';
import * as http from 'node:http';
import { type AddressInfo } from 'node:net';

import express, { type Express, type Request, type Response } from 'express';

export const CASE_REFERENCE = '1777027600017760';
export const MANAGE_CASE_URL = `http://manage-case.test/cases/case-details/PCS/PCS/${CASE_REFERENCE}`;

// IDAM gives a judge the same roles as a caseworker; CCD knows them from their role assignments.
const JUDGE = { uid: 'judge-uid', sub: 'judge-uid', roles: ['caseworker', 'caseworker-pcs'] };
const CITIZEN = { uid: 'citizen-uid', sub: 'citizen-uid', roles: ['citizen'] };
const CASEWORKER = { uid: 'caseworker-uid', sub: 'caseworker-uid', roles: ['caseworker', 'caseworker-pcs'] };

function jwt(claims: Record<string, unknown>): string {
  const encode = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode(claims)}.`;
}

interface Envelope {
  order: {
    id?: string;
    state: string;
    version: number;
    orderType?: string;
    formData?: Record<string, unknown>;
    docweaveSnapshot?: unknown;
  };
  caseContext: Record<string, unknown>;
}

const blankCase = (): Envelope => ({
  order: { state: 'DRAFT', version: 0 },
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

/** Why pcs-api refuses a change to the judge's order, if it does: it must be to their draft as they last saw it. */
function rejection(posted: { action: string; order: { id: string | null; version: number } }): string | undefined {
  if (posted.action === 'START_DRAFT') {
    return undefined;
  }
  if (envelope.order.state !== 'DRAFT' || !envelope.order.id || envelope.order.id !== posted.order.id) {
    return 'The order draft does not exist for this case';
  }
  if (envelope.order.version !== posted.order.version) {
    return 'The order draft has been updated by another user. Reload it and try again';
  }
  return undefined;
}

/**
 * CCD lets only the judge, whom it knows by their role assignments, use the make order event: anyone
 * else can start it but is not shown its payload, and cannot submit it.
 */
function isJudge(req: Request): boolean {
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  const claims = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString() || '{}');
  return claims.uid === JUDGE.uid;
}

function ccdStub(): Express {
  const ccd = express();
  // CCD takes events far larger than express's 100kb default.
  ccd.use(express.json({ limit: '10mb' }));
  ccd.get('/cases/:id/event-triggers/:event', (req: Request, res: Response) => {
    // Once the draft is sent for review, the judge is offered a new one.
    const current = envelope.order.state === 'DRAFT' ? envelope : { ...envelope, order: blankCase().order };
    const caseData = isJudge(req) ? { sdkEventPayload: JSON.stringify(current) } : {};
    res.json({ token: 'event-token', case_details: { case_data: caseData } });
  });
  ccd.post('/cases/:id/events', (req: Request, res: Response) => {
    if (!isJudge(req)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const posted = JSON.parse(req.body.data.sdkEventPayload);
    const refused = rejection(posted);
    if (refused) {
      return res.status(422).json({ callbackErrors: [refused] });
    }
    envelope = {
      ...envelope,
      order: {
        id: posted.order.id ?? `order-${randomUUID()}`,
        state: posted.action === 'SUBMIT_FOR_REVIEW' ? 'SUBMITTED_FOR_REVIEW' : 'DRAFT',
        version: posted.order.version + 1,
        orderType: posted.order.orderType,
        formData: posted.order.formData,
        docweaveSnapshot: posted.order.docweaveSnapshot,
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

export async function bootApp(
  options: { judge?: boolean; caseworker?: boolean; makeOrderEnabled?: boolean } = {}
): Promise<TestApp> {
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
    { default: docweaveTemplateRoutes },
    { setupErrorHandlers },
    middleware,
  ] = await Promise.all([
    import('../../main/modules/nunjucks'),
    import('../../main/modules/http'),
    import('../../main/routes/makeOrder'),
    import('../../main/routes/decentralisedEvent'),
    import('../../main/routes/docweaveTemplates'),
    import('../../main/modules/error-handler'),
    import('../../main/middleware'),
  ]);
  httpService.setToken('s2s-token', Date.now() + 60 * 60 * 1000);

  const app = express();
  app.use(express.urlencoded({ extended: false, limit: '2mb' }));
  new Nunjucks(false).enableFor(app);
  app.locals.nunjucksEnv.addGlobal('sessionTimeout', {});
  // LaunchDarkly, with the make order flag on unless a test turns it off.
  app.locals.launchDarklyClient = {
    variation: async (flag: string, _context: unknown, fallback: unknown) =>
      flag === 'make-order-enabled' ? options.makeOrderEnabled !== false : fallback,
  };
  app.locals.nunjucksEnv.addGlobal('t', (key: string, fallback?: unknown) =>
    typeof fallback === 'string' ? fallback : key
  );
  app.use((req: Request, res: Response, next) => {
    const user = options.caseworker ? CASEWORKER : options.judge === false ? CITIZEN : JUDGE;
    Object.assign(req, {
      session: { user: { ...user, accessToken: jwt({ ...user, exp: Math.floor(Date.now() / 1000) + 3600 }) } },
    });
    res.locals.csrfToken = 'csrf-test';
    next();
  });
  app.param('caseReference', middleware.caseReferenceParamMiddleware);
  makeOrderRoutes(app);
  decentralisedEventRoutes(app);
  docweaveTemplateRoutes(app);
  setupErrorHandlers(app, 'test');
  const server = await listen(app);
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const requestOnce = (method: string, path: string, body?: string): Promise<HttpResponse> =>
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

  // On a busy CI host the loopback connection to this test's own server can be
  // reset before it completes (ECONNRESET), independent of the application's
  // behaviour; a single retry absorbs that without masking a real failure,
  // which would still surface as a wrong status, body or a repeat of the reset.
  const request = async (method: string, path: string, body?: string): Promise<HttpResponse> => {
    try {
      return await requestOnce(method, path, body);
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'ECONNRESET') {
        throw error;
      }
      return requestOnce(method, path, body);
    }
  };

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
  /** The order document the page will submit (the editor's current snapshot), as plain text. */
  documentText(): string;
  /** The form as the browser would submit it. */
  body(): URLSearchParams;
}

interface SnapshotNode {
  type: string;
  text?: string;
  attrs?: { text?: string };
  content?: SnapshotNode[];
}

/** A Docweave snapshot's current document as plain text, one line per paragraph. */
function snapshotText(json: string): string {
  const inline = (node: SnapshotNode): string =>
    node.type === 'text'
      ? (node.text ?? '')
      : node.type === 'generated_text'
        ? (node.attrs?.text ?? '')
        : (node.content ?? []).map(inline).join('');
  const lines: string[] = [];
  const walk = (node: SnapshotNode): void => {
    if (node.type === 'paragraph') {
      lines.push(inline(node));
    } else {
      node.content?.forEach(walk);
    }
  };
  walk(JSON.parse(json).current);
  return lines.join('\n');
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
  initMakeOrder();
  const form = document.querySelector<HTMLFormElement>('#make-order-form');
  if (!form) {
    throw new Error('The make order form is not on the page');
  }
  return {
    form,
    orderText: () => buildOrderDocument(form).textContent,
    documentText: () => snapshotText(control<HTMLTextAreaElement>('#order-document').value),
    body: () => {
      const body = new URLSearchParams();
      new FormData(form).forEach((value, name) => body.append(name, String(value)));
      return body;
    },
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
