/**
 * @jest-environment jsdom
 */

import { initDatePills, initMakeOrder } from '../../../../main/assets/js/make-order';

interface OrderDocument {
  generated: Record<string, unknown>;
}

function renderCompleteForm(initialDocument = '', orderType = 'OUTRIGHT_POSSESSION'): void {
  document.body.innerHTML = `
    <form id="make-order-form"
      data-property-address="10 Test Street"
      data-claimants="Example Housing"
      data-defendants="Alex Example">
      <input id="order-type" name="order-type" value="${orderType}">
      <textarea id="order-document">${initialDocument}</textarea>
      <a href="#outright" data-order-type="OUTRIGHT_POSSESSION">Outright</a>
      <a href="#suspended" data-order-type="SUSPENDED_POSSESSION">Suspended</a>

      <div data-attendance-row data-party-kind="claimant" data-party-label="the first claimant">
        <input type="radio" name="attendance-1" value="counsel" checked>
        <input type="text" value="Alex Counsel">
      </div>
      <div data-attendance-row data-party-kind="defendant" data-party-label="the first defendant">
        <input type="radio" name="attendance-2" value="solicitor" checked>
        <input type="text" value="Sam Solicitor">
      </div>
      <div data-attendance-row data-party-kind="defendant" data-party-label="the second defendant">
        <input type="radio" name="attendance-3" value="letter-only" checked>
        <input type="text" value="Taylor Defendant">
      </div>
      <div data-attendance-row data-party-kind="defendant" data-party-label="the third defendant">
        <input type="radio" name="attendance-4" value="not-present" checked>
        <input type="text">
      </div>
      <div data-attendance-row data-party-kind="defendant" data-party-label="an unrecorded party">
        <input type="radio" name="attendance-5" value="not-present">
        <input type="text">
      </div>

      <input type="radio" name="recitals" value="yes" checked>
      <textarea name="recital">First recital\n\nSecond recital</textarea>
      <input type="radio" name="outright-possession" value="by-date" checked>
      <input name="outright-by-date-day" value="12">
      <input name="outright-by-date-month" value="6">
      <input name="outright-by-date-year" value="2027">
      <input name="outright-grounds-type" value="mandatory">
      <input name="outright-grounds-details" value="Ground 8">

      <input type="checkbox" name="outright-options" value="money-judgment" checked>
      <input type="checkbox" name="outright-mj-sections" value="arrears" checked>
      <input type="checkbox" name="outright-mj-sections" value="payment-plan" checked>
      <input type="checkbox" name="outright-options" value="use-occupation" checked>
      <input type="checkbox" name="outright-options" value="transfer-high-court" checked>
      <input name="outright-mj-arrears" value="1,200">
      <input name="outright-mj-interest" value="50">
      <input name="outright-use-occupation-rate" value="12.50">
      <input name="outright-use-occupation-from-date-day" value="1">
      <input name="outright-use-occupation-from-date-month" value="7">
      <input name="outright-use-occupation-from-date-year" value="2027">

      <input type="radio" name="costs" value="yes" checked>
      <input name="costs-choice" value="def-pay-cl-fixed">
      <input name="costs-def-pay-cl-fixed-amount" value="355">
      <input name="costs-def-pay-cl-summary-amount" value="400">
      <input name="costs-cl-pay-def-summary-amount" value="250">
      <input name="costs-other-text" value="Each party bears its own costs">

      <input type="checkbox" name="outright-mj-plan" value="lump" checked>
      <input type="checkbox" name="outright-mj-plan" value="instalments" checked>
      <input name="outright-mj-lump-amount" value="500">
      <input name="outright-mj-lump-date-day" value="20">
      <input name="outright-mj-lump-date-month" value="7">
      <input name="outright-mj-lump-date-year" value="2027">
      <input name="outright-mj-balance-date-day" value="20">
      <input name="outright-mj-balance-date-month" value="8">
      <input name="outright-mj-balance-date-year" value="2027">
      <input name="outright-mj-inst-amount" value="100">
      <input name="outright-mj-inst-freq" value="month">
      <input name="outright-mj-inst-date-day" value="1">
      <input name="outright-mj-inst-date-month" value="8">
      <input name="outright-mj-inst-date-year" value="2027">

      <div id="order-editor-toolbar"></div>
      <section id="order-preview-editor"><div id="order-editor"></div></section>
      <section id="order-preview-unavailable"></section>
      <button id="submit-order-for-review" type="submit">Continue</button>
    </form>
  `;
}

