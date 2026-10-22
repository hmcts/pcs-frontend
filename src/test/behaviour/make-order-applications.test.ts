import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  check,
  control,
  openPage,
  recordAttendance,
  selectTab,
  submittedOrders,
  type,
  typeDate,
  uncheck,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;

const ADJOURN = {
  id: 'gen-app-1',
  reference: 'GA1',
  type: 'Adjourn the hearing',
  applicant: 'Alex Example (Defendant 1)',
  submittedOn: '2026-10-01',
  whatOrderWanted: '<ol><li><p>The hearing on 14 October is adjourned.</p></li><li><p>Costs in the case.</p></li></ol>',
  documents: [{ id: '3f2a6c1e-0000-4000-8000-000000000001', fileName: 'hospital-letter.pdf' }],
};

const WARRANT = {
  id: 'gen-app-2',
  reference: 'GA2',
  type: 'Something else',
  somethingElseDetails: 'Suspend the warrant of possession',
  warrantSuspension: true,
  applicant: 'Alex Example (Defendant 1)',
  submittedOn: '2026-10-09',
  whatOrderWanted: null,
  documents: [],
};

describe('make an order at a hearing: deciding the applications', () => {
  let app: TestApp;
  beforeEach(async () => {
    app = await bootApp({ applications: [ADJOURN, WARRANT] });
  });
  afterEach(() => app.close());

  it('lists every open application before the claim, folded away, with nothing decided', async () => {
    await openPage((await app.get(PAGE)).text);
    expect(document.querySelector('h1')?.textContent).toBe('Make an order');
    // The applications come first; the claim's order types wait behind a tick box, so the order starts as one on
    // the applications alone.
    const claimTabs = control<HTMLElement>('[data-claim-order]');
    expect(
      control<HTMLElement>('[data-applications]').compareDocumentPosition(claimTabs) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(control('input[name="claim-order"]').checked).toBe(false);
    expect(claimTabs.hidden).toBe(true);
    expect(control('#order-type').value).toBe('NO_ORDER_ON_CLAIM');
    const rows = [...document.querySelectorAll<HTMLElement>('[data-application]')];
    expect(rows.map(row => row.dataset.applicationReference)).toEqual(['GA1', 'GA2']);
    expect(rows[0].querySelector('h3')?.textContent?.trim()).toBe('GA1: Adjourn the hearing');
    expect(rows[1].querySelector('h3')?.textContent?.trim()).toBe(
      'GA2: Something else – Suspend the warrant of possession'
    );
    // The details are in an expander the judge, who has the file, need not open.
    expect(document.querySelector('#app-gen-app-1-more details, details#app-gen-app-1-more')).not.toBeNull();
    expect(control('[name="app-gen-app-1-decision"][value="none"]').checked).toBe(true);
    expect(control('[name="app-gen-app-2-decision"][value="none"]').checked).toBe(true);
    // The claim's tabs no longer offer the application as a subject.
    expect(document.querySelector('[name="adj-subjects"]')).toBeNull();
    expect(document.querySelector('[name="strike-subjects"][value="application"]')).toBeNull();
  });

  it('shows no applications section, and the claim without a tick box, when the case has none open', async () => {
    await app.close();
    app = await bootApp();
    await openPage((await app.get(PAGE)).text);
    expect(document.querySelector('[data-applications]')).toBeNull();
    expect(document.querySelector('input[name="claim-order"]')).toBeNull();
    expect(control<HTMLElement>('[data-claim-order]').hidden).toBe(false);
    expect(control('#order-type').value).toBe('OUTRIGHT_POSSESSION');
  });

  it('offers the claim once the judge ticks to order on it, and takes it away again', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    recordAttendance();
    check('claim-order', 'yes');
    expect(control<HTMLElement>('[data-claim-order]').hidden).toBe(false);
    expect(control('#order-type').value).toBe('OUTRIGHT_POSSESSION');
    selectTab('tab-adjournment');
    check('adj-type', 'generally');
    expect(page.documentText()).toContain('The claim is adjourned generally');
    uncheck('claim-order', 'yes');
    expect(control<HTMLElement>('[data-claim-order]').hidden).toBe(true);
    expect(control('#order-type').value).toBe('NO_ORDER_ON_CLAIM');
    expect(page.documentText()).not.toContain('The claim is adjourned generally');
    // Ticking again goes back to the tab the judge had open.
    check('claim-order', 'yes');
    expect(control('#order-type').value).toBe('ADJOURNMENT');
  });

  it('puts each decided application after the claim, with a recital, and leaves the rest alone', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    recordAttendance();
    check('claim-order', 'yes');
    selectTab('tab-adjournment');
    check('adj-type', 'generally');
    check('app-gen-app-2-decision', 'dismiss');
    typeDate('app-gen-app-2-eviction-date', '23', '10', '2026');

    const text = page.documentText();
    expect(text).toContain("UPON considering the defendant's application dated 9 October 2026");
    expect(text).not.toContain('1 October 2026');
    expect(text.split('\n').slice(text.split('\n').indexOf('IT IS ORDERED THAT:'))).toEqual([
      'IT IS ORDERED THAT:',
      'The claim is adjourned generally with liberty to restore by application by any party on notice to all other parties.',
      'The application to suspend the execution of the warrant of possession is dismissed.',
      'For the avoidance of doubt subject to any further order of the court, the execution of the warrant of possession on 23 October 2026 may take place.',
    ]);

    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(PAGE, body)).status).toBe(302);
    const [submitted] = submittedOrders() as { order: { formData: Record<string, unknown>; genAppId: unknown } }[];
    expect(submitted.order.genAppId).toBeNull();
    expect(submitted.order.formData['app-gen-app-1-decision']).toBe('none');
    expect(submitted.order.formData['app-gen-app-2-decision']).toBe('dismiss');
  });

  it("granting an application names it in a clause, and a button puts the applicant's wording after that clause", async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('app-gen-app-1-decision', 'grant');
    check('app-gen-app-2-decision', 'list');
    control<HTMLButtonElement>('[data-application-reference="GA1"] [data-insert-requested-wording]').click();
    type('app-gen-app-2-list-time-estimate', '30');
    typeDate('app-gen-app-2-list-hearing-date-next-list', '1', '12', '2026');

    const lines = page.documentText().split('\n');
    expect(lines.slice(lines.indexOf('IT IS ORDERED THAT:'))).toEqual([
      'IT IS ORDERED THAT:',
      "The defendant's application dated 1 October 2026 is granted.",
      'The hearing on 14 October is adjourned.',
      'Costs in the case.',
      "The defendant's application dated 9 October 2026 shall be listed for a hearing on notice to all parties on the next available possession list after 1 December 2026 with a time estimate of 30 minutes. Further details of the hearing will be provided by the court.",
    ]);
    expect(
      lines.filter(line => line.startsWith('AND UPON considering')).length +
        lines.filter(line => line.startsWith('UPON considering')).length
    ).toBe(2);
  });

  it("keeps the applicant's wording the judge inserted when they go on to order on the claim", async () => {
    const page = await openPage((await app.get(PAGE)).text);
    recordAttendance();
    check('app-gen-app-1-decision', 'grant');
    control<HTMLButtonElement>('[data-application-reference="GA1"] [data-insert-requested-wording]').click();
    check('claim-order', 'yes');
    expect(page.documentText()).toContain('The hearing on 14 October is adjourned.');
    selectTab('tab-adjournment');
    check('adj-type', 'generally');

    const lines = page.documentText().split('\n');
    expect(lines.slice(lines.indexOf('IT IS ORDERED THAT:'))).toEqual([
      'IT IS ORDERED THAT:',
      'The claim is adjourned generally with liberty to restore by application by any party on notice to all other parties.',
      "The defendant's application dated 1 October 2026 is granted.",
      'The hearing on 14 October is adjourned.',
      'Costs in the case.',
    ]);
  });

  it('needs what follows a decision, naming the application', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    recordAttendance();
    check('app-gen-app-2-decision', 'grant');
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    body.set('app-gen-app-1-decision', 'nonsense');
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Select what you decide about application GA1');
    expect(rejected.text).toContain('Enter valid arrears');
  });
});
