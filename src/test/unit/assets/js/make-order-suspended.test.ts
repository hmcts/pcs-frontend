/**
 * @jest-environment jsdom
 */

import {
  buildSuspendedOrder,
  initSuspendedMoneyOptions,
  syncSuspendedOnlyCosts,
} from '../../../../main/assets/js/make-order';

import { childTexts, findNode } from './docweaveTestUtils';

function suspendedForm(paymentTerms: string[]): HTMLFormElement {
  document.body.innerHTML = `
    <form data-property-address="10 Test Street" data-claimant-count="1" data-defendant-count="1">
      <input name="suspended-by-date-day" value="13">
      <input name="suspended-by-date-month" value="5">
      <input name="suspended-by-date-year" value="2026">
      <input name="suspended-arrears" value="234">
      <input type="checkbox" name="suspended-payment-terms" value="one-off" ${paymentTerms.includes('one-off') ? 'checked' : ''}>
      <input name="suspended-oneoff-amount" value="234">
      <input name="suspended-oneoff-date-day" value="27">
      <input name="suspended-oneoff-date-month" value="5">
      <input name="suspended-oneoff-date-year" value="2026">
      <input type="checkbox" name="suspended-payment-terms" value="instalments" ${paymentTerms.includes('instalments') ? 'checked' : ''}>
      <input name="suspended-instalment-amount" value="25">
      <select name="suspended-instalment-frequency"><option value="monthly" selected>Monthly</option></select>
      <input name="suspended-instalment-date-day" value="3">
      <input name="suspended-instalment-date-month" value="6">
      <input name="suspended-instalment-date-year" value="2026">
    </form>
  `;
  return document.querySelector('form')!;
}

describe('suspended possession order generation', () => {
  it('rolls a single payment into the suspension clause', () => {
    const generated = buildSuspendedOrder(suspendedForm(['one-off']));
    const suspension = findNode(generated, 'item:suspended-condition');

    expect(suspension.firstChild?.textContent).toContain(
      'Execution of the order for possession is suspended as long as the defendant pays (i) the rent as it falls due plus (ii) the arrears of £234.00 by payment of £234.00 to the claimant by 27 May 2026.'
    );
    expect(suspension.childCount).toBe(1);
    expect(childTexts(findNode(generated, 'ordered-list:suspended-clauses'))).toContain(
      'Payment of the above instalments made to the claimant shall be applied first to any arrears prior to any order for costs.'
    );
  });

  it('uses nested lettered terms when both payment methods are selected', () => {
    const generated = buildSuspendedOrder(suspendedForm(['one-off', 'instalments']));
    const suspension = findNode(generated, 'item:suspended-condition');

    expect(suspension.firstChild?.textContent).toMatch(/arrears of £234\.00 by:$/);
    expect(childTexts(findNode(generated, 'ordered-list:suspended-payment-terms'))).toEqual([
      'payment of £234.00 to the claimant by 27 May 2026;',
      'payments of £25.00 to the claimant every month, the first instalment to be paid on or before 3 June 2026;',
    ]);
  });

  it('only suspends costs selected as payable on the same terms', () => {
    const form = suspendedForm(['one-off']);
    form.insertAdjacentHTML(
      'beforeend',
      '<input type="checkbox" name="costs" value="yes" checked><input id="costs-choice" type="radio" name="costs-choice" value="def-pay-cl-fixed" checked><input name="costs-def-pay-cl-fixed-amount" value="100">'
    );

    let generated = buildSuspendedOrder(form);
    let suspension = findNode(generated, 'item:suspended-condition');
    expect(suspension.firstChild?.textContent).toMatch(/^Execution of the order for possession is suspended/);

    form.querySelector<HTMLInputElement>('input[name="costs-choice"]')!.value = 'fixed-same-terms';
    form.insertAdjacentHTML('beforeend', '<input name="costs-fixed-same-terms-amount" value="125">');
    generated = buildSuspendedOrder(form);
    suspension = findNode(generated, 'item:suspended-condition');
    expect(suspension.firstChild?.textContent).toMatch(
      /^Execution of the order for possession and enforcement of any order for costs are suspended/
    );
    expect(findNode(generated, 'item:suspended-costs').textContent).toContain('£125.00');
  });
});

describe('suspended money choices', () => {
  it('keeps money judgment and adjournment exclusive and clears same terms', () => {
    document.body.innerHTML = `
      <form>
        <input type="checkbox" name="suspended-options" value="money-judgment-arrears" data-aria-controls="conditional-money">
        <input type="checkbox" name="suspended-options" value="money-claim-adjourned">
        <div id="conditional-money" class="govuk-checkboxes__conditional govuk-checkboxes__conditional--hidden"></div>
        <input type="checkbox" name="suspended-mj-same-terms" disabled>
      </form>
    `;
    const form = document.querySelector<HTMLFormElement>('form')!;
    const money = form.querySelector<HTMLInputElement>('input[value="money-judgment-arrears"]')!;
    const adjourned = form.querySelector<HTMLInputElement>('input[value="money-claim-adjourned"]')!;
    const sameTerms = form.querySelector<HTMLInputElement>('input[name="suspended-mj-same-terms"]')!;
    initSuspendedMoneyOptions(form);

    money.click();
    sameTerms.click();
    adjourned.click();

    expect(money.checked).toBe(false);
    expect(adjourned.checked).toBe(true);
    expect(sameTerms.checked).toBe(false);
    expect(sameTerms.disabled).toBe(true);
    expect(document.querySelector('#conditional-money')?.classList).toContain('govuk-checkboxes__conditional--hidden');
  });

  it('clears and disables same-terms costs outside suspended possession', () => {
    document.body.innerHTML = `
      <form>
        <div data-suspended-costs-column>
        <input type="radio" name="costs-choice" value="same-terms" checked>
        </div>
        <input type="radio" name="costs-choice" value="reserved">
      </form>
    `;
    const form = document.querySelector<HTMLFormElement>('form')!;
    const sameTerms = form.querySelector<HTMLInputElement>('input[value="same-terms"]')!;
    const suspendedColumn = form.querySelector<HTMLElement>('[data-suspended-costs-column]')!;

    syncSuspendedOnlyCosts(form, 'OUTRIGHT_POSSESSION');
    expect(sameTerms.disabled).toBe(true);
    expect(sameTerms.checked).toBe(false);
    expect(suspendedColumn.hidden).toBe(true);

    syncSuspendedOnlyCosts(form, 'SUSPENDED_POSSESSION');
    expect(sameTerms.disabled).toBe(false);
    expect(suspendedColumn.hidden).toBe(false);
  });
});
