import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  check,
  openPage,
  recordAttendance,
  selectTab,
  type,
  uncheck,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;

describe('make an order: free form and strike out', () => {
  let app: TestApp;
  beforeEach(async () => {
    app = await bootApp();
  });
  afterEach(() => app.close());

  it('leaves the order itself for the judge to write in the preview', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    expect(document.querySelector('#tab-free-form textarea')).toBeNull();
    check('recitals', 'yes');
    type('recitals-text', 'UPON hearing the parties');
    expect(page.orderText()).toBe(['UPON hearing the parties', 'IT IS ORDERED THAT:'].join('\n'));

    // Nothing needs writing before review; the caseworker reviews what the judge wrote.
    recordAttendance();
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(PAGE, body)).status).toBe(302);
  });

  it('includes the costs order, and needs a complete one before review', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    check('costs', 'yes');

    const noChoice = page.body();
    noChoice.set('action', 'SUBMIT_FOR_REVIEW');
    const unchosen = await app.post(PAGE, noChoice);
    expect(unchosen.status).toBe(400);
    expect(unchosen.text).toContain('Select a costs order');

    check('costs-choice', 'other');
    const noWording = page.body();
    noWording.set('action', 'SUBMIT_FOR_REVIEW');
    const unworded = await app.post(PAGE, noWording);
    expect(unworded.status).toBe(400);
    expect(unworded.text).toContain('Enter the costs order');

    check('costs-choice', 'def-pay-cl-fixed');
    type('costs-def-pay-cl-fixed-amount', '250');
    expect(page.orderText()).toBe(
      [
        'IT IS ORDERED THAT:',
        "The defendant shall pay the claimant's costs of the claim in the fixed sum of £250.00.",
      ].join('\n')
    );
    expect(page.documentText()).toBe(page.orderText());

    recordAttendance();
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(PAGE, body)).status).toBe(302);
  });

  it('requires a strike out or dismissal outcome before review', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-strike-out');

    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Select whether the claim is struck out or dismissed');
  });

  it('orders the claim struck out', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-strike-out');
    check('strike-claim-outcome', 'struck-out');
    expect(page.orderText()).toBe(['IT IS ORDERED THAT:', 'The claim is struck out.'].join('\n'));
  });

  it('offers only the claim when the case has no open counterclaim or application', async () => {
    await openPage((await app.get(PAGE)).text);
    expect([...document.querySelectorAll<HTMLInputElement>('[name="strike-subjects"]')].map(box => box.value)).toEqual([
      'claim',
    ]);
  });

  it('strikes out or dismisses the claim, counterclaim and application together', async () => {
    await app.close();
    app = await bootApp({ openCounterclaim: true, openApplication: true });
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-strike-out');
    check('strike-claim-outcome', 'struck-out');
    check('strike-subjects', 'counterclaim');
    check('strike-counterclaim-outcome', 'dismissed');
    check('strike-subjects', 'application');
    expect(page.orderText()).toBe(
      [
        'IT IS ORDERED THAT:',
        'The claim is struck out.',
        'The counterclaim is dismissed.',
        'The application is dismissed.',
      ].join('\n')
    );

    uncheck('strike-subjects', 'claim');
    uncheck('strike-subjects', 'application');
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    body.delete('strike-counterclaim-outcome');
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Select whether the counterclaim is struck out or dismissed');
  });

  it('dismisses the claim with its costs order, and saves that document', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-strike-out');
    check('strike-claim-outcome', 'dismissed');
    check('costs', 'yes');
    check('costs-choice', 'reserved');
    expect(page.orderText()).toBe(['IT IS ORDERED THAT:', 'The claim is dismissed.', 'Costs reserved.'].join('\n'));

    const body = page.body();
    body.set('action', 'SAVE_DRAFT');
    expect((await app.post(PAGE, body)).status).toBe(302);
    const reopened = await openPage((await app.get(PAGE)).text);
    expect(reopened.documentText()).toBe(
      ['IT IS ORDERED THAT:', 'The claim is dismissed.', 'Costs reserved.'].join('\n')
    );

    recordAttendance();
    const submission = reopened.body();
    submission.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(PAGE, submission)).status).toBe(302);
  });
});
