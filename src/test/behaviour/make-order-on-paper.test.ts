import { CASE_REFERENCE, type TestApp, bootApp, check, openPage, submittedOrders, type, typeDate } from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;

describe('make an order: on paper, without an application', () => {
  let app: TestApp;
  beforeEach(async () => {
    app = await bootApp({ hearing: null });
  });
  afterEach(() => app.close());

  it('is the screen an application is decided on, without the hearing or the possession order types', async () => {
    const page = await openPage((await app.get(PAGE)).text);

    expect(document.querySelector('h1')?.textContent).toBe('Make an order');
    expect(document.querySelector('[data-attendance-row]')).toBeNull();
    expect(document.querySelector('[data-order-type]')).toBeNull();
    expect(document.querySelector('[data-application]')).toBeNull();
    expect(page.orderText()).toBe(
      ['UPON the Court considering the papers without a hearing', 'IT IS ORDERED THAT:'].join('\n')
    );

    // The judge writes the order in the preview; nothing else needs answering before review.
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(PAGE, body)).status).toBe(302);
    const [submitted] = submittedOrders() as { order: Record<string, unknown> }[];
    expect(submitted.order.orderType).toBe('ON_PAPER');
    expect(submitted.order.genAppId).toBeNull();
  });

  it('lists a hearing on notice, asking when as an adjournment does', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('paper-list', 'yes');

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

  it('keeps the tabs of a possession order a judge started without a hearing before', async () => {
    await app.close();
    app = await bootApp({ hearing: null, order: { id: 'order-saved', version: 2, orderType: 'OUTRIGHT_POSSESSION' } });
    await openPage((await app.get(PAGE)).text);

    expect(document.querySelector('[data-order-type]')).not.toBeNull();
  });
});
