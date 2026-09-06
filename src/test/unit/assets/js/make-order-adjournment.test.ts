/**
 * @jest-environment jsdom
 */

import { buildAdjournmentOrder, initOptionRows } from '../../../../main/assets/js/make-order';

import { childTexts, findNode } from './docweaveTestUtils';

function renderForm(body: string, claimantCount = 1, defendantCount = 1): HTMLFormElement {
  document.body.innerHTML = `<form data-claimant-count="${claimantCount}" data-defendant-count="${defendantCount}">${body}</form>`;
  return document.querySelector('form')!;
}

function dateInputs(prefix: string, day: string, month: string, year: string): string {
  return `<input name="${prefix}-day" value="${day}"><input name="${prefix}-month" value="${month}"><input name="${prefix}-year" value="${year}">`;
}

describe('adjournment order generation', () => {
  it('generates a further-hearing listing, directions and costs', () => {
    const form = renderForm(`
      <input name="adj-type" value="further-hearing">
      <input name="adj-when" value="next-list">
      ${dateInputs('adj-hearing-date-next-list', '21', '5', '2026')}
      <input name="adj-time-estimate" value="20">
      <input name="adj-time-estimate-unit" value="minutes">
      <input type="checkbox" name="adj-directions" value="defence" checked>
      ${dateInputs('adj-defence-date', '22', '5', '2026')}
      <input type="checkbox" name="adj-directions" value="claimant-reply" checked>
      ${dateInputs('adj-claimant-reply-date', '23', '5', '2026')}
      <input type="checkbox" name="costs" value="yes" checked>
      <input name="costs-choice" value="reserved">
    `);

    const generated = buildAdjournmentOrder(form);

    expect(childTexts(findNode(generated, 'ordered-list:adjournment-clauses'))).toEqual([
      'The claim shall be adjourned to be heard on the next available possession list after 21 May 2026 with a time estimate of 20 minutes. Further details of the hearing will be provided by the court.',
      'The defendant must by 4pm on 22 May 2026 send to the court and all other parties a defence.',
      'The claimant must by 4pm on 23 May 2026 send to the court and all other parties a defence to the counterclaim and any reply.',
      'Costs reserved.',
    ]);
  });

  it('generates a specific hearing with singular duration and no hearing format wording', () => {
    const form = renderForm(`
      <input name="adj-type" value="further-hearing">
      <input name="adj-when" value="specific">
      ${dateInputs('adj-hearing-date-specific', '25', '5', '2026')}
      <input name="adj-specific-time" value="10:30am">
      <input name="adj-time-estimate" value="1">
      <input name="adj-time-estimate-unit" value="hours">
      <input type="checkbox" name="adj-format" value="in-person" checked>
      <input type="checkbox" name="adj-format" value="video" checked>
      <input type="checkbox" name="adj-format" value="telephone" checked>
    `);

    const generated = buildAdjournmentOrder(form);

    expect(findNode(generated, 'item:adjournment-listing').textContent).toBe(
      'The claim shall be adjourned to be heard on 25 May 2026 at 10:30am with a time estimate of 1 hour.'
    );
  });

  it('generates non-possession listing and counterclaim direction wording', () => {
    const form = renderForm(`
      <input name="adj-type" value="further-hearing">
      <input name="adj-when" value="next-date">
      ${dateInputs('adj-hearing-date-next-date', '24', '5', '2026')}
      <input name="adj-time-estimate" value="2">
      <input name="adj-time-estimate-unit" value="hours">
      <input type="checkbox" name="adj-directions" value="counterclaim" checked>
      ${dateInputs('adj-counterclaim-date', '26', '5', '2026')}
    `);

    const generated = buildAdjournmentOrder(form);

    expect(findNode(generated, 'item:adjournment-listing').textContent).toContain(
      'next available date (non-possession list) after 24 May 2026'
    );
    expect(findNode(generated, 'item:adjournment-counterclaim').textContent).toBe(
      'The defendant must by 4pm on 26 May 2026 send to the court and all other parties a defence and any counterclaim, having paid any court fees which are due.'
    );
  });

  it('generates conditional general-adjournment terms with plural parties and strike-out wording', () => {
    const form = renderForm(
      `
        <input name="adj-type" value="generally">
        <input type="checkbox" name="adj-gen" value="current-rent-plus" checked>
        <input name="adj-gen-current-rent-plus-amount" value="50">
        <input name="adj-gen-current-rent-plus-frequency" value="weekly">
        ${dateInputs('adj-gen-current-rent-plus-date', '3', '6', '2026')}
        <input type="checkbox" name="adj-gen" value="oneoff" checked>
        <input name="adj-gen-oneoff-amount" value="100">
        ${dateInputs('adj-gen-oneoff-date', '4', '6', '2026')}
        <input type="checkbox" name="adj-gen" value="restore" checked>
        ${dateInputs('adj-gen-restore-date', '5', '6', '2026')}
      `,
      2,
      2
    );

    const generated = buildAdjournmentOrder(form);

    expect(findNode(generated, 'item:adjournment-condition').firstChild?.textContent).toContain(
      'the defendants make payment of current rent'
    );
    expect(childTexts(findNode(generated, 'ordered-list:adjournment-payment-terms'))).toEqual([
      'a payment to the claimants of £100.00 by 4 June 2026;',
      'instalment payments to the claimants of £50.00 every week, the first instalment to be paid on or before 3 June 2026;',
    ]);
    expect(findNode(generated, 'item:adjournment-restore-right').textContent).toContain(
      'The claimants may apply to restore the claim'
    );
    expect(findNode(generated, 'item:adjournment-strike-out').textContent).toContain(
      '5 June 2026 the claim shall stand as struck out'
    );
  });

  it('generates liberty-to-restore and automatic strike-out wording without payment conditions', () => {
    const generated = buildAdjournmentOrder(
      renderForm(`
        <input name="adj-type" value="generally">
        <input type="checkbox" name="adj-gen" value="restore" checked>
        ${dateInputs('adj-gen-restore-date', '5', '6', '2026')}
      `)
    );

    expect(findNode(generated, 'item:adjournment-generally').textContent).toBe(
      'This claim is adjourned generally with liberty to restore by application by any party on notice to all other parties. If no application is made by 4pm on 5 June 2026 the claim shall automatically be struck out without the need for any further application or order.'
    );
  });

  it('uses regular payments as the instalment condition', () => {
    const generated = buildAdjournmentOrder(
      renderForm(`
        <input name="adj-type" value="generally">
        <input type="checkbox" name="adj-gen" value="payments" checked>
        <input name="adj-gen-payments-amount" value="75">
        <input name="adj-gen-payments-frequency" value="monthly">
        ${dateInputs('adj-gen-payments-date', '6', '6', '2026')}
      `)
    );

    expect(findNode(generated, 'item:adjournment-instalments').textContent).toBe(
      'instalment payments to the claimant of £75.00 every month, the first instalment to be paid on or before 6 June 2026;'
    );
  });
});

