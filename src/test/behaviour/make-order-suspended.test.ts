import {
  CASE_REFERENCE,
  MANAGE_CASE_URL,
  type TestApp,
  bootApp,
  check,
  control,
  futureDate,
  openPage,
  selectTab,
  type,
  typeDate,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;

describe('make an order: suspended possession', () => {
  let app: TestApp;
  beforeEach(async () => {
    app = await bootApp();
  });
  afterEach(() => app.close());

  it('suspends possession, the money judgment and costs on payment terms', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    const column = control('[data-suspended-costs-column]');
    expect(column.hidden).toBe(true);

    selectTab('tab-suspended');
    expect(control('#order-type').value).toBe('SUSPENDED_POSSESSION');
    expect(column.hidden).toBe(false);
    const fortnight = futureDate(14);
    expect(control('[name="suspended-by-date-day"]').value).toBe(fortnight.day);
    expect(control('[name="suspended-by-date-month"]').value).toBe(fortnight.month);
    expect(control('[name="suspended-by-date-year"]').value).toBe(fortnight.year);

    typeDate('suspended-by-date', '1', '12', '2026');
    type('suspended-arrears', '1200');
    check('suspended-payment-terms', 'instalments');
    type('suspended-instalment-amount', '100');
    typeDate('suspended-instalment-date', '1', '11', '2026');
    check('suspended-options', 'money-judgment-arrears');
    check('suspended-mj-same-terms', 'yes');
    check('suspended-options', 'warrant-on-notice');
    check('costs', 'yes');
    check('costs-choice', 'fixed-same-terms');
    type('costs-fixed-same-terms-amount', '250');

    expect(page.orderText()).toBe(
      [
        'IT IS ORDERED THAT:',
        'The defendant must give up possession of 10 Test Street, Bristol, BS1 1AA to the claimant on or before 1 December 2026.',
        'Judgment for the claimant in the sum of £1,200.00.',
        "The defendant shall pay the claimant's costs of the claim in the fixed sum of £250.00.",
        'Execution of the order for possession, enforcement of the money judgment and enforcement of any order for costs are suspended as long as the defendant pays (i) the rent as it falls due plus (ii) the arrears of £1,200.00 by payments of £100.00 to the claimant every month, the first instalment to be paid on or before 1 November 2026.',
        'Payment of the above instalments made to the claimant shall be applied first to any arrears prior to any order for costs.',
        'This order shall not be enforceable once the total of the sums awarded above have been paid.',
        'Any application for a warrant of possession must be heard on notice to all parties unless the court orders otherwise.',
      ].join('\n')
    );

    // Adding a one-off payment lists the terms instead.
    check('suspended-payment-terms', 'one-off');
    type('suspended-oneoff-amount', '500');
    typeDate('suspended-oneoff-date', '1', '10', '2026');
    expect(page.orderText()).toContain(
      [
        'the arrears of £1,200.00 by:',
        'payment of £500.00 to the claimant by 1 October 2026;',
        'payments of £100.00 to the claimant every month, the first instalment to be paid on or before 1 November 2026;',
      ].join('\n')
    );

    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const submitted = await app.post(PAGE, body);
    expect(submitted.status).toBe(302);
    expect(submitted.location).toBe(MANAGE_CASE_URL);
    page.dispose();
  });

  it('treats a money judgment and an adjourned money claim as alternatives', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-suspended');
    const judgment = control('[name="suspended-options"][value="money-judgment-arrears"]');
    const adjourned = control('[name="suspended-options"][value="money-claim-adjourned"]');
    const sameTerms = control('[name="suspended-mj-same-terms"]');
    expect(sameTerms.disabled).toBe(true);

    check('suspended-options', 'money-judgment-arrears');
    expect(sameTerms.disabled).toBe(false);
    check('suspended-mj-same-terms', 'yes');

    check('suspended-options', 'money-claim-adjourned');
    expect(judgment.checked).toBe(false);
    expect(adjourned.checked).toBe(true);
    expect(sameTerms.disabled).toBe(true);
    expect(sameTerms.checked).toBe(false);
    expect(page.orderText()).toContain('The money claim is adjourned generally with liberty to restore.');
    page.dispose();
  });
});
