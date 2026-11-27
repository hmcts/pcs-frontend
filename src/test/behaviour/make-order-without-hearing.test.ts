import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  check,
  control,
  offered,
  openPage,
  selectTab,
  submittedOrders,
  type,
  typeDate,
  uncheck,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;

const APPLICATION = {
  id: 'gen-app-1',
  reference: 'GA1',
  type: 'Adjourn the hearing',
  applicant: 'Alex Example (Defendant 1)',
  submittedOn: '2026-10-01',
  whatOrderWanted: null,
  documents: [],
};

describe('make an order: without a hearing or an application', () => {
  let app: TestApp;
  beforeEach(async () => {
    app = await bootApp({ hearing: null });
  });
  afterEach(() => app.close());

  it('offers every order type, possession too, without anyone attending', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('order-notice', 'none');

    expect(document.querySelector('h1')?.textContent).toBe('Make an order');
    expect(offered('[data-attendance-row]')).toBe(false);
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
  });

  it('makes a possession order on the papers, as the judge decides is right in the case', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-outright');
    check('outright-possession', 'forthwith');

    const text = page.orderText();
    expect(text).toContain('UPON the Court considering the papers without a hearing');
    expect(text).toContain('to the Claimant immediately.');
  });

  it('transfers enforcement of the possession order to the High Court, whatever else the order is', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('order-notice', 'none');
    // Last on the form, after own initiative or without notice, as the judges seldom need it.
    const headings = [...document.querySelectorAll('h2.govuk-heading-l')].map(heading => heading.textContent?.trim());
    expect(headings.slice(-3)).toEqual(['Own initiative or without notice', 'Enforcement', 'Order preview']);
    check('transfer-enforcement', 'yes');
    expect(page.orderText().split('\n').slice(2)).toEqual([
      'Enforcement of the Order of Possession is transferred to the High Court pursuant to section 42 of the County Courts Act 1984.',
    ]);
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(PAGE, body)).status).toBe(302);
    const [submitted] = submittedOrders() as { order: { formData: Record<string, unknown> } }[];
    expect(submitted.order.formData['transfer-enforcement']).toEqual('yes');

    // The transfer follows the judge to another order type.
    selectTab('tab-strike-out');
    check('strike-subjects', 'claim');
    check('strike-claim-outcome', 'dismissed');
    expect(page.orderText().split('\n').slice(2)).toEqual([
      "The Claimant's claim is dismissed.",
      'Enforcement of the Order of Possession is transferred to the High Court pursuant to section 42 of the County Courts Act 1984.',
    ]);
  });

  it("limits the costs of enforcing in the High Court to a bailiff's, only with the transfer", async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('order-notice', 'none');
    selectTab('tab-strike-out');
    check('strike-subjects', 'claim');
    check('strike-claim-outcome', 'dismissed');
    check('transfer-enforcement', 'yes');
    const transfer =
      'Enforcement of the Order of Possession is transferred to the High Court pursuant to section 42 of the County Courts Act 1984.';
    const limit =
      'But the Claimant shall not be entitled to recover from the Defendant any costs of enforcement by a High Court Enforcement Officer insofar as they exceed the costs of enforcement by a County Court bailiff.';
    expect(control<HTMLInputElement>('[name="transfer-enforcement-costs"]').checked).toBe(false);
    expect(page.orderText().split('\n').slice(2)).toEqual(["The Claimant's claim is dismissed.", transfer]);

    check('transfer-enforcement-costs', 'bailiff');
    expect(page.orderText().split('\n').slice(2)).toEqual(["The Claimant's claim is dismissed.", transfer, limit]);

    uncheck('transfer-enforcement', 'yes');
    expect(control<HTMLInputElement>('[name="transfer-enforcement-costs"]').checked).toBe(false);
    expect(page.orderText().split('\n').slice(2)).toEqual(["The Claimant's claim is dismissed."]);
    check('transfer-enforcement', 'yes');
    expect(page.orderText().split('\n').slice(2)).toEqual(["The Claimant's claim is dismissed.", transfer]);
  });

  it('transfers enforcement from an order that decides only applications, and keeps it on ordering on the claim', async () => {
    await app.close();
    app = await bootApp({ hearing: null, applications: [APPLICATION] });
    const page = await openPage((await app.get(PAGE)).text);
    check('order-notice', 'none');
    check('transfer-enforcement', 'yes');
    const transfer =
      'Enforcement of the Order of Possession is transferred to the High Court pursuant to section 42 of the County Courts Act 1984.';
    expect(page.documentText()).toContain(transfer);

    check('claim-order', 'yes');
    selectTab('tab-adjournment');
    check('adj-type', 'generally');
    const lines = page.documentText().split('\n');
    expect(lines.slice(lines.indexOf('IT IS ORDERED THAT:'))).toEqual([
      'IT IS ORDERED THAT:',
      'The claim is adjourned generally with liberty to restore by application by any party on notice to all other parties.',
      transfer,
    ]);
  });

  it('lists a hearing on notice from a free form order, asking when as an adjournment does', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('order-notice', 'none');
    check('list-on-notice', 'yes');

    const incomplete = page.body();
    incomplete.set('action', 'SUBMIT_FOR_REVIEW');
    const rejected = await app.post(PAGE, incomplete);
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Enter a valid hearing date');

    typeDate('list-hearing-date-next-list', '2', '11', '2026');
    type('list-time-estimate-hours', '1');
    expect(page.orderText().split('\n').slice(2)).toEqual([
      'The claim shall be listed for a hearing on notice to all parties on the next available possession list after 2 November 2026 with a time estimate of 1 hour. Further details of the hearing will be provided by the court.',
    ]);

    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(PAGE, body)).status).toBe(302);
  });

  it('asks who attended a hearing order, and offers it possession but no listing', async () => {
    await app.close();
    app = await bootApp();
    const page = await openPage((await app.get(PAGE)).text);

    expect(offered('[data-attendance-row]')).toBe(true);
    expect(offered('input[name="list-on-notice"]')).toBe(false);
    expect(document.querySelector('[href="#tab-outright"]')).not.toBeNull();
    expect(page.orderText()).not.toContain('considering the papers');
  });
});
