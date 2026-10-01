import { CASE_REFERENCE, type TestApp, bootApp, check, control, openPage, selectTab, type } from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;

describe('make an order: attendance', () => {
  let app: TestApp;
  beforeEach(async () => {
    app = await bootApp();
  });
  afterEach(() => app.close());

  it("needs every party's attendance, and the name of whoever attended for them, before review", async () => {
    let page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    // A rejected order comes back as a new page, with the answers kept.
    const submit = async (): Promise<number> => {
      const body = page.body();
      body.set('action', 'SUBMIT_FOR_REVIEW');
      const response = await app.post(PAGE, body);
      if (response.status === 400) {
        page = await openPage(response.text);
      }
      return response.status;
    };

    expect(await submit()).toBe(400);
    const summary = control('#make-order-error-summary');
    expect(summary.textContent).toContain('Select how Claimant 1: Example Housing attended');
    expect(summary.textContent).toContain('Select how Defendant 1: Alex Example attended');
    // The summary takes the judge to the party's row, which can take focus and describes the error.
    for (const party of ['claimant-claimant-id', 'defendant-defendant-id']) {
      const row = control(`#${party}-attendance`);
      expect(control(`a[href="#${party}-attendance"]`)).toBeTruthy();
      expect(row.tabIndex).toBe(-1);
      expect(control(`#${row.getAttribute('aria-describedby')}`).textContent).toContain('Select how');
    }

    check('claimant-claimant-id-attendance', 'housing-officer');
    check('defendant-defendant-id-attendance', 'letter-only');
    // The name of whoever attended is optional; the order then names their role alone.
    expect(page.orderText()).toContain('The Court heard from the housing officer on behalf of the claimant.');

    type('claimant-claimant-id-name', 'x'.repeat(121));
    expect(await submit()).toBe(400);
    expect(control('#claimant-claimant-id-name-error').textContent).toContain(
      'Name for Claimant 1: Example Housing must be 120 characters or less'
    );

    type('claimant-claimant-id-name', 'Harriet Officer');
    expect(page.orderText()).toContain(
      'The Court heard from Harriet Officer, the housing officer on behalf of the claimant.'
    );
    // The order names the party, not the "Defendant 1:" label the screen shows.
    expect(page.orderText()).toContain('The Court read a letter from Alex Example.');
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const submitted = await app.post(PAGE, body);
    expect(submitted.status).toBe(302);
    expect(submitted.location).toBe(`${PAGE}/sent-for-review`);
  });

  it('only accepts the attendance a party can have', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    const body = page.body();
    // A defendant has no housing officer.
    body.set('claimant-claimant-id-attendance', 'litigant-in-person');
    body.set('defendant-defendant-id-attendance', 'housing-officer');
    body.set('defendant-defendant-id-name', 'Harriet Officer');
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Select how Defendant 1: Alex Example attended');
  });
});
