import {
  CASE_REFERENCE,
  MANAGE_CASE_URL,
  type TestApp,
  bootApp,
  check,
  openPage,
  recordAttendance,
  selectTab,
  submittedEventTokens,
  type,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;
const SENT_FOR_REVIEW = `${PAGE}/sent-for-review`;

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

/** Sends a complete free-form order for review, as the judge would from the make order page. */
async function sendOrderForReview(app: TestApp, recordOtherAttendance = () => {}) {
  const page = await openPage((await app.get(PAGE)).text);
  selectTab('tab-free-form');
  type('free-form-text', 'The claim is stayed.');
  recordAttendance();
  recordOtherAttendance();
  const body = page.body();
  body.set('action', 'SUBMIT_FOR_REVIEW');
  return app.post(PAGE, body);
}

describe('make an order: sent for review', () => {
  let app: TestApp;
  afterEach(() => app.close());

  it('confirms the order was sent for review, on which case, and returns the judge to it', async () => {
    app = await bootApp();
    const submitted = await sendOrderForReview(app);
    expect(submitted.status).toBe(302);
    expect(submitted.location).toBe(SENT_FOR_REVIEW);

    const confirmation = await app.get(SENT_FOR_REVIEW);
    expect(confirmation.status).toBe(200);
    const page = parse(confirmation.text);
    expect(page.title).toContain('Order sent to caseworker for review');
    // The header renders in a shadow root, which the parsed page does not attach.
    expect(confirmation.text).toContain('xui-header--judicial');
    expect(page.querySelector('.govuk-panel--confirmation h1')?.textContent?.trim()).toBe(
      'Order sent to caseworker for review'
    );
    const caseDetails = page
      .querySelector('.govuk-panel__body span')
      ?.innerHTML.split('<br>')
      .map(line => line.trim());
    expect(caseDetails).toEqual([
      'Case number 1777-0276-0001-7760',
      '10 Test Street, Bristol, BS1 1AA',
      'Example Housing vs Alex Example',
    ]);
    const close = page.querySelector<HTMLAnchorElement>('a.govuk-button');
    expect(close?.textContent?.trim()).toBe('Close and return to case details');
    expect(close?.href).toBe(MANAGE_CASE_URL);
  });

  it('names only the primary defendant', async () => {
    app = await bootApp({
      defendants: [
        { id: 'defendant-id', name: 'Alex Example' },
        { id: 'second-defendant-id', name: 'Sam Example' },
      ],
    });
    const submitted = await sendOrderForReview(app, () =>
      check('defendant-second-defendant-id-attendance', 'not-present')
    );
    expect(submitted.location).toBe(SENT_FOR_REVIEW);

    const page = parse((await app.get(SENT_FOR_REVIEW)).text);
    expect(page.querySelector('.govuk-panel__body')?.textContent).toContain('Example Housing vs Alex Example');
    expect(page.querySelector('.govuk-panel__body')?.textContent).not.toContain('Sam Example');
  });

  it('shows the confirmation again on refresh without sending the order again', async () => {
    app = await bootApp();
    await sendOrderForReview(app);
    expect((await app.get(SENT_FOR_REVIEW)).status).toBe(200);

    expect((await app.get(SENT_FOR_REVIEW)).status).toBe(200);
    expect(submittedEventTokens()).toHaveLength(1);
  });

  it('no longer confirms the order once the judge starts another on the case', async () => {
    app = await bootApp();
    await sendOrderForReview(app);
    await app.get(PAGE);

    const confirmation = await app.get(SENT_FOR_REVIEW);
    expect(confirmation.status).toBe(302);
    expect(confirmation.location).toBe(MANAGE_CASE_URL);
  });

  it('returns the judge to the case when no order has been sent for review', async () => {
    app = await bootApp();
    const confirmation = await app.get(SENT_FOR_REVIEW);
    expect(confirmation.status).toBe(302);
    expect(confirmation.location).toBe(MANAGE_CASE_URL);
  });

  it('does not exist while the make order feature flag is off', async () => {
    app = await bootApp({ makeOrderEnabled: false });
    expect((await app.get(SENT_FOR_REVIEW)).status).toBe(404);
  });
});
