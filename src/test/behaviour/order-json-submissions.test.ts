import { runInThisContext } from 'node:vm';

import { initOrderSubmissions } from '../../main/assets/js/order-submissions';

import {
  CASE_REFERENCE,
  MANAGE_CASE_URL,
  type TestApp,
  bootApp,
  check,
  control,
  openPage,
  recordAttendance,
  refuseNextEvent,
  selectTab,
  submittedOrders,
  submittedReviews,
  type,
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

  it('restarts a stale caseworker review with its order and task rather than reusing the old event', async () => {
    app = await bootApp({ caseworker: true, order: { id: 'order-1', orderType: 'FREE_FORM', formData: {} } });
    const intro = `${BASE}?orderId=order-1&taskId=task-1`;
    await app.get(intro);
    const page = await openPage((await app.get(REVIEW)).text);
    check('send-query', 'yes');
    type('query-to-judge', 'Please check this order');
    refuseNextEvent('The order changed elsewhere');
    const response = await app.postJson(REVIEW, json(page.body('RETURN_TO_JUDGE')));
    expect(response.status).toBe(422);
    expect(JSON.parse(response.text)).toEqual({
      errors: [{ id: 'confirm-order-review-form', message: 'The order changed elsewhere' }],
      reloadUrl: intro,
    });
  });

  it('posts the clicked action, checkbox arrays and CSRF token, prevents duplicates and displays server validation', async () => {
    app = await bootApp();
    await openPage((await app.get(MAKE)).text);
    writeInPreview('Edited wording — café £100');
    check('outright-options', 'money-judgment');
    check('outright-options', 'use-occupation');
    const originalForm = control<HTMLFormElement>('#make-order-form');
    const editor = control<HTMLElement>('#order-editor');
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
      initOrderSubmissions();
      const form = control<HTMLFormElement>('#make-order-form');
      const button = control<HTMLButtonElement>('[value="SUBMIT_FOR_REVIEW"]');
      form.requestSubmit(button);
      form.requestSubmit(button);
      await finished;
      // Wait for JSON validation to update the mounted page.
      for (let n = 0; n < 100 && !document.querySelector('.govuk-error-summary'); n++) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(calls).toBe(1);
      expect(control<HTMLFormElement>('#make-order-form')).toBe(originalForm);
      expect(control<HTMLElement>('#order-editor')).toBe(editor);
      expect(button.disabled).toBe(false);
      expect(document.activeElement).toBe(document.querySelector('.govuk-error-summary'));
      expect(control('#claimant-claimant-id-attendance').getAttribute('aria-describedby')).toContain(
        '-attendance-error'
      );
      expect(sent?.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(JSON.parse(sent!.body as string)).toMatchObject({
        _csrf: 'csrf-test',
        action: 'SUBMIT_FOR_REVIEW',
        'outright-options': ['money-judgment', 'use-occupation'],
      });
      expect(document.querySelector('.govuk-error-summary')).not.toBeNull();
      expect(control<HTMLTextAreaElement>('#order-document').value).toBe(expectedDocument);
      expect(document.querySelector('form[data-order-json]')).not.toBeNull();
      expect(submittedOrders()).toHaveLength(0);

      recordAttendance();
      check('outright-options', 'money-judgment', false);
      check('outright-options', 'use-occupation', false);
      check('outright-possession', 'forthwith');
      check('outright-grounds-type', 'mandatory');
      refuseNextEvent('The draft changed elsewhere');
      form.requestSubmit(button);
      for (let n = 0; n < 100 && !document.querySelector(`.govuk-error-summary a[href="${MAKE}"]`); n++) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(document.querySelector('.govuk-error-summary')?.textContent).toContain('The draft changed elsewhere');
      expect(document.querySelector('.govuk-error-summary a')?.textContent).toContain('discards unsaved changes');
      expect(button.disabled).toBe(true);
      expect(control<HTMLFormElement>('#make-order-form')).toBe(originalForm);
    } finally {
      globalThis.fetch = oldFetch;
    }
  });
});