function currentOrder(): OrderDocument {
  return JSON.parse(document.querySelector<HTMLTextAreaElement>('#order-document')!.value) as OrderDocument;
}

function generatedOrderText(): string {
  return JSON.stringify(currentOrder().generated);
}

describe('make order date pills', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 11, 20, 12));
    document.body.innerHTML = `
      <form id="make-order-form">
        <div class="pcs-date-with-pills">
          <div id="possession-date">
            <input id="possession-date-day" name="possession-date-day">
            <input id="possession-date-month" name="possession-date-month">
            <input id="possession-date-year" name="possession-date-year">
          </div>
          <button type="button" data-date-pill-days="14">14 days</button>
          <button type="button" data-date-pill-days="42">42 days</button>
          <button type="button" data-date-pill-days="not-a-number">Invalid</button>
        </div>
        <div class="pcs-date-with-pills">
          <input name="incomplete-date-day">
          <input name="incomplete-date-month">
          <button type="button" data-date-pill-days="7">Incomplete date</button>
        </div>
        <div class="pcs-date-with-pills">
          <div id="payment-date">
            <input id="payment-date-day" name="payment-date-day" value="1">
            <input id="payment-date-month" name="payment-date-month" value="2">
            <input id="payment-date-year" name="payment-date-year" value="2027">
          </div>
        </div>
      </form>
    `;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fills the linked date with today plus the selected number of calendar days', () => {
    initDatePills(document.querySelector<HTMLFormElement>('#make-order-form')!);

    document.querySelector<HTMLButtonElement>('[data-date-pill-days="14"]')?.click();

    expect(document.querySelector<HTMLInputElement>('#possession-date-day')?.value).toBe('03');
    expect(document.querySelector<HTMLInputElement>('#possession-date-month')?.value).toBe('01');
    expect(document.querySelector<HTMLInputElement>('#possession-date-year')?.value).toBe('2027');
  });

  it('emits a bubbling input event so the existing preview listener refreshes', () => {
    const form = document.querySelector<HTMLFormElement>('#make-order-form');
    const listener = jest.fn();
    form?.addEventListener('input', listener);
    initDatePills(form!);

    document.querySelector<HTMLButtonElement>('[data-date-pill-days="42"]')?.click();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(document.querySelector<HTMLInputElement>('#possession-date-day')?.value).toBe('31');
    expect(document.querySelector<HTMLInputElement>('#possession-date-month')?.value).toBe('01');
    expect(document.querySelector<HTMLInputElement>('#possession-date-year')?.value).toBe('2027');
    expect(document.querySelector<HTMLInputElement>('#payment-date-day')?.value).toBe('1');
  });

  it('ignores clicks which are not valid date pills', () => {
    initDatePills(document.querySelector<HTMLFormElement>('#make-order-form')!);

    document.querySelector<HTMLButtonElement>('[data-date-pill-days="not-a-number"]')?.click();
    document.querySelector<HTMLButtonElement>('[data-date-pill-days="7"]')?.click();
    document.querySelector<HTMLFormElement>('#make-order-form')?.click();

    expect(document.querySelector<HTMLInputElement>('#possession-date-day')?.value).toBe('');
  });
});

