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

  it('offers every order type but possession, starting on free form, without anyone attending', async () => {
    const page = await openPage((await app.get(PAGE)).text);

    expect(document.querySelector('h1')?.textContent).toBe('Make an order');
    expect(document.querySelector('[data-attendance-row]')).toBeNull();
    expect(document.querySelector('[data-application]')).toBeNull();
    expect([...document.querySelectorAll<HTMLElement>('[data-order-type]')].map(tab => tab.dataset.orderType)).toEqual([
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

  it('refuses a possession order sent without a hearing', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    expect(document.querySelector('#tab-outright')).toBeNull();
    expect(document.querySelector('#tab-suspended')).toBeNull();

    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    body.set('orderType', 'OUTRIGHT_POSSESSION');
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Select an order type made without a hearing');
    expect(submittedOrders()).toEqual([]);
  });

  it('transfers enforcement of the possession order to the High Court, whatever else the order is', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('transfer-enforcement', 'yes');

    const unchosen = page.body();
    unchosen.set('action', 'SUBMIT_FOR_REVIEW');
    const noCourt = await app.post(PAGE, unchosen);
    expect(noCourt.status).toBe(400);
    expect(noCourt.text).toContain('Select King&#39;s Bench Division or a District Registry');

    check('transfer-enforcement-court', 'district-registry');
    const unnamed = page.body();
    unnamed.set('action', 'SUBMIT_FOR_REVIEW');
    const noRegistry = await app.post(PAGE, unnamed);
    expect(noRegistry.status).toBe(400);
    expect(noRegistry.text).toContain('Enter the District Registry');

    type('transfer-enforcement-registry', 'Bristol District Registry');
    expect(page.orderText().split('\n').slice(2)).toEqual([
      'Enforcement of the Order of Possession is transferred to the High Court, Bristol District Registry, pursuant to section 42 of the County Courts Act 1984.',
    ]);
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(PAGE, body)).status).toBe(302);
    const [submitted] = submittedOrders() as { order: { formData: Record<string, unknown> } }[];
    expect(submitted.order.formData['transfer-enforcement-registry']).toBe('Bristol District Registry');

    // The transfer follows the judge to another order type.
    selectTab('tab-strike-out');
    check('strike-subjects', 'claim');
    check('strike-claim-outcome', 'dismissed');
    check('transfer-enforcement-court', 'kings-bench');
    expect(page.orderText().split('\n').slice(2)).toEqual([
      'The claim is dismissed.',
      "Enforcement of the Order of Possession is transferred to the High Court, King's Bench Division, pursuant to section 42 of the County Courts Act 1984.",
    ]);
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

  it('asks who attended a hearing order, and offers it possession but no listing or transfer of its own', async () => {
    await app.close();
    app = await bootApp();
    const page = await openPage((await app.get(PAGE)).text);

    expect(document.querySelector('[data-attendance-row]')).not.toBeNull();
    expect(document.querySelector('input[name="list-on-notice"]')).toBeNull();
    expect(document.querySelector('input[name="transfer-enforcement"]')).toBeNull();
    expect(document.querySelector('#tab-outright')).not.toBeNull();
    expect(page.orderText()).not.toContain('considering the papers');
  });
});
