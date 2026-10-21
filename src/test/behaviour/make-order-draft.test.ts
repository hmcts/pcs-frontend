import {
  CASE_REFERENCE,
  MANAGE_CASE_URL,
  type TestApp,
  bootApp,
  check,
  control,
  eventStarts,
  futureDate,
  openPage,
  recordAttendance,
  refuseNextEvent,
  selectTab,
  submittedEventTokens,
  submittedOrders,
  type,
  writeInPreview,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;

describe('make an order: drafting', () => {
  let app: TestApp;
  beforeEach(async () => {
    app = await bootApp();
  });
  afterEach(() => app.close());

  it('rejects an incomplete order for review but saves it as a draft and restores it', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    type('hearing-notes', 'Defendant asked for time to pay');
    check('outright-options', 'transfer-high-court');

    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    await openPage(rejected.text);
    // The summary keeps the focus GOV.UK gives it, so the errors are read out.
    expect(document.activeElement).toBe(control('#make-order-error-summary'));
    const summary = control('#make-order-error-summary').textContent;
    expect(summary).toContain('Select when the defendant must give up possession');
    expect(summary).toContain('Select mandatory or discretionary grounds');
    expect(control('#outright-possession-error').textContent).toContain('give up possession');
    expect(control<HTMLTextAreaElement>('[name="hearing-notes"]').value).toBe('Defendant asked for time to pay');

    body.set('action', 'SAVE_DRAFT');
    const saved = await app.post(PAGE, body);
    expect(saved.status).toBe(302);
    expect(saved.location).toBe(MANAGE_CASE_URL);

    const restored = await openPage((await app.get(PAGE)).text);
    expect(control<HTMLTextAreaElement>('[name="hearing-notes"]').value).toBe('Defendant asked for time to pay');
    expect(control('[name="outright-options"][value="transfer-high-court"]').checked).toBe(true);
    expect(restored.orderText()).toContain(
      'The order for possession is transferred to the High Court solely for the purpose of enforcement.'
    );
  });

  it('saves without posting the case context JSON that the WAF blocks', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    const body = page.body('SAVE_DRAFT');
    expect(body.has('caseContext')).toBe(false);
    expect((await app.post(PAGE, body)).location).toBe(MANAGE_CASE_URL);
  });

  it('uses the original case to validate attendance even if the browser posts different parties', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    const body = page.body('SUBMIT_FOR_REVIEW');
    body.set('caseContext', JSON.stringify({ claimants: [], defendants: [] }));
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Select how Claimant 1: Example Housing attended');
    expect(submittedEventTokens()).toEqual([]);
  });

  it('uses the original order identity and version rather than hidden browser values', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    const body = page.body('SAVE_DRAFT');
    body.set('orderVersion', '999');
    body.set('orderId', 'another-order');
    expect((await app.post(PAGE, body)).status).toBe(302);
    expect(submittedOrders().at(-1)).toMatchObject({ order: { id: null, version: 0 } });
  });

  it('saves from each open tab against the start that tab was given', async () => {
    const first = await openPage((await app.get(PAGE)).text);
    const firstBody = first.body('SAVE_DRAFT');
    const second = await openPage((await app.get(PAGE)).text);
    const secondBody = second.body('SAVE_DRAFT');
    expect(secondBody.get('eventToken')).not.toBe(firstBody.get('eventToken'));
    expect((await app.post(PAGE, firstBody)).status).toBe(302);
    expect((await app.post(PAGE, secondBody)).status).toBe(302);
    expect(submittedEventTokens()).toEqual([firstBody.get('eventToken'), secondBody.get('eventToken')]);
  });

  it("preserves edits and asks for confirmation when the page's start was already used", async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    type('hearing-notes', 'Keep these notes');
    writeInPreview('The parties shall exchange evidence within fourteen days.');
    const body = page.body('SAVE_DRAFT');
    // A start is cleared once it is submitted, so submitting it again from a stale page is refused.
    expect((await app.post(PAGE, body)).status).toBe(302);
    const expired = await app.post(PAGE, body);
    expect(expired.status).toBe(409);
    expect(submittedEventTokens()).toHaveLength(1);
    const retry = await openPage(expired.text);
    expect(control('#make-order-error-summary').textContent).toContain('Check your order and try again');
    expect(control('[name="hearing-notes"]').value).toBe('Keep these notes');
    expect(retry.documentText()).toContain('The parties shall exchange evidence within fourteen days.');
    expect(retry.body().get('eventToken')).not.toBe(body.get('eventToken'));
    expect((await app.post(PAGE, retry.body('SAVE_DRAFT'))).status).toBe(302);
  });

  it('does not submit an unknown or previously completed start', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    const unknown = page.body('SAVE_DRAFT');
    unknown.set('eventToken', 'unknown-start');
    const recovered = await app.post(PAGE, unknown);
    expect(recovered.status).toBe(409);
    expect(submittedEventTokens()).toEqual([]);
    const retry = (await openPage(recovered.text)).body('SAVE_DRAFT');
    expect((await app.post(PAGE, retry)).status).toBe(302);
    expect((await app.post(PAGE, retry)).status).toBe(409);
    expect(submittedEventTokens()).toHaveLength(1);
  });

  it('remembers the selected order type and its document', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-suspended');
    type('suspended-arrears', '900');
    selectTab('tab-outright');
    selectTab('tab-suspended');
    const documentField = control<HTMLTextAreaElement>('#order-document');
    expect(JSON.parse(documentField.value).schema).toBe('docweave-document');

    const body = page.body();
    body.set('action', 'SAVE_DRAFT');
    expect((await app.post(PAGE, body)).status).toBe(302);

    await openPage((await app.get(PAGE)).text);
    expect(control('#order-type').value).toBe('SUSPENDED_POSSESSION');
    expect(control('.govuk-tabs__list-item--selected a').textContent).toContain('Suspended possession');
    // The tab opens without leaving a fragment the browser would scroll to once the page loads.
    expect(window.location.hash).toBe('');
    expect(control('[name="suspended-arrears"]').value).toBe('900');
    expect(JSON.parse(control<HTMLTextAreaElement>('#order-document').value).schema).toBe('docweave-document');
  });

  it('refuses an order document that Docweave could not have produced', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    const body = page.body();
    body.set('action', 'SAVE_DRAFT');
    body.set('orderDocument', '{"schema":"docweave-document","version":1}');

    expect((await app.post(PAGE, body)).status).toBe(400);
    expect(submittedOrders()).toHaveLength(0);
  });

  it("starts the event when the page loads, and submits the judge's change with that start", async () => {
    const page = await openPage((await app.get(PAGE)).text);
    expect(eventStarts()).toBe(1);
    const token = control('[name="eventToken"]').value;
    expect(token).toBe('event-token-1');

    // Neither a rejected nor an accepted submission starts the event again.
    selectTab('tab-free-form');
    const incomplete = page.body();
    incomplete.set('action', 'SUBMIT_FOR_REVIEW');
    const invalid = await app.post(PAGE, incomplete);
    expect(invalid.status).toBe(400);
    const retry = await openPage(invalid.text);
    expect(control('[name="eventToken"]').value).toBe(token);
    expect(control('#make-order-error-summary').textContent).toContain(
      'Select how Claimant 1: Example Housing attended'
    );

    recordAttendance();
    const body = retry.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(PAGE, body)).status).toBe(302);
    expect(eventStarts()).toBe(1);
    expect(submittedEventTokens()).toEqual(['event-token-1']);
  });

  it('shows the saved order, and why, when pcs-api refuses a save', async () => {
    const saved = await openPage((await app.get(PAGE)).text);
    type('hearing-notes', 'Saved earlier');
    const first = saved.body();
    first.set('action', 'SAVE_DRAFT');
    expect((await app.post(PAGE, first)).status).toBe(302);

    const page = await openPage((await app.get(PAGE)).text);
    type('hearing-notes', 'Typed since');
    const body = page.body();
    body.set('action', 'SAVE_DRAFT');
    refuseNextEvent('The order draft has been updated by another user. Reload it and try again');
    const refused = await app.post(PAGE, body);
    expect(refused.status).toBe(422);

    // The refused page is based on a new start, which the judge's next change is submitted with.
    expect(body.get('eventToken')).toBe(submittedEventTokens().at(-1));
    await openPage(refused.text);
    expect(control('[name="eventToken"]').value).toBe(`event-token-${eventStarts()}`);
    expect(control('[name="eventToken"]').value).not.toBe(body.get('eventToken'));
    expect(control('#make-order-error-summary').textContent).toContain(
      'The order draft has been updated by another user. Reload it and try again'
    );
    expect(control<HTMLTextAreaElement>('[name="hearing-notes"]').value).toBe('Saved earlier');
  });

  it('keeps the original start when review validation fails', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    const incomplete = page.body('SUBMIT_FOR_REVIEW');
    const invalid = await app.post(PAGE, incomplete);
    expect(invalid.status).toBe(400);
    const retry = (await openPage(invalid.text)).body('SAVE_DRAFT');
    expect(retry.get('eventToken')).toBe(incomplete.get('eventToken'));
    expect((await app.post(PAGE, retry)).status).toBe(302);
    expect(submittedOrders().at(-1)).toMatchObject({ order: { version: 0 } });
  });

  it('saves a long order', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    // The wording goes once into the document now, rather than also in a text box.
    const wording = 'The parties shall exchange evidence within fourteen days. '.repeat(2000).trim();
    writeInPreview(wording);

    const body = page.body();
    body.set('action', 'SAVE_DRAFT');
    // Well past the 100kb that the application's other forms are held to.
    expect(body.toString().length).toBeGreaterThan(100 * 1024);
    expect((await app.post(PAGE, body)).status).toBe(302);

    const reopened = await openPage((await app.get(PAGE)).text);
    expect(reopened.documentText()).toContain(wording);
  });

  it('offers quick dates and a collapsible case facts panel', async () => {
    await openPage((await app.get(PAGE)).text);
    check('outright-possession', 'by');
    control<HTMLButtonElement>('#outright-by-date-pills [data-date-pill-days="28"]').click();
    const inFourWeeks = futureDate(28);
    expect(control('[name="outright-by-date-day"]').value).toBe(inFourWeeks.day);
    expect(control('[name="outright-by-date-month"]').value).toBe(inFourWeeks.month);
    expect(control('[name="outright-by-date-year"]').value).toBe(inFourWeeks.year);

    type('outright-mj-lump-date-day', '2w');
    const inTwoWeeks = futureDate(14);
    expect(control('[name="outright-mj-lump-date-day"]').value).toBe(inTwoWeeks.day);
    expect(control('[name="outright-mj-lump-date-month"]').value).toBe(inTwoWeeks.month);

    const toggle = control<HTMLButtonElement>('[data-case-facts-toggle]');
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(control('#case-facts-content').hidden).toBe(true);
    toggle.click();
    expect(control('#case-facts-content').hidden).toBe(false);
  });
});
