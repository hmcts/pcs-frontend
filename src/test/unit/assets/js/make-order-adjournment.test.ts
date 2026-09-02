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
      fact: (_id: string, value: string) => {
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

import { buildAdjournmentOrder, initMakeOrder } from '../../../../main/assets/js/make-order';

interface CapturedItem {
  id: string;
  text: string;
  nested: { id: string; items: CapturedItem[] }[];
}

interface CapturedDocument {
  paragraphs: { id: string; text: string }[];
  lists: { id: string; items: CapturedItem[] }[];
}

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
      ${dateInputs('adj-hearing-date', '21', '5', '2026')}
      <input name="adj-time-estimate" value="20">
      <input name="adj-time-estimate-unit" value="minutes">
      <input type="checkbox" name="adj-directions" value="defence" checked>
      ${dateInputs('adj-defence-date', '22', '5', '2026')}
      <input type="checkbox" name="adj-directions" value="claimant-reply" checked>
      ${dateInputs('adj-claimant-reply-date', '23', '5', '2026')}
      <input type="checkbox" name="costs" value="yes" checked>
      <input name="costs-choice" value="reserved">
    `);

    const generated = buildAdjournmentOrder(form) as unknown as CapturedDocument;
    const items = generated.lists[0].items;

    expect(items.map(item => item.text)).toEqual([
      'The claim shall be adjourned to be heard on the next available possession list after 21 May 2026 with a time estimate of 20 minutes. Further details of the hearing will be provided by the court.',
      'The defendant must by 4pm on 22 May 2026 send to the court and all other parties a defence.',
      'The claimant must by 4pm on 23 May 2026 send to the court and all other parties a defence to the counterclaim and any reply.',
      'Costs reserved.',
    ]);
  });

  it('generates a specific hearing with singular duration and combined formats', () => {
    const form = renderForm(`
      <input name="adj-type" value="further-hearing">
      <input name="adj-when" value="specific">
      ${dateInputs('adj-hearing-date', '25', '5', '2026')}
      <input name="adj-specific-time" value="10:30am">
      <input name="adj-time-estimate" value="1">
      <input name="adj-time-estimate-unit" value="hours">
      <input type="checkbox" name="adj-format" value="in-person" checked>
      <input type="checkbox" name="adj-format" value="video" checked>
      <input type="checkbox" name="adj-format" value="telephone" checked>
    `);

    const generated = buildAdjournmentOrder(form) as unknown as CapturedDocument;

    expect(generated.lists[0].items[0].text).toBe(
      'The claim shall be adjourned to be heard on 25 May 2026 at 10:30am with a time estimate of 1 hour. Such hearing shall be in person, by video hearing and by telephone.'
    );
  });

  it('generates non-possession listing and counterclaim direction wording', () => {
    const form = renderForm(`
      <input name="adj-type" value="further-hearing">
      <input name="adj-when" value="next-date">
      ${dateInputs('adj-hearing-date', '24', '5', '2026')}
      <input name="adj-time-estimate" value="2">
      <input name="adj-time-estimate-unit" value="hours">
      <input type="checkbox" name="adj-directions" value="counterclaim" checked>
      ${dateInputs('adj-counterclaim-date', '26', '5', '2026')}
    `);

    const items = (buildAdjournmentOrder(form) as unknown as CapturedDocument).lists[0].items;

    expect(items[0].text).toContain('next available date (non-possession list) after 24 May 2026');
    expect(items[1].text).toBe(
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

    const generated = buildAdjournmentOrder(form) as unknown as CapturedDocument;
    const items = generated.lists[0].items;

    expect(items[0].text).toContain('the defendants make payment of current rent');
    expect(items[0].nested[0].items.map(item => item.text)).toEqual([
      'a payment to the claimants of £100.00 by 4 June 2026;',
      'instalment payments to the claimants of £50.00 every week, the first instalment to be paid on or before 3 June 2026;',
    ]);
    expect(items[1].text).toContain('The claimants may apply to restore the claim');
    expect(items[2].text).toContain('5 June 2026 the claim shall stand as struck out');
  });

  it('generates liberty-to-restore and automatic strike-out wording without payment conditions', () => {
    const generated = buildAdjournmentOrder(
      renderForm(`
        <input name="adj-type" value="generally">
        <input type="checkbox" name="adj-gen" value="restore" checked>
        ${dateInputs('adj-gen-restore-date', '5', '6', '2026')}
      `)
    ) as unknown as CapturedDocument;

    expect(generated.lists[0].items[0].text).toBe(
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
    ) as unknown as CapturedDocument;

    expect(generated.lists[0].items[0].nested[0].items[0].text).toBe(
      'instalment payments to the claimant of £75.00 every month, the first instalment to be paid on or before 6 June 2026;'
    );
  });
});

describe('adjournment submission validation', () => {
  beforeEach(() => {
    jest.mocked(createOrderEditor).mockReset();
    jest.mocked(createOrderEditor).mockReturnValue({
      render: jest.fn(),
      getSnapshot: jest.fn(() => ({ schema: 'docweave-document' })),
      destroy: jest.fn(),
    } as never);
  });

  it('blocks an incomplete further-hearing order and accepts it once required values are provided', () => {
    document.body.innerHTML = `
      <form id="make-order-form" data-claimant-count="1" data-defendant-count="1">
        <input id="order-type" value="ADJOURNMENT">
        <textarea id="order-document">null</textarea>
        <a href="#tab-adjournment" data-order-type="ADJOURNMENT">Adjournment</a>
        <div id="order-preview-editor"><div id="order-editor"></div></div>
        <p id="order-preview-unavailable"></p>
        <input id="adj-type" name="adj-type" value="further-hearing">
        <input name="adj-when" value="specific">
        ${dateInputs('adj-hearing-date', '', '', '')}
        <input id="adj-specific-time" name="adj-specific-time">
        <input id="adj-time-estimate" name="adj-time-estimate">
        <select id="adj-time-estimate-unit" name="adj-time-estimate-unit"><option value="minutes">minutes</option></select>
        <button id="submit-order-for-review" type="submit" value="SUBMIT_FOR_REVIEW">Submit</button>
      </form>
    `;
    initMakeOrder();
    const form = document.querySelector<HTMLFormElement>('form')!;
    const submit = document.querySelector<HTMLButtonElement>('#submit-order-for-review')!;

    const submitForm = (): boolean =>
      form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: submit }));

    expect(submitForm()).toBe(false);
    expect(document.querySelector('#make-order-error-summary')?.textContent).toContain(
      'Enter a valid adjournment date'
    );
    expect(document.querySelector('#make-order-error-summary')?.textContent).toContain(
      'Enter the time estimate as a whole number'
    );
    expect(document.querySelector('#make-order-error-summary')?.textContent).toContain('Enter the time of hearing');

    ['day', 'month', 'year'].forEach((part, index) => {
      document.querySelector<HTMLInputElement>(`[name="adj-hearing-date-${part}"]`)!.value = ['21', '5', '2026'][index];
    });
    document.querySelector<HTMLInputElement>('#adj-time-estimate')!.value = '20';
    document.querySelector<HTMLInputElement>('#adj-specific-time')!.value = '10:30am';
    expect(submitForm()).toBe(true);

    expect(document.querySelector('#make-order-error-summary')).toBeNull();
  });
});
