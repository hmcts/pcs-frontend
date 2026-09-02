/**
 * @jest-environment jsdom
 */

jest.mock('@hmcts-cft/docweave', () => {
  const inline = (content: string | ((builder: unknown) => void)): string => {
    if (typeof content === 'string') {
      return content;
    }
    let text = '';
    const builder = {
      text: (value: string) => {
        text += value;
        return builder;
      },
      generatedText: (_id: string, value: string) => {
        text += value;
        return builder;
      },
    };
    content(builder);
    return text;
  };
  const orderedList = (id: string, define: (builder: unknown) => void) => {
    const items: { id: string; text: string; nested: unknown[] }[] = [];
    define({
      item: (itemId: string, content: string | ((builder: unknown) => void), defineItem?: (item: unknown) => void) => {
        const nested: unknown[] = [];
        defineItem?.({
          orderedList: (nestedId: string, defineNested: (builder: unknown) => void) =>
            nested.push(orderedList(nestedId, defineNested)),
        });
        items.push({ id: itemId, text: inline(content), nested });
      },
    });
    return { id, items };
  };
  return {
    buildOrder: (define: (order: unknown) => void) => {
      const paragraphs: { id: string; text: string }[] = [];
      const lists: unknown[] = [];
      define({
        paragraph: (id: string, content: string | ((builder: unknown) => void)) =>
          paragraphs.push({ id, text: inline(content) }),
        orderedList: (id: string, defineList: (builder: unknown) => void) => lists.push(orderedList(id, defineList)),
      });
      return { paragraphs, lists };
    },
    createOrderEditor: jest.fn(),
  };
});

import { createOrderEditor } from '@hmcts-cft/docweave';

import {
  buildSuspendedOrder,
  initMakeOrder,
  initSuspendedMoneyOptions,
  syncSuspendedOnlyCosts,
} from '../../../../main/assets/js/make-order';

interface CapturedItem {
  id: string;
  text: string;
  nested: { id: string; items: CapturedItem[] }[];
}

