import {
  CASE_REFERENCE,
  MANAGE_CASE_URL,
  type TestApp,
  bootApp,
  check,
  control,
  openPage,
  type,
  typeDate,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;

describe('make an order: outright possession', () => {
  let app: TestApp;
  afterEach(() => app.close());

  it('is only available to judges', async () => {
    app = await bootApp({ judge: false });
    expect((await app.get(PAGE)).status).toBe(404);
  });

  it('is launched from the Manage Case event link', async () => {
    app = await bootApp();
    const launch = await app.get(`/cases/${CASE_REFERENCE}/event/ext:makeOrder?expected_sub=judge-uid`);
    expect(launch.status).toBe(303);
    expect(launch.location).toBe(PAGE);
  });

  it('starts a blank draft, builds the order from the form and sends it for review', async () => {
    app = await bootApp();
    const response = await app.get(PAGE);
    expect(response.status).toBe(200);
    const page = await openPage(response.text);

    expect(document.querySelector('h1')?.textContent).toContain('Make an order');
    expect(document.body.textContent).toContain('10 Test Street, Bristol, BS1 1AA');
    expect(document.body.textContent).toContain('Example Housing vs Alex Example');
    expect(control('[name="current-rent"]').value).toBe('750');

    check('claimant-claimant-id-attendance', 'solicitor');
    type('claimant-claimant-id-name', 'Sam Solicitor');
    check('defendant-defendant-id-attendance', 'not-present');
    check('outright-possession', 'by');
    typeDate('outright-by-date', '1', '10', '2026');
    check('outright-grounds-type', 'mandatory');
    type('outright-grounds-details', 'Ground 8');
    check('outright-options', 'money-judgment');
    check('outright-mj-sections', 'arrears');
    type('outright-mj-arrears', '2,400');
    type('outright-mj-interest', '100');
    check('outright-mj-sections', 'payment-plan');
    check('outright-mj-plan', 'instalments');
    type('outright-mj-inst-amount', '50');
    type('outright-mj-inst-freq', 'weekly');
    typeDate('outright-mj-inst-date', '8', '10', '2026');
    check('costs', 'yes');
    check('costs-choice', 'def-pay-cl-fixed');
    type('costs-def-pay-cl-fixed-amount', '300');

    expect(page.orderText()).toBe(
      [
        'The Court heard from Sam Solicitor, solicitor for the claimant.',
        'The Defendant 1: Alex Example did not attend the hearing, but the Court was satisfied they had received notice of the hearing, and it was reasonable to proceed in their absence.',
        'IT IS ORDERED THAT:',
        'The defendant(s) must give up possession of 10 Test Street, Bristol, BS1 1AA to the claimant(s) on or before 1 October 2026.',
        'This order for possession was made on mandatory grounds, namely Ground 8.',
        'Judgment for the claimant(s) in the total sum of £2,500.00.',
        "The defendant(s) must pay the claimant(s)' fixed costs of £300.00.",
        'The above sums must be paid by the defendant(s) to the claimant(s) by instalment payments of £50.00 every week, the first instalment to be paid on or before 8 October 2026.',
      ].join('\n')
    );

    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const submitted = await app.post(PAGE, body);
    expect(submitted.status).toBe(302);
    expect(submitted.location).toBe(MANAGE_CASE_URL);
    page.dispose();
  });
});
