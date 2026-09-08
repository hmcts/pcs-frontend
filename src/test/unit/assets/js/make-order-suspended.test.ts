/**
 * @jest-environment jsdom
 */

import { initSuspendedMoneyOptions, syncSuspendedOnlyCosts } from '../../../../main/assets/js/make-order';
import { buildSuspendedOrder } from '../../../../main/assets/js/make-order/wording/suspended';

import { childTexts, findNode, makeOrderData } from './docweaveTestUtils';

function suspendedData(paymentTerms: string[], additionalAnswers: Record<string, string | string[]> = {}) {
  return makeOrderData(
    {
      'suspended-by-date-day': '13',
      'suspended-by-date-month': '5',
      'suspended-by-date-year': '2026',
      'suspended-arrears': '234',
      'suspended-payment-terms': paymentTerms,
      'suspended-oneoff-amount': '234',
      'suspended-oneoff-date-day': '27',
      'suspended-oneoff-date-month': '5',
      'suspended-oneoff-date-year': '2026',
      'suspended-instalment-amount': '25',
      'suspended-instalment-frequency': 'monthly',
      'suspended-instalment-date-day': '3',
      'suspended-instalment-date-month': '6',
      'suspended-instalment-date-year': '2026',
      ...additionalAnswers,
    },
    { selectedControlIds: { 'costs-choice': 'costs-choice' } }
  );
}

describe('suspended possession order generation', () => {
  it('rolls a single payment into the suspension clause', () => {
    const generated = buildSuspendedOrder(suspendedData(['one-off']));
    const suspension = findNode(generated, 'item:suspended-condition');

    expect(suspension.textContent).toContain(
      'Execution of the order for possession is suspended as long as the defendant pays (i) the rent as it falls due plus (ii) the arrears of £234.00 by payment of £234.00 to the claimant by 27 May 2026.'
    );
    expect(suspension.children).toHaveLength(0);
    expect(findNode(generated, 'suspended-payment-priority').textContent).toBe(
      'Payment of the above instalments made to the claimant shall be applied first to any arrears prior to any order for costs.'
    );
  });

  it('uses nested lettered terms when both payment methods are selected', () => {
    const generated = buildSuspendedOrder(suspendedData(['one-off', 'instalments']));
    const suspension = findNode(generated, 'item:suspended-condition');

    expect(suspension.textContent).toMatch(/arrears of £234\.00 by:$/);
    expect(childTexts(suspension)).toEqual([
      'payment of £234.00 to the claimant by 27 May 2026;',
      'payments of £25.00 to the claimant every month, the first instalment to be paid on or before 3 June 2026;',
    ]);
  });

  it('only suspends costs selected as payable on the same terms', () => {
    let generated = buildSuspendedOrder(
      suspendedData(['one-off'], {
        costs: 'yes',
        'costs-choice': 'def-pay-cl-fixed',
        'costs-def-pay-cl-fixed-amount': '100',
      })
    );
    let suspension = findNode(generated, 'item:suspended-condition');
    expect(suspension.textContent).toMatch(/^Execution of the order for possession is suspended/);

    generated = buildSuspendedOrder(
      suspendedData(['one-off'], {
        costs: 'yes',
        'costs-choice': 'fixed-same-terms',
        'costs-fixed-same-terms-amount': '125',
      })
    );
    suspension = findNode(generated, 'item:suspended-condition');
    expect(suspension.textContent).toMatch(
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