interface CapturedDocument {
  paragraphs: { id: string; text: string }[];
  lists: { id: string; items: CapturedItem[] }[];
}

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
    const generated = buildSuspendedOrder(suspendedForm(['one-off'])) as unknown as CapturedDocument;
    const items = generated.lists[0].items;
    const suspension = items.find(item => item.id === 'suspended-condition');

    expect(suspension?.text).toContain(
      'Execution of the order for possession is suspended as long as the defendant pays (i) the rent as it falls due plus (ii) the arrears of £234.00 by payment of £234.00 to the claimant by 27 May 2026.'
    );
    expect(suspension?.nested).toHaveLength(0);
    expect(items.map(item => item.text)).toContain(
      'Payment of the above instalments made to the claimant shall be applied first to any arrears prior to any order for costs.'
    );
  });

  it('uses nested lettered terms when both payment methods are selected', () => {
    const generated = buildSuspendedOrder(suspendedForm(['one-off', 'instalments'])) as unknown as CapturedDocument;
    const suspension = generated.lists[0].items.find(item => item.id === 'suspended-condition');

    expect(suspension?.text).toMatch(/arrears of £234\.00 by:$/);
    expect(suspension?.nested[0].items.map(item => item.text)).toEqual([
      'payment of £234.00 to the claimant by 27 May 2026;',
      'payments of £25.00 to the claimant every month, the first instalment to be paid on or before 3 June 2026;',
    ]);
    const itemIds = generated.lists.flatMap(list =>
      list.items.flatMap(item => [item.id, ...item.nested.flatMap(nested => nested.items.map(child => child.id))])
    );
    expect(new Set(itemIds).size).toBe(itemIds.length);
    expect(itemIds.every(id => id.startsWith('suspended-'))).toBe(true);
  });

  it('only suspends costs selected as payable on the same terms', () => {
    const form = suspendedForm(['one-off']);
    form.insertAdjacentHTML(
      'beforeend',
      '<input type="checkbox" name="costs" value="yes" checked><input type="radio" name="costs-choice" value="def-pay-cl-fixed" checked><input name="costs-def-pay-cl-fixed-amount" value="100">'
    );

    let generated = buildSuspendedOrder(form) as unknown as CapturedDocument;
    let suspension = generated.lists[0].items.find(item => item.id === 'suspended-condition');
    expect(suspension?.text).toMatch(/^Execution of the order for possession is suspended/);

    form.querySelector<HTMLInputElement>('input[name="costs-choice"]')!.value = 'fixed-same-terms';
    form.insertAdjacentHTML('beforeend', '<input name="costs-fixed-same-terms-amount" value="125">');
    generated = buildSuspendedOrder(form) as unknown as CapturedDocument;
    suspension = generated.lists[0].items.find(item => item.id === 'suspended-condition');
    expect(suspension?.text).toMatch(
      /^Execution of the order for possession and enforcement of any order for costs are suspended/
    );
    expect(generated.lists[0].items.find(item => item.id === 'suspended-costs')?.text).toContain('£125.00');
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

describe('suspended tab selection', () => {
  it('uses the suspended builder when the page is opened with the suspended hash', () => {
    jest.mocked(createOrderEditor).mockReset();
    window.history.replaceState(null, '', '#tab-suspended');
    document.body.innerHTML = `
      <form id="make-order-form" data-property-address="10 Test Street" data-claimant-count="1" data-defendant-count="1">
        <input id="order-type" value="OUTRIGHT_POSSESSION">
        <textarea id="order-document">null</textarea>
        <a href="#tab-outright" data-order-type="OUTRIGHT_POSSESSION">Outright possession</a>
        <a href="#tab-suspended" data-order-type="SUSPENDED_POSSESSION">Suspended possession</a>
        <div id="order-preview-editor"><div id="order-editor"></div></div>
        <p id="order-preview-unavailable"></p>
        <button id="submit-order-for-review"></button>
      </form>
    `;
    const render = jest.fn();
    jest.mocked(createOrderEditor).mockReturnValue({
      render,
      getDocument: jest.fn(() => ({ schema: 'docweave-document' })),
    } as never);

    initMakeOrder();

    expect(document.querySelector<HTMLInputElement>('#order-type')?.value).toBe('SUSPENDED_POSSESSION');
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({ lists: [expect.objectContaining({ id: 'suspended-clauses' })] })
    );
    expect(document.querySelector<HTMLButtonElement>('#submit-order-for-review')?.disabled).toBe(false);
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('recreates the editor with only the selected tab document', () => {
    jest.mocked(createOrderEditor).mockReset();
    window.history.replaceState(null, '', '#tab-outright');
    document.body.innerHTML = `
      <form id="make-order-form" data-property-address="10 Test Street" data-claimant-count="1" data-defendant-count="1">
        <input id="order-type" value="OUTRIGHT_POSSESSION">
        <textarea id="order-document">null</textarea>
        <a href="#tab-outright" data-order-type="OUTRIGHT_POSSESSION">Outright possession</a>
        <a href="#tab-suspended" data-order-type="SUSPENDED_POSSESSION">Suspended possession</a>
        <div id="order-preview-editor"><div id="order-editor"></div></div>
        <p id="order-preview-unavailable"></p>
        <button id="submit-order-for-review"></button>
      </form>
    `;
    const outrightEdited = { schema: 'docweave-document', current: { type: 'doc', tab: 'outright' } };
    const suspendedEdited = { schema: 'docweave-document', current: { type: 'doc', tab: 'suspended' } };
    const first = { render: jest.fn(), getDocument: jest.fn(() => outrightEdited), destroy: jest.fn() };
    const second = { render: jest.fn(), getDocument: jest.fn(() => suspendedEdited), destroy: jest.fn() };
    const third = { render: jest.fn(), getDocument: jest.fn(() => outrightEdited), destroy: jest.fn() };
    jest
      .mocked(createOrderEditor)
      .mockReturnValueOnce(first as never)
      .mockReturnValueOnce(second as never)
      .mockReturnValueOnce(third as never);

    initMakeOrder();
    document.querySelector<HTMLAnchorElement>('a[href="#tab-suspended"]')!.click();
    document.querySelector<HTMLAnchorElement>('a[href="#tab-outright"]')!.click();

    expect(first.destroy).toHaveBeenCalled();
    expect(second.destroy).toHaveBeenCalled();
    expect(jest.mocked(createOrderEditor).mock.calls[1][0].initialDocument).toBeUndefined();
    expect(jest.mocked(createOrderEditor).mock.calls[2][0].initialDocument).toBe(outrightEdited);
    expect(JSON.parse(document.querySelector<HTMLTextAreaElement>('#order-document')!.value)).toEqual(outrightEdited);
    window.history.replaceState(null, '', window.location.pathname);
  });
});
