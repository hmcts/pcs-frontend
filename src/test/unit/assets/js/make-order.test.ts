/**
 * @jest-environment jsdom
 */

jest.mock('@hmcts-cft/docweave', () => ({}));

import { initDatePills } from '../../../../main/assets/js/make-order';

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
});