describe('make order preview', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('does nothing when the form is not on the page', () => {
    expect(() => initMakeOrder()).not.toThrow();
    expect(document.querySelector('.docweave-editor')).toBeNull();
  });

  it('does nothing when the preview controls are incomplete', () => {
    document.body.innerHTML = '<form id="make-order-form"></form>';

    expect(() => initMakeOrder()).not.toThrow();
    expect(document.querySelector('.docweave-editor')).toBeNull();
  });

  it('builds an outright order from the entered form values', () => {
    renderCompleteForm();

    initMakeOrder();

    expect(document.querySelector('#order-editor')?.classList.contains('docweave-editor')).toBe(true);
    expect(currentOrder()).toEqual(
      expect.objectContaining({
        schema: 'docweave-document',
        version: 1,
      })
    );
    expect(generatedOrderText()).toEqual(expect.stringContaining('Alex Counsel, counsel for the claimant'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('Sam Solicitor, solicitor for the defendant'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('The Court read a letter from Taylor Defendant'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('the third defendant did not attend the hearing'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('First recital'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('10 Test Street'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('12 June 2027'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('1,250.00'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('12.50'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('fixed costs of £355.00'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('by a payment of £'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('by instalment payments of £'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('transferred to the High Court'));
  });

  it('refreshes the generated order for changes outside the editor', () => {
    renderCompleteForm();
    initMakeOrder();
    const grounds = document.querySelector<HTMLInputElement>('[name="outright-grounds-details"]')!;
    grounds.value = 'Ground 10 and Ground 11';

    grounds.dispatchEvent(new Event('input', { bubbles: true }));

    expect(generatedOrderText()).toEqual(expect.stringContaining('Ground 10 and Ground 11'));
    expect(generatedOrderText()).not.toEqual(expect.stringContaining('Ground 8'));

    const beforeEditorEvent = document.querySelector<HTMLTextAreaElement>('#order-document')!.value;
    document.querySelector<HTMLElement>('#order-editor')!.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector<HTMLTextAreaElement>('#order-document')?.value).toBe(beforeEditorEvent);
  });

  it('renders an adjournment document with the real editor', () => {
    renderCompleteForm('', 'ADJOURNMENT');
    document.querySelector('#make-order-form')?.insertAdjacentHTML(
      'beforeend',
      `
        <input name="adj-type" value="further-hearing">
        <input name="adj-when" value="next-date">
        <input name="adj-hearing-date-day" value="21">
        <input name="adj-hearing-date-month" value="5">
        <input name="adj-hearing-date-year" value="2026">
        <input name="adj-time-estimate" value="1">
        <input name="adj-time-estimate-unit" value="hours">
      `
    );

    initMakeOrder();

    expect(document.querySelector<HTMLElement>('#order-preview-editor')?.hidden).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('#submit-order-for-review')?.disabled).toBe(false);
    expect(generatedOrderText()).toContain('next available date (non-possession list) after');
    expect(generatedOrderText()).toContain('21 May 2026');
    expect(generatedOrderText()).toContain('1 hour');
  });

  it('shows unsupported order types and switches back to the outright editor', () => {
    renderCompleteForm('not-json', 'STRIKE_OUT_DISMISSAL');
    initMakeOrder();

    const editorRegion = document.querySelector<HTMLElement>('#order-preview-editor');
    const unavailable = document.querySelector<HTMLElement>('#order-preview-unavailable');
    const submit = document.querySelector<HTMLButtonElement>('#submit-order-for-review');
    expect(editorRegion?.hidden).toBe(true);
    expect(unavailable?.hidden).toBe(false);
    expect(submit?.disabled).toBe(true);
    expect(submit?.getAttribute('aria-disabled')).toBe('true');

    document.querySelector<HTMLAnchorElement>('[data-order-type="OUTRIGHT_POSSESSION"]')?.click();

    expect(document.querySelector<HTMLInputElement>('#order-type')?.value).toBe('OUTRIGHT_POSSESSION');
    expect(editorRegion?.hidden).toBe(false);
    expect(unavailable?.hidden).toBe(true);
    expect(submit?.disabled).toBe(false);
    expect(submit?.getAttribute('aria-disabled')).toBe('false');
    expect(generatedOrderText()).toEqual(expect.stringContaining('IT IS ORDERED THAT'));
  });

  it('uses safe fallback text for incomplete amounts, dates and order details', () => {
    renderCompleteForm();
    document.querySelector<HTMLInputElement>('[name="outright-grounds-type"]')!.value = '';
    document.querySelector<HTMLInputElement>('[name="outright-grounds-details"]')!.value = '';
    document.querySelector<HTMLInputElement>('[name="outright-possession"]')!.value = 'forthwith';
    document.querySelector<HTMLInputElement>('[name="outright-by-date-day"]')!.value = '31';
    document.querySelector<HTMLInputElement>('[name="outright-by-date-month"]')!.value = '2';
    document.querySelector<HTMLInputElement>('[name="outright-use-occupation-from-date-day"]')!.value = '31';
    document.querySelector<HTMLInputElement>('[name="outright-use-occupation-from-date-month"]')!.value = '2';
    document.querySelector<HTMLInputElement>('[name="outright-mj-arrears"]')!.value = 'not money';
    document.querySelector<HTMLInputElement>('[name="outright-mj-interest"]')!.value = '';
    document.querySelector<HTMLInputElement>('[name="outright-use-occupation-rate"]')!.value = '';

    initMakeOrder();

    expect(generatedOrderText()).toEqual(expect.stringContaining('[grounds type not provided]'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('[grounds not provided]'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('forthwith'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('[date not provided]'));
    expect(generatedOrderText()).toEqual(expect.stringContaining('[amount not provided]'));
  });
});