describe('adjournment option rows', () => {
  const renderRows = (): HTMLFormElement => {
    document.body.innerHTML = `
      <form>
        <div data-option-row>
          <input type="radio" name="adj-when" value="next-list" checked>
          <div class="pcs-option-row__fields"><input name="adj-hearing-date-next-list-day"></div>
        </div>
        <div data-option-row>
          <input type="radio" name="adj-when" value="specific">
          <div class="pcs-option-row__fields"><input name="adj-hearing-date-specific-day"></div>
        </div>
      </form>
    `;
    const form = document.querySelector('form')!;
    initOptionRows(form);
    return form;
  };

  it('selects the option whose fields are being filled in', () => {
    renderRows();
    const input = document.querySelector<HTMLInputElement>('[name="adj-hearing-date-specific-day"]')!;

    input.value = '21';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(document.querySelector<HTMLInputElement>('input[value="specific"]')?.checked).toBe(true);
    expect(document.querySelector<HTMLInputElement>('input[value="next-list"]')?.checked).toBe(false);
  });

  it('leaves the selection alone when its own fields are filled in', () => {
    renderRows();
    const input = document.querySelector<HTMLInputElement>('[name="adj-hearing-date-next-list-day"]')!;

    input.value = '21';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(document.querySelector<HTMLInputElement>('input[value="next-list"]')?.checked).toBe(true);
  });
});
