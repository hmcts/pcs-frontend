/**
 * Runs the make-order and confirm order review pages as the application does: real route, real middleware, real
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
    // Arrears on issue as pcs-api sent it before HDPI-6373 had the judge fill it in; the page ignores it.
    caseFacts: { tenancyStartDate: '2024-01-09', currentRent: 750, arrearsOnIssue: 2400 },
  },
});

/** Minimal CCD: hands out the stored envelope and applies posted make order and confirm order review events to it. */
let envelope = blankCase();

/** The tokens CCD has handed out for starting the make order event, in order. */
let startTokens: string[] = [];

/** The tokens the make order event has been submitted with, in order. */
let submittedTokens: string[] = [];

/** How many times the make order event has been started. */
export function eventStarts(): number {
  return startTokens.length;
}

/** The start tokens the make order event has been submitted with, in order. */
export function submittedEventTokens(): string[] {
  return submittedTokens;
}

/** The confirm order review requests caseworkers have submitted, in order. */
let reviewRequests: Record<string, unknown>[] = [];

export function submittedReviews(): Record<string, unknown>[] {
  return reviewRequests;
}

/** The reason pcs-api gives for refusing the next make order event, if a test has asked it to. */
let refusal: string | undefined;

/** Has the next make order event refused, as pcs-api does when the draft changed elsewhere. */
export function refuseNextEvent(reason: string): void {
  refusal = reason;
}

/**
 * CCD lets only the judge, whom it knows by their role assignments, use the make order event: anyone
 * else can start it but is not shown its payload, and cannot submit it.
 */
function uid(req: Request): string | undefined {
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  return JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString() || '{}').uid;
}

function isJudge(req: Request): boolean {
  return uid(req) === JUDGE.uid;
}

/** Likewise CCD lets only caseworkers, by their role assignments, use the confirm order review event. */
function isCaseworker(req: Request): boolean {
  return uid(req) === CASEWORKER.uid;
}

const CONFIRM_ORDER_REVIEW = 'ext:confirmOrderReview';

/** Whether this user may use the event, as CCD decides from their role assignments. */
function mayUse(req: Request, event: string): boolean {
  return event === CONFIRM_ORDER_REVIEW ? isCaseworker(req) : isJudge(req);
}

