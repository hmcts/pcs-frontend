import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  check,
  control,
  futureDate,
  openPage,
  recordAttendance,
  selectTab,
  type,
  typeDate,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;
const PAYMENT_CONDITION =
  'The Claimant may not enforce the possession order or any money judgment or costs order suspended on the same terms for as long as the Defendant pays the current rent when it is due and makes the following payments towards the arrears and any sums suspended on those terms:';
const PAID_IN_FULL =
  'Any payments made by the Defendant in addition to the current rent will first reduce the rent arrears and then any costs order suspended on those terms. Once the Defendant has paid all the sums ordered, the Claimant may no longer enforce this order.';

describe('make an order: suspended possession', () => {
  let app: TestApp;
  beforeEach(async () => {
    app = await bootApp();
  });
  afterEach(() => app.close());

  it('links an unchosen payment term to the payment term choices', async () => {
    await openPage((await app.get(PAGE)).text);
    selectTab('tab-suspended');
    const missing = [...document.querySelectorAll<HTMLElement>('[data-generated-text]')].find(
      fact => fact.textContent === '[select a payment term]'
    )!;
    missing.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(control('[name="suspended-payment-terms"][value="one-off"]'));
  });

  it('suspends possession, the money judgment and costs on payment terms', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    const column = control('[data-suspended-costs-column]');
    expect(column.hidden).toBe(true);

    selectTab('tab-suspended');
    expect(control('#order-type').value).toBe('SUSPENDED_POSSESSION');
    expect(document.querySelector('[name="suspended-options"][value="use-occupation"]')).toBeNull();
    expect(document.querySelector('[name="suspended-options"][value="transfer-high-court"]')).toBeNull();
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
        'The Defendant must leave and give up possession of 10 Test Street, Bristol, BS1 1AA to the Claimant on or before 4pm on 1 December 2026.',
        'Judgment is entered for the Claimant against the Defendant in the sum of £1,200.00. Enforcement of the money judgment is suspended on the same terms as the possession order.',
        PAYMENT_CONDITION,
        'payments of £100.00 to the Claimant every month, the first instalment to be paid on or before 1 November 2026;',
        PAID_IN_FULL,
        "The Defendant shall pay the Claimant's costs of the claim in the fixed sum of £250.00. Enforcement of this costs order is suspended on the same terms as the possession order.",
        'Any application for a warrant of possession must be heard on notice to all parties unless the Court orders otherwise.',
      ].join('\n')
    );

    // Looking at another order type and coming back keeps the costs and their suspension.
    const suspendedOrder = page.orderText();
    selectTab('tab-outright');
    expect(control('[name="costs-choice"][value="fixed-same-terms"]').disabled).toBe(true);
    selectTab('tab-suspended');
    expect(control('[name="costs-choice"][value="fixed-same-terms"]').checked).toBe(true);
    expect(page.orderText()).toBe(suspendedOrder);
    expect(page.documentText()).toBe(suspendedOrder);

    // Adding a one-off payment lists the terms instead.
    check('suspended-payment-terms', 'one-off');
    type('suspended-oneoff-amount', '500');
    typeDate('suspended-oneoff-date', '1', '10', '2026');
    expect(page.orderText()).toContain(
      [
        PAYMENT_CONDITION,
        'payment of £500.00 to the Claimant by 1 October 2026;',
        'payments of £100.00 to the Claimant every month, the first instalment to be paid on or before 1 November 2026;',
      ].join('\n')
    );

    recordAttendance();
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const submitted = await app.post(PAGE, body);
    expect(submitted.status).toBe(302);
    expect(submitted.location).toBe(`${PAGE}/sent-for-review`);
  });

  it('takes instalments every week, fortnight or month', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-suspended');
    type('suspended-arrears', '1200');
    check('suspended-payment-terms', 'instalments');
    type('suspended-instalment-amount', '100');
    typeDate('suspended-instalment-date', '1', '11', '2026');
    expect(
      [...control<HTMLSelectElement>('[name="suspended-instalment-frequency"]').options].map(option => option.text)
    ).toEqual(['Weekly', 'Fortnightly', 'Monthly']);

    type('suspended-instalment-frequency', 'fortnightly');
    expect(page.orderText()).toContain(PAYMENT_CONDITION);
    expect(page.orderText()).toContain('payments of £100.00 to the Claimant every fortnight, the first instalment');
    expect(page.orderText()).toContain(PAID_IN_FULL);
    expect(page.orderText()).not.toContain('£1,200.00');

    recordAttendance();
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(PAGE, body)).status).toBe(302);
    body.set('suspended-instalment-frequency', 'yearly');
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Select weekly, fortnightly or monthly instalments');
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
    expect(page.orderText()).toContain(PAYMENT_CONDITION);
    expect(page.orderText()).toContain(PAID_IN_FULL);
    expect(page.orderText()).not.toContain('Enforcement of the money judgment is suspended');
  });
});
