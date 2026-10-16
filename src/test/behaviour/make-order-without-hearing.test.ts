import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  check,
  openPage,
  selectTab,
  submittedOrders,
  type,
  typeDate,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;

describe('make an order: without a hearing or an application', () => {
  let app: TestApp;
  beforeEach(async () => {
    app = await bootApp({ hearing: null });
  });
  afterEach(() => app.close());

  it('offers every order type, starting on free form, without anyone attending', async () => {
    const page = await openPage((await app.get(PAGE)).text);

    expect(document.querySelector('h1')?.textContent).toBe('Make an order');
    expect(document.querySelector('[data-attendance-row]')).toBeNull();
    expect(document.querySelector('[data-application]')).toBeNull();
    expect([...document.querySelectorAll<HTMLElement>('[data-order-type]')].map(tab => tab.dataset.orderType)).toEqual([
      'OUTRIGHT_POSSESSION',
      'SUSPENDED_POSSESSION',
      'ADJOURNMENT',
      'STRIKE_OUT_DISMISSAL',
      'FREE_FORM',
    ]);
    expect(page.orderText()).toBe(
      ['UPON the Court considering the papers without a hearing', 'IT IS ORDERED THAT:'].join('\n')
    );

    // The judge writes the order in the preview; no one's attendance is asked before review.
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(PAGE, body)).status).toBe(302);
    const [submitted] = submittedOrders() as { order: Record<string, unknown> }[];
    expect(submitted.order.orderType).toBe('FREE_FORM');
    expect(submitted.order.genAppId).toBeNull();
  });

  it('makes a possession order without a hearing, saying so in place of who attended', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-outright');
    check('outright-options', 'money-judgment');
    check('outright-mj-sections', 'arrears');
    type('outright-mj-arrears', '500');

    expect(page.orderText().split('\n').slice(0, 2)).toEqual([
      'UPON the Court considering the papers without a hearing',
      'IT IS ORDERED THAT:',
    ]);
    expect(page.orderText()).toContain('Judgment for the claimant(s) in the sum of £500.00.');
  });

  it('lists a hearing on notice from a free form order, asking when as an adjournment does', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('list-on-notice', 'yes');

    const incomplete = page.body();
    incomplete.set('action', 'SUBMIT_FOR_REVIEW');
    const rejected = await app.post(PAGE, incomplete);
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Enter a valid hearing date');

    typeDate('list-hearing-date-next-list', '2', '11', '2026');
    type('list-time-estimate', '1');
    type('list-time-estimate-unit', 'hours');
    expect(page.orderText().split('\n').slice(2)).toEqual([
      'The claim shall be listed for a hearing on notice to all parties on the next available possession list after 2 November 2026 with a time estimate of 1 hour. Further details of the hearing will be provided by the court.',
    ]);

    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(PAGE, body)).status).toBe(302);
  });

  it('asks who attended a hearing order, and offers it no listing of its own', async () => {
    await app.close();
    app = await bootApp();
    const page = await openPage((await app.get(PAGE)).text);

    expect(document.querySelector('[data-attendance-row]')).not.toBeNull();
    expect(document.querySelector('input[name="list-on-notice"]')).toBeNull();
    expect(page.orderText()).not.toContain('considering the papers');
  });
});