function ccdStub(): Express {
  const ccd = express();
  // CCD takes events far larger than express's 100kb default.
  ccd.use(express.json({ limit: '10mb' }));
  ccd.get('/cases/:id/event-triggers/:event', (req: Request, res: Response) => {
    const event = req.params.event as string;
    if (event === CONFIRM_ORDER_REVIEW && isCaseworker(req) && envelope.order.state !== 'SUBMITTED_FOR_REVIEW') {
      // pcs-api refuses to start a review with no order waiting for one.
      return res.status(422).json({ callbackErrors: ['There is no order waiting for review on this case'] });
    }
    const caseData = mayUse(req, event) ? { sdkEventPayload: JSON.stringify(envelope) } : {};
    const token = `event-token-${startTokens.length + 1}`;
    startTokens.push(token);
    res.json({ token, case_details: { case_data: caseData } });
  });
  ccd.post('/cases/:id/events', (req: Request, res: Response) => {
    const event = req.body.event?.id as string;
    if (!mayUse(req, event)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    submittedTokens.push(req.body.event_token);
    // CCD only takes an event it started.
    if (!startTokens.includes(req.body.event_token)) {
      return res.status(404).json({ message: 'Cannot find matching start trigger' });
    }
    if (refusal) {
      const reason = refusal;
      refusal = undefined;
      return res.status(422).json({ callbackErrors: [reason] });
    }
    const posted = JSON.parse(req.body.data.sdkEventPayload);
    if (event === CONFIRM_ORDER_REVIEW) {
      reviewRequests.push(posted);
      envelope.order.state = posted.action === 'ISSUE' ? 'ISSUED' : 'RETURNED_TO_JUDGE';
      return res.json({ id: req.params.id, data: {} });
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
  options: {
    judge?: boolean;
    caseworker?: boolean;
    makeOrderEnabled?: boolean;
    defendants?: { id: string; name: string }[];
    /** A judge's order waiting for a caseworker's review. */
    orderAwaitingReview?: Partial<Envelope['order']>;
  } = {}
): Promise<TestApp> {
  envelope = blankCase();
  if (options.defendants) {
    envelope.caseContext.defendants = options.defendants;
  }
  if (options.orderAwaitingReview) {
    envelope.order = {
      id: 'order-awaiting-review',
      version: 3,
      orderType: 'OUTRIGHT_POSSESSION',
      formData: {},
      ...options.orderAwaitingReview,
      state: 'SUBMITTED_FOR_REVIEW',
    };
  }
  startTokens = [];
  submittedTokens = [];
  reviewRequests = [];
  refusal = undefined;
  ccd ??= await listen(ccdStub());
  process.env.CCD_URL = `http://127.0.0.1:${(ccd.address() as AddressInfo).port}`;
  process.env.REDIRECTS_MANAGE_CASE_RETURN_URL = MANAGE_CASE_URL.slice(0, MANAGE_CASE_URL.lastIndexOf('/'));

  // config reads the environment when first loaded, so import the application after setting it.
  const [
    { Nunjucks },
    { http: httpService },
    { default: makeOrderRoutes },
    { default: confirmOrderReviewRoutes },
    { default: decentralisedEventRoutes },
    { default: docweaveTemplateRoutes },
    { setupErrorHandlers },
    middleware,
  ] = await Promise.all([
    import('../../main/modules/nunjucks'),
    import('../../main/modules/http'),
    import('../../main/routes/makeOrder'),
    import('../../main/routes/confirmOrderReview'),
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
  // One signed-in session for the whole test, as the browser's session cookie would keep it.
  const user = options.caseworker ? CASEWORKER : options.judge === false ? CITIZEN : JUDGE;
  const session = { user: { ...user, accessToken: jwt({ ...user, exp: Math.floor(Date.now() / 1000) + 3600 }) } };
  app.use((req: Request, res: Response, next) => {
    Object.assign(req, { session });
    res.locals.csrfToken = 'csrf-test';
    next();
  });
  app.param('caseReference', middleware.caseReferenceParamMiddleware);
  makeOrderRoutes(app);
  confirmOrderReviewRoutes(app);
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
  const { initMakeOrder, buildOrderDocument, startWithSavedOrderTab } = await import('../../main/assets/js/make-order');
  // The template's inline script adds these; jsdom does not run it.
  document.body.classList.add('js-enabled', 'govuk-frontend-supported');
  startWithSavedOrderTab(initAll);
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

/** Loads a confirm order review page into jsdom and starts its JavaScript, as a browser would. */
export async function openReviewPage(html: string): Promise<{ body(action?: string): URLSearchParams }> {
  window.history.replaceState(null, '', '/');
  document.open();
  document.write(html);
  document.close();
  const { initAll } = await import('govuk-frontend');
  const { initOrderPreview } = await import('../../main/assets/js/order-preview');
  document.body.classList.add('js-enabled', 'govuk-frontend-supported');
  initAll();
  initOrderPreview();
  return {
    // The form as the browser would submit it with the named button.
    body: action => {
      const form = document.querySelector<HTMLFormElement>('main form');
      if (!form) {
        throw new Error('The page has no form');
      }
      const body = new URLSearchParams();
      new FormData(form).forEach((value, name) => body.append(name, String(value)));
      if (action) {
        body.set('action', action);
      }
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

/** Records how the case's claimant and defendant attended, which every order needs before review. */
export function recordAttendance(): void {
  check('claimant-claimant-id-attendance', 'litigant-in-person');
  check('defendant-defendant-id-attendance', 'not-present');
}

/**
 * Writes paragraphs into the order preview after "IT IS ORDERED THAT:", as a judge writes a free form order there.
 * jsdom cannot type into the editor, so this changes the document the page submits, as the editor would. The next
 * change to the form regenerates that document, so call it after the other answers.
 */
export function writeInPreview(...paragraphs: string[]): void {
  const field = control<HTMLTextAreaElement>('#order-document');
  const snapshot = JSON.parse(field.value);
  const content: { attrs?: { id?: string | null } }[] = snapshot.current.content;
  const orderedThat = content.findIndex(node => node.attrs?.id === 'paragraph:ordered-that');
  if (orderedThat === -1) {
    throw new Error('The order preview has no "IT IS ORDERED THAT:"');
  }
  content.splice(
    orderedThat + 1,
    0,
    ...paragraphs.map(text => ({ type: 'paragraph', attrs: { id: null }, content: [{ type: 'text', text }] }))
  );
  field.value = JSON.stringify(snapshot);
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
