import {
  CASE_REFERENCE,
  MANAGE_CASE_URL,
  type TestApp,
  bootApp,
  check,
  control,
  futureDate,
  openPage,
  refuseNextEvent,
  selectTab,
  type,
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
    expect(control('[name="suspended-arrears"]').value).toBe('900');
    expect(JSON.parse(control<HTMLTextAreaElement>('#order-document').value).schema).toBe('docweave-document');
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

    await openPage(refused.text);
    expect(control('#make-order-error-summary').textContent).toContain(
      'The order draft has been updated by another user. Reload it and try again'
    );
    expect(control<HTMLTextAreaElement>('[name="hearing-notes"]').value).toBe('Saved earlier');
  });

  it('keeps the version the answers were made against when review validation fails', async () => {
    const firstTab = (await app.get(PAGE)).text;

    const secondTab = await openPage((await app.get(PAGE)).text);
    const second = secondTab.body();
    second.set('action', 'SAVE_DRAFT');
    expect((await app.post(PAGE, second)).status).toBe(302);

    const incomplete = (await openPage(firstTab)).body();
    incomplete.set('action', 'SUBMIT_FOR_REVIEW');
    const invalid = await app.post(PAGE, incomplete);
    expect(invalid.status).toBe(400);

    const retry = (await openPage(invalid.text)).body();
    expect(retry.get('orderVersion')).toBe(incomplete.get('orderVersion'));
  });

  it('saves a long order', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    const wording = 'The parties shall exchange evidence within fourteen days. '.repeat(1000).trim();
    type('free-form-text', wording);

    const body = page.body();
    body.set('action', 'SAVE_DRAFT');
    // Well past the 100kb that the application's other forms are held to.
    expect(body.toString().length).toBeGreaterThan(100 * 1024);
    expect((await app.post(PAGE, body)).status).toBe(302);

    const reopened = await openPage((await app.get(PAGE)).text);
    expect(control<HTMLTextAreaElement>('[name="free-form-text"]').value).toBe(wording);
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
