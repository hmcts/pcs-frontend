/**
 * @jest-environment jsdom
 */

import { initOptionRows } from '../../../../main/assets/js/make-order';
import { buildAdjournmentOrder } from '../../../../main/assets/js/make-order/wording/adjournment';

import { childTexts, findNode, makeOrderData } from './docweaveTestUtils';

describe('adjournment order generation', () => {
  it('generates a further-hearing listing, directions and costs', () => {
    const generated = buildAdjournmentOrder(
      makeOrderData(
        {
          'adj-type': 'further-hearing',
          'adj-when': 'next-list',
          'adj-hearing-date-next-list-day': '21',
          'adj-hearing-date-next-list-month': '5',
          'adj-hearing-date-next-list-year': '2026',
          'adj-time-estimate': '20',
          'adj-time-estimate-unit': 'minutes',
          'adj-directions': ['defence', 'claimant-reply'],
          'adj-defence-date-day': '22',
          'adj-defence-date-month': '5',
          'adj-defence-date-year': '2026',
          'adj-claimant-reply-date-day': '23',
          'adj-claimant-reply-date-month': '5',
          'adj-claimant-reply-date-year': '2026',
          costs: 'yes',
          'costs-choice': 'reserved',
        },
        { selectedControlIds: { 'costs-choice': 'costs-choice' } }
      )
    );

    expect(generated.children.map(clause => clause.textContent)).toEqual(
      expect.arrayContaining([
        'The claim shall be adjourned to be heard on the next available possession list after 21 May 2026 with a time estimate of 20 minutes. Further details of the hearing will be provided by the court.',
        'The defendant must by 4pm on 22 May 2026 send to the court and all other parties a defence.',
        'The claimant must by 4pm on 23 May 2026 send to the court and all other parties a defence to the counterclaim and any reply.',
        'Costs reserved.',
      ])
    );
  });

  it('generates a specific hearing with singular duration and no hearing format wording', () => {
    const generated = buildAdjournmentOrder(
      makeOrderData({
        'adj-type': 'further-hearing',
        'adj-when': 'specific',
        'adj-hearing-date-specific-day': '25',
        'adj-hearing-date-specific-month': '5',
        'adj-hearing-date-specific-year': '2026',
        'adj-specific-time': '10:30am',
        'adj-time-estimate': '1',
        'adj-time-estimate-unit': 'hours',
        'adj-format': ['in-person', 'video', 'telephone'],
      })
    );

    expect(findNode(generated, 'item:adjournment-listing').textContent).toBe(
      'The claim shall be adjourned to be heard on 25 May 2026 at 10:30am with a time estimate of 1 hour.'
    );
  });

  it('generates non-possession listing and counterclaim direction wording', () => {
    const generated = buildAdjournmentOrder(
      makeOrderData({
        'adj-type': 'further-hearing',
        'adj-when': 'next-date',
        'adj-hearing-date-next-date-day': '24',
        'adj-hearing-date-next-date-month': '5',
        'adj-hearing-date-next-date-year': '2026',
        'adj-time-estimate': '2',
        'adj-time-estimate-unit': 'hours',
        'adj-directions': 'counterclaim',
        'adj-counterclaim-date-day': '26',
        'adj-counterclaim-date-month': '5',
        'adj-counterclaim-date-year': '2026',
      })
    );

    expect(findNode(generated, 'item:adjournment-listing').textContent).toContain(
      'next available date (non-possession list) after 24 May 2026'
    );
    expect(findNode(generated, 'item:adjournment-counterclaim').textContent).toBe(
      'The defendant must by 4pm on 26 May 2026 send to the court and all other parties a defence and any counterclaim, having paid any court fees which are due.'
    );
  });

  it('generates conditional general-adjournment terms with plural parties and strike-out wording', () => {
    const generated = buildAdjournmentOrder(
      makeOrderData(
        {
          'adj-type': 'generally',
          'adj-gen': ['current-rent-plus', 'oneoff', 'restore'],
          'adj-gen-current-rent-plus-amount': '50',
          'adj-gen-current-rent-plus-frequency': 'weekly',
          'adj-gen-current-rent-plus-date-day': '3',
          'adj-gen-current-rent-plus-date-month': '6',
          'adj-gen-current-rent-plus-date-year': '2026',
          'adj-gen-oneoff-amount': '100',
          'adj-gen-oneoff-date-day': '4',
          'adj-gen-oneoff-date-month': '6',
          'adj-gen-oneoff-date-year': '2026',
          'adj-gen-restore-date-day': '5',
          'adj-gen-restore-date-month': '6',
          'adj-gen-restore-date-year': '2026',
        },
        { claimantCount: 2, defendantCount: 2 }
      )
    );

    expect(findNode(generated, 'item:adjournment-condition').textContent).toContain(
      'the defendants make payment of current rent'
    );
    expect(childTexts(findNode(generated, 'adjournment-condition'))).toEqual([
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
      makeOrderData({
        'adj-type': 'generally',
        'adj-gen': 'restore',
        'adj-gen-restore-date-day': '5',
        'adj-gen-restore-date-month': '6',
        'adj-gen-restore-date-year': '2026',
      })
    );

    expect(findNode(generated, 'item:adjournment-generally').textContent).toBe(
      'This claim is adjourned generally with liberty to restore by application by any party on notice to all other parties. If no application is made by 4pm on 5 June 2026 the claim shall automatically be struck out without the need for any further application or order.'
    );
  });

  it('uses regular payments as the instalment condition', () => {
    const generated = buildAdjournmentOrder(
      makeOrderData({
        'adj-type': 'generally',
        'adj-gen': 'payments',
        'adj-gen-payments-amount': '75',
        'adj-gen-payments-frequency': 'monthly',
        'adj-gen-payments-date-day': '6',
        'adj-gen-payments-date-month': '6',
        'adj-gen-payments-date-year': '2026',
      })
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
