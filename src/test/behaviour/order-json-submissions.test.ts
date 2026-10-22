import { runInThisContext } from 'node:vm';

import { initOrderSubmissions } from '../../main/assets/js/order-submissions';

import {
  CASE_REFERENCE,
  MANAGE_CASE_URL,
  type TestApp,
  bootApp,
  check,
  control,
  eventStarts,
  openPage,
  recordAttendance,
  refuseNextEvent,
  selectTab,
  submittedOrders,
  submittedReviews,
  writeInPreview,
} from './harness';

const MAKE = `/case/${CASE_REFERENCE}/make-order`;
const BASE = `/case/${CASE_REFERENCE}/confirm-order-review`;
const REVIEW = `${BASE}/review`;

/** The browser's repeated form entries represented as JSON, without discarding checkbox choices. */
function json(body: URLSearchParams): Record<string, string | string[]> {
  return Object.fromEntries(
    [...new Set(body.keys())].map(name => {
      const values = body.getAll(name);
      return [name, values.length === 1 ? values[0] : values];
    })
  );
}

describe('order JSON submissions', () => {
  let app: TestApp;
  afterEach(async () => {
    await app?.close();
  });

  it('saves a large edited draft and returns the XUI URL without a cross-origin HTTP redirect', async () => {
    app = await bootApp();
    const page = await openPage((await app.get(MAKE)).text);
    selectTab('tab-free-form');
    const wording = 'Évidence to be exchanged — £100. '.repeat(5000);
    writeInPreview(wording);
    const body = json(page.body('SAVE_DRAFT'));
    expect(JSON.stringify(body).length).toBeGreaterThan(100 * 1024);
    const response = await app.postJson(MAKE, body);
    expect(response.status).toBe(200);
    expect(response.location).toBeUndefined();
    expect(JSON.parse(response.text)).toEqual({ redirectUrl: MANAGE_CASE_URL });
    const reopened = await openPage((await app.get(MAKE)).text);
    expect(reopened.documentText()).toContain(wording.trim());
  });

  it('sends an order for review using the existing event and confirmation', async () => {
    app = await bootApp();
    const page = await openPage((await app.get(MAKE)).text);
    recordAttendance();
    check('outright-possession', 'forthwith');
    check('outright-grounds-type', 'mandatory');
    const response = await app.postJson(MAKE, json(page.body('SUBMIT_FOR_REVIEW')));
    expect(response.status).toBe(200);
    const { redirectUrl } = JSON.parse(response.text);
    expect((await app.get(redirectUrl)).text).toContain('Order sent to caseworker for review');
    expect(submittedOrders()).toHaveLength(1);
  });

  it('returns the reloaded conflict page and a fresh event token when an order changed elsewhere', async () => {
    app = await bootApp();
    const page = await openPage((await app.get(MAKE)).text);
    const token = page.body().get('eventToken');
    refuseNextEvent('The draft changed elsewhere');
    const response = await app.postJson(MAKE, json(page.body('SAVE_DRAFT')));
    expect(response.status).toBe(422);
    await openPage(response.text);
    expect(control('[name="eventToken"]').value).toBe(`event-token-${eventStarts()}`);
    expect(control('[name="eventToken"]').value).not.toBe(token);
    expect(document.body.textContent).toContain('The draft changed elsewhere');
  });

  it('keeps the feature flag on JSON POSTs', async () => {
    app = await bootApp({ makeOrderEnabled: false });
    expect((await app.postJson(MAKE, { action: 'SAVE_DRAFT' })).status).toBe(404);
    expect(submittedOrders()).toHaveLength(0);
  });

  it('keeps the normal JSON body limit outside the two document pages', async () => {
    app = await bootApp({ caseworker: true });
    expect((await app.postJson(`${BASE}/review-dates`, { description: 'x'.repeat(110_000) })).status).toBe(413);
  });

  it('supports the caseworker journey, repeated parties, date actions and final issue over JSON', async () => {
    app = await bootApp({ caseworker: true, order: { orderType: 'FREE_FORM', formData: {} } });
    await app.get(`${BASE}?orderId=review-order`);
    const page = await openPage((await app.get(REVIEW)).text);
    recordAttendance();
    const response = await app.postJson(REVIEW, json(page.body('ISSUE')));
    expect(JSON.parse(response.text)).toEqual({ redirectUrl: `${BASE}/review-dates` });
    const add = await app.postJson(`${BASE}/review-dates`, { action: 'add', 'has-review-dates': 'yes' });
    expect(JSON.parse(add.text)).toEqual({ redirectUrl: `${BASE}/review-dates#review-date-2` });
    expect((await app.get(`${BASE}/review-dates`)).text).toContain('review-date-2-date-day');
    expect(
      JSON.parse((await app.postJson(`${BASE}/review-dates`, { action: 'remove-2', 'has-review-dates': 'yes' })).text)
    ).toEqual({ redirectUrl: `${BASE}/review-dates` });
    await app.postJson(`${BASE}/review-dates`, { action: 'continue', 'has-review-dates': 'no' });
    const proceed = await app.postJson(`${BASE}/proceed-to-issue`, {
      'next-steps': 'complete',
      'final-order': 'no',
      'serve-all-parties': 'no',
      'parties-to-serve': ['claimant-id', 'defendant-id'],
      seal: 'COUNTY_COURT',
      action: 'continue',
    });
    expect(JSON.parse(proceed.text)).toEqual({ redirectUrl: `${BASE}/check-your-answers` });
    const issue = await app.postJson(`${BASE}/check-your-answers`, { action: 'continue' });
    expect(JSON.parse(issue.text)).toEqual({ redirectUrl: `${BASE}/confirmed` });
    expect(JSON.stringify(submittedReviews())).toContain('claimant-id');
    expect(JSON.stringify(submittedReviews())).toContain('defendant-id');
  });

  it('redirects a JSON POST without a review in progress back to the introduction', async () => {
    app = await bootApp({ caseworker: true });
    const response = await app.postJson(REVIEW, { action: 'ISSUE' });
    expect(JSON.parse(response.text)).toEqual({ redirectUrl: BASE });
  });

  it('posts the clicked action, checkbox arrays and CSRF header, prevents duplicates and displays server validation', async () => {
    app = await bootApp();
    await openPage((await app.get(MAKE)).text);
    writeInPreview('Edited wording — café £100');
    check('outright-options', 'money-judgment');
    check('outright-options', 'use-occupation');
    const expectedDocument = control<HTMLTextAreaElement>('#order-document').value;
    // jsdom has no fetch; bridge to Node's real HTTP fetch and the running Express slice.
    const nodeFetch = runInThisContext('fetch') as typeof fetch;
    const oldFetch = globalThis.fetch;
    let finish!: () => void;
    const finished = new Promise<void>(resolve => (finish = resolve));
    let calls = 0;
    let sent: RequestInit | undefined;
    globalThis.fetch = async (url, options) => {
      calls++;
      sent = options;
      const response = await nodeFetch(new URL(new URL(String(url), window.location.href).pathname, app.url), options);
      finish();
      return response;
    };
    try {
      let stoppedOldPage = false;
      initOrderSubmissions(() => (stoppedOldPage = true));
      const form = control<HTMLFormElement>('#make-order-form');
      const button = control<HTMLButtonElement>('[value="SUBMIT_FOR_REVIEW"]');
      form.requestSubmit(button);
      form.requestSubmit(button);
      await finished;
      // Wait for the response's HTML stream and the document replacement.
      for (let n = 0; n < 100 && !document.querySelector('.govuk-error-summary'); n++) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(calls).toBe(1);
      expect(stoppedOldPage).toBe(true);
      expect(sent?.headers).toEqual({ 'Content-Type': 'application/json', 'x-csrf-token': 'csrf-test' });
      expect(JSON.parse(sent!.body as string)).toMatchObject({
        action: 'SUBMIT_FOR_REVIEW',
        'outright-options': ['money-judgment', 'use-occupation'],
      });
      expect(document.querySelector('.govuk-error-summary')).not.toBeNull();
      expect(control<HTMLTextAreaElement>('#order-document').value).toBe(expectedDocument);
      expect(document.querySelector('form[data-order-json]')).not.toBeNull();
      expect(submittedOrders()).toHaveLength(0);
    } finally {
      globalThis.fetch = oldFetch;
    }
  });
});
