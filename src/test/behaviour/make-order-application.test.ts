import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  check,
  control,
  openPage,
  startClientContexts,
  submittedOrders,
  type,
  typeDate,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order?genAppId=gen-app-1`;
/** Another open application on the case, which the task did not ask about. */
const OTHER = {
  id: 'gen-app-2',
  reference: 'GA1',
  type: 'Set aside an order',
  applicant: 'Example Housing (Claimant)',
  submittedOn: '2026-09-20',
  documents: [],
};
/** What the application's answers start with. */
const P = 'app-gen-app-1';

const APPLICATION = {
  id: 'gen-app-1',
  reference: 'GA2',
  type: 'Adjourn the hearing',
  applicant: 'Jane Doe (Defendant)',
  submittedOn: '2026-10-01',
  within14Days: 'YES',
  otherPartiesAgreed: 'NO',
  withoutNotice: 'NO',
  whatOrderWanted: '<ol><li><p>The hearing on 14 October is adjourned.</p></li><li><p>Costs in the case.</p></li></ol>',
  documents: [{ id: '3f2a6c1e-0000-4000-8000-000000000001', fileName: 'witness-statement.pdf' }],
};

/** Puts the applicant's wording in the order, as the judge does with the application's button. */
function insertWording(): void {
  control<HTMLButtonElement>('[data-insert-requested-wording]').click();
}

const GRANTED = "The defendant's application dated 1 October 2026 is granted.";

/** The number of clauses in each numbered list of the order the page will submit. */
function clauseLists(): number[] {
  const snapshot = JSON.parse(control<HTMLTextAreaElement>('#order-document').value);
  return snapshot.current.content
    .filter((node: { type: string }) => node.type === 'ordered_list')
    .map((node: { content: unknown[] }) => node.content.length);
}

describe('make an order: deciding the application a task asks about', () => {
  let app: TestApp;
  beforeEach(async () => {
    app = await bootApp({ application: APPLICATION, applications: [OTHER] });
  });
  afterEach(() => app.close());

  it('opens the one page from the XUI task link, with that application first, open and to be decided', async () => {
    const launch = await app.get(
      `/cases/${CASE_REFERENCE}/event/ext:makeOrder?expected_sub=judge-uid&genAppId=gen-app-1&taskId=task-1`
    );
    expect(launch.status).toBe(303);
    expect(launch.location).toBe(`/case/${CASE_REFERENCE}/make-order?taskId=task-1&genAppId=gen-app-1`);

    const page = await openPage((await app.get(launch.location!)).text);
    expect(document.querySelector('h1')?.textContent).toBe('Make an order');
    expect(startClientContexts()).toEqual([{ genAppId: 'gen-app-1' }]);
    // Made without a hearing: no one attended, and the claim waits behind its tick box.
    expect(document.querySelector('[data-attendance-row]')).toBeNull();
    expect(control('#order-type').value).toBe('NO_ORDER_ON_CLAIM');
    const rows = [...document.querySelectorAll<HTMLElement>('[data-application]')];
    expect(rows.map(row => row.dataset.applicationReference)).toEqual(['GA2', 'GA1']);
    expect(control<HTMLDetailsElement>(`details#${P}-more`).open).toBe(true);
    expect(control<HTMLDetailsElement>('details#app-gen-app-2-more').open).toBe(false);
    expect(document.querySelector(`[name="${P}-decision"]:checked`)).toBeNull();
    expect(control('[name="app-gen-app-2-decision"][value="none"]').checked).toBe(true);
    const details = control(`#${P}-details`).textContent ?? '';
    expect(details).toContain('Jane Doe (Defendant)');
    expect(details).toContain('1 October 2026');
    expect(control<HTMLAnchorElement>(`#${P}-details a`).href).toContain(
      `/case/${CASE_REFERENCE}/view-documents/3f2a6c1e-0000-4000-8000-000000000001`
    );

    check(`${P}-decision`, 'dismiss');
    expect(page.orderText().split('\n')).toEqual([
      'UPON the Court considering the papers without a hearing',
      "AND UPON considering the defendant's application dated 1 October 2026",
      'IT IS ORDERED THAT:',
      "The defendant's application dated 1 October 2026 is dismissed.",
    ]);
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(launch.location!, body)).status).toBe(302);
    const [submitted] = submittedOrders() as { order: Record<string, unknown>; taskId: string; hearing: unknown }[];
    expect(submitted.order.orderType).toBe('NO_ORDER_ON_CLAIM');
    expect(submitted.order).not.toHaveProperty('genAppId');
    expect(submitted.hearing).toBeNull();
    expect(submitted.taskId).toBe('task-1');
  });

  it('needs a decision on the application the task asked about, but not on the others', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    await openPage(rejected.text);
    expect([...document.querySelectorAll('.govuk-error-message')].map(error => error.textContent?.trim())).toEqual([
      'Error: Select what you decide about application GA2',
    ]);
  });

  it("grants the application in a clause naming it, and puts the applicant's wording after it only on request, before the costs", async () => {
    const page = await openPage((await app.get(PAGE)).text);
    const button = control<HTMLButtonElement>('[data-application-reference="GA2"] [data-insert-requested-wording]');
    expect(button.closest<HTMLElement>('[hidden]')).not.toBeNull();
    check(`${P}-decision`, 'grant');
    expect(button.closest<HTMLElement>('[hidden]')).toBeNull();
    expect(page.documentText()).not.toContain('The hearing on 14 October is adjourned.');
    insertWording();
    check('costs', 'yes');
    check('costs-choice', 'def-pay-cl-fixed');
    type('costs-def-pay-cl-fixed-amount', '150');

    expect(page.documentText().split('\n').slice(2)).toEqual([
      'IT IS ORDERED THAT:',
      GRANTED,
      'The hearing on 14 October is adjourned.',
      'Costs in the case.',
      "The defendant shall pay the claimant's costs of the application in the fixed sum of £150.00.",
    ]);
    expect(clauseLists()).toEqual([3, 1]);
  });

  it("puts plain text wording into the order as the applicant's lines, without making them clauses", async () => {
    await app.close();
    app = await bootApp({
      application: { ...APPLICATION, whatOrderWanted: '1. The hearing is adjourned.\n2. Costs reserved.\n\nWhy.' },
    });
    const page = await openPage((await app.get(PAGE)).text);
    check(`${P}-decision`, 'grant');
    insertWording();

    expect(page.documentText()).toContain('1. The hearing is adjourned.\n2. Costs reserved.\n\nWhy.');
    // The granted clause, then the applicant's lines as one clause after it.
    expect(clauseLists()).toEqual([2]);
  });

  it('grants an application that asked for no order in a clause of its own, with no wording to insert', async () => {
    await app.close();
    app = await bootApp({ application: { ...APPLICATION, whatOrderWanted: null } });
    const page = await openPage((await app.get(PAGE)).text);
    expect(document.querySelector('[data-insert-requested-wording]')).toBeNull();
    check(`${P}-decision`, 'grant');
    expect(page.orderText().split('\n').slice(2)).toEqual(['IT IS ORDERED THAT:', GRANTED]);
  });

  it('keeps the wording the judge inserted when the decision changes', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check(`${P}-decision`, 'grant');
    insertWording();
    check(`${P}-decision`, 'dismiss');
    expect(page.documentText()).toContain("The defendant's application dated 1 October 2026 is dismissed.");
    expect(page.documentText()).not.toContain('is granted.');
    expect(page.documentText().match(/The hearing on 14 October is adjourned\./g)).toHaveLength(1);

    check(`${P}-decision`, 'grant');
    expect(page.documentText().match(/The hearing on 14 October is adjourned\./g)).toHaveLength(1);
    expect(page.documentText()).not.toContain('is dismissed.');
  });

  it("keeps the judge's deletions when they reopen the order, until they insert the applicant's wording again", async () => {
    await openPage((await app.get(PAGE)).text);
    check(`${P}-decision`, 'grant');
    insertWording();
    // The judge deletes the applicant's clause about costs: the inserted clause, with no id, that holds it.
    const snapshot = JSON.parse(control<HTMLTextAreaElement>('#order-document').value);
    const dropCosts = (node: { attrs?: { id?: string | null }; content?: unknown[] }): void => {
      node.content = node.content?.filter(
        child =>
          !(
            (child as { attrs?: { id?: string | null } }).attrs?.id === undefined &&
            JSON.stringify(child).includes('Costs in the case')
          )
      );
      node.content?.forEach(child => dropCosts(child as typeof node));
    };
    dropCosts(snapshot.current);
    await app.close();
    app = await bootApp({
      application: APPLICATION,
      order: {
        id: 'order-saved',
        version: 4,
        orderType: 'NO_ORDER_ON_CLAIM',
        formData: { [`${P}-decision`]: 'grant' },
        docweaveSnapshot: snapshot,
      },
    });

    const reopened = await openPage((await app.get(`${PAGE}&orderId=order-saved`)).text);
    expect(reopened.documentText()).toContain('The hearing on 14 October is adjourned.');
    expect(reopened.documentText()).not.toContain('Costs in the case.');

    insertWording();
    expect(reopened.documentText()).toContain('Costs in the case.');
    expect(reopened.documentText().match(/The hearing on 14 October is adjourned\./g)).toHaveLength(2);
  });

  it('lists the application for a hearing on notice, asking when as an adjournment does', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    const listing = control<HTMLElement>('[data-application-reference="GA2"] [data-decision-shows="list"]');
    expect(listing.hidden).toBe(true);
    check(`${P}-decision`, 'list');
    expect(listing.hidden).toBe(false);

    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Enter a valid hearing date');
    expect(rejected.text).toContain('Enter the time estimate as a whole number');

    check(`${P}-list-when`, 'specific');
    typeDate(`${P}-list-hearing-date-specific`, '2', '11', '2026');
    type(`${P}-list-specific-time`, '10:30');
    type(`${P}-list-time-estimate`, '30');
    check(`${P}-list-directions`, 'defence');
    typeDate(`${P}-list-defence-date`, '20', '10', '2026');

    expect(page.orderText().split('\n').slice(3)).toEqual([
      "The defendant's application dated 1 October 2026 shall be listed for a hearing on notice to all parties on 2 November 2026 at 10:30am with a time estimate of 30 minutes.",
      'The defendant must by 4pm on 20 October 2026 submit to the court and all other parties a defence.',
    ]);
  });

  describe('when the applicant wrote rich text in XUI', () => {
    const RICH = {
      ...APPLICATION,
      whatOrderWanted:
        '<p>The defendant asks that:</p><ol><li><p>The hearing on 14 October is <strong>adjourned</strong>.</p>' +
        '<ol><li><p>to a date after 28 days;</p></li></ol></li>' +
        '<li><p>Unless the defendant complies with paragraph 1 above, costs are reserved.</p></li></ol>' +
        '<script>alert(1)</script><p onclick="steal()">Why: <img src="x" onerror="steal()">counsel is unwell.</p>',
    };

    beforeEach(async () => {
      await app.close();
      app = await bootApp({ application: RICH });
    });

    it('shows the order asked for as the applicant formatted it, without anything unsafe', async () => {
      await openPage((await app.get(PAGE)).text);
      const requested = control<HTMLElement>(`#${P}-requested`);
      expect([...requested.querySelectorAll(':scope ol > li')].map(item => item.textContent)).toEqual([
        'The hearing on 14 October is adjourned.to a date after 28 days;',
        'to a date after 28 days;',
        'Unless the defendant complies with paragraph 1 above, costs are reserved.',
      ]);
      expect(requested.querySelector('strong')?.textContent).toBe('adjourned');
      expect(requested.querySelector('script, img, [onclick]')).toBeNull();
      expect(requested.textContent).toContain('Why: counsel is unwell.');
    });

    it("keeps the applicant's paragraphs, numbering and bold text in the order, so paragraph 1 is still clause 1", async () => {
      const page = await openPage((await app.get(PAGE)).text);
      check(`${P}-decision`, 'grant');
      insertWording();

      expect(page.documentText().split('\n').slice(2)).toEqual([
        'IT IS ORDERED THAT:',
        GRANTED,
        'The defendant asks that:',
        'The hearing on 14 October is adjourned.',
        'to a date after 28 days;',
        'Unless the defendant complies with paragraph 1 above, costs are reserved.',
        'Why: counsel is unwell.',
      ]);
      // One numbered list: the granted clause, then the applicant's two, the first with its own subclause.
      expect(clauseLists()).toEqual([3]);
      const snapshot = JSON.stringify(JSON.parse(control<HTMLTextAreaElement>('#order-document').value).current);
      expect(snapshot).toContain('"marks":[{"type":"strong"}],"text":"adjourned"');
      expect(snapshot).toMatch(/"type":"list_item".*"type":"ordered_list".*to a date after 28 days/);
    });
  });

  describe('on an application to suspend the warrant of possession', () => {
    beforeEach(async () => {
      await app.close();
      // The second of two defendants applies, so the order says which, and that both defendants pay.
      app = await bootApp({
        defendants: [
          { id: 'defendant-1', name: 'Alex Example' },
          { id: 'defendant-2', name: 'Sam Example' },
        ],
        application: {
          ...APPLICATION,
          applicant: 'Sam Example (Defendant 2)',
          type: 'Something else',
          somethingElseDetails: 'Suspend the warrant of possession',
          warrantSuspension: true,
          whatOrderWanted: null,
        },
      });
    });

    it('grants it on the conditions a suspended possession order has, which it needs', async () => {
      const page = await openPage((await app.get(PAGE)).text);
      const conditions = control<HTMLElement>('[data-decision-shows="grant"]');
      expect(conditions.hidden).toBe(true);
      check(`${P}-decision`, 'grant');
      expect(conditions.hidden).toBe(false);
      const body = page.body();
      body.set('action', 'SUBMIT_FOR_REVIEW');
      const rejected = await app.post(PAGE, body);
      expect(rejected.status).toBe(400);
      expect(rejected.text).toContain('Enter valid arrears');
      expect(rejected.text).toContain('Select a one-off payment or instalments');

      type(`${P}-warrant-arrears`, '850');
      check(`${P}-warrant-payment-terms`, 'instalments');
      type(`${P}-warrant-instalment-amount`, '25');
      type(`${P}-warrant-instalment-frequency`, 'weekly');
      typeDate(`${P}-warrant-instalment-date`, '6', '11', '2026');

      expect(page.orderText().split('\n')).toEqual([
        'UPON the Court considering the papers without a hearing',
        "AND UPON considering the second defendant's application dated 1 October 2026",
        'IT IS ORDERED THAT:',
        'The warrant of possession is suspended on condition that the defendants pay (i) the rent as it falls due plus (ii) the arrears of £850.00 by payments of £25.00 to the claimant every week, the first instalment to be paid on or before 6 November 2026.',
        'Payment of the above instalments made to the claimant shall be applied first to any arrears prior to any order for costs.',
      ]);
      const sent = page.body();
      sent.set('action', 'SUBMIT_FOR_REVIEW');
      expect((await app.post(PAGE, sent)).status).toBe(302);
    });

    it('dismisses it saying when the eviction may go ahead, which it needs', async () => {
      const page = await openPage((await app.get(PAGE)).text);
      check(`${P}-decision`, 'dismiss');
      expect(control<HTMLElement>('[data-decision-shows="dismiss"]').hidden).toBe(false);
      const body = page.body();
      body.set('action', 'SUBMIT_FOR_REVIEW');
      const rejected = await app.post(PAGE, body);
      expect(rejected.status).toBe(400);
      expect(rejected.text).toContain('Enter a valid date the eviction may take place');

      typeDate(`${P}-eviction-date`, '23', '10', '2026');
      expect(page.orderText().split('\n').slice(3)).toEqual([
        'The application to suspend the execution of the warrant of possession is dismissed.',
        'For the avoidance of doubt subject to any further order of the court, the execution of the warrant of possession on 23 October 2026 may take place.',
      ]);
    });
  });
});
