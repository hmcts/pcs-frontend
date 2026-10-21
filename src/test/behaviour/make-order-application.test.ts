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

const APPLICATION = {
  id: 'gen-app-1',
  reference: 'GA2',
  type: 'Adjourn the hearing',
  applicant: 'Jane Doe (Defendant)',
  submittedOn: '2026-10-01',
  within14Days: 'YES',
  otherPartiesAgreed: 'NO',
  withoutNotice: 'NO',
  fee: 'Paid, or no fee due',
  whatOrderWanted: '<ol><li><p>The hearing on 14 October is adjourned.</p></li><li><p>Costs in the case.</p></li></ol>',
  documents: [{ id: '3f2a6c1e-0000-4000-8000-000000000001', fileName: 'witness-statement.pdf' }],
  referredOn: '2026-10-05',
  referralNote: 'The hearing is next week',
};

/** The number of clauses in each numbered list of the order the page will submit. */
function clauseLists(): number[] {
  const snapshot = JSON.parse(control<HTMLTextAreaElement>('#order-document').value);
  return snapshot.current.content
    .filter((node: { type: string }) => node.type === 'ordered_list')
    .map((node: { content: unknown[] }) => node.content.length);
}

describe('make an order: deciding an application', () => {
  let app: TestApp;
  beforeEach(async () => {
    app = await bootApp({ application: APPLICATION });
  });
  afterEach(() => app.close());

  it('keeps the application and task when launched from the XUI task link', async () => {
    const launch = await app.get(
      `/cases/${CASE_REFERENCE}/event/ext:makeOrder?expected_sub=judge-uid&genAppId=gen-app-1&taskId=task-1`
    );
    expect(launch.status).toBe(303);
    expect(launch.location).toBe(`/case/${CASE_REFERENCE}/make-order?taskId=task-1&genAppId=gen-app-1`);

    const page = await openPage((await app.get(launch.location!)).text);
    expect(document.querySelector('h1')?.textContent).toBe('Decide application GA2');
    expect(startClientContexts()).toEqual([{ genAppId: 'gen-app-1' }]);

    check('application-decision', 'dismiss');
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(launch.location!, body)).status).toBe(302);
    const [submitted] = submittedOrders() as { order: { genAppId: string; orderType: string }; taskId: string }[];
    expect(submitted.order.genAppId).toBe('gen-app-1');
    expect(submitted.order.orderType).toBe('APPLICATION_DECISION');
    expect(submitted.taskId).toBe('task-1');
  });

  it('shows the application, its documents and the note from court staff, without the hearing', async () => {
    const response = await app.get(PAGE);
    await openPage(response.text);

    expect(document.querySelector('h1')?.textContent).toBe('Decide application GA2');
    const details = document.querySelector('#application-details')?.textContent ?? '';
    expect(details).toContain('Jane Doe (Defendant)');
    expect(details).toContain('1 October 2026');
    expect(document.querySelector<HTMLAnchorElement>('#application-details a')?.href).toContain(
      `/case/${CASE_REFERENCE}/view-documents/3f2a6c1e-0000-4000-8000-000000000001`
    );
    expect(document.querySelector('#referral-note')?.textContent).toContain('The hearing is next week');
    expect(document.querySelector('[data-attendance-row]')).toBeNull();
    expect(document.querySelector('[data-order-type]')).toBeNull();
    expect(document.body.textContent).not.toContain('Answer every question');
  });

  it("uses the applicant's wording as the order's numbered clauses, with no decision clause of its own", async () => {
    const page = await openPage((await app.get(PAGE)).text);
    expect(control<HTMLButtonElement>('[data-restore-requested-wording]').hidden).toBe(true);
    check('application-decision', 'grant');

    expect(page.documentText()).toBe(
      [
        'UPON the application of Jane Doe (Defendant) dated 1 October 2026 (GA2) to adjourn the hearing',
        'AND UPON the Court considering the application without a hearing',
        'IT IS ORDERED THAT:',
        'The hearing on 14 October is adjourned.',
        'Costs in the case.',
      ].join('\n')
    );
    expect(clauseLists()).toEqual([2]);
    expect(control<HTMLButtonElement>('[data-restore-requested-wording]').hidden).toBe(false);

    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(PAGE, body)).status).toBe(302);
    const [submitted] = submittedOrders() as { order: Record<string, unknown> }[];
    expect(submitted.order.genAppId).toBe('gen-app-1');
    expect((submitted as { hearing?: unknown }).hearing).toBeNull();
    expect(startClientContexts()).toEqual([{ genAppId: 'gen-app-1' }, { genAppId: 'gen-app-1' }]);
    expect(submitted.order.orderType).toBe('APPLICATION_DECISION');
  });

  it("puts a costs order after the applicant's wording", async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('application-decision', 'grant');
    check('costs', 'yes');
    check('costs-choice', 'other');
    type('costs-other-text', 'No order as to costs.');

    expect(page.documentText().split('\n').slice(2)).toEqual([
      'IT IS ORDERED THAT:',
      'The hearing on 14 October is adjourned.',
      'Costs in the case.',
      'No order as to costs.',
    ]);
  });

  it("puts plain text wording into the order as the applicant's lines, without making them clauses", async () => {
    await app.close();
    app = await bootApp({
      application: { ...APPLICATION, whatOrderWanted: '1. The hearing is adjourned.\n2. Costs reserved.\n\nWhy.' },
    });
    const page = await openPage((await app.get(PAGE)).text);
    check('application-decision', 'grant');

    expect(page.documentText()).toContain('1. The hearing is adjourned.\n2. Costs reserved.\n\nWhy.');
    expect(clauseLists()).toEqual([]);
  });

  it('keeps a separate order preview for each decision', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('application-decision', 'grant');
    check('application-decision', 'dismiss');
    expect(page.documentText()).toContain('The application is dismissed.');
    expect(page.documentText()).not.toContain('The hearing on 14 October is adjourned.');
    expect(control<HTMLButtonElement>('[data-restore-requested-wording]').hidden).toBe(true);

    check('application-decision', 'grant');
    expect(page.documentText().match(/The hearing on 14 October is adjourned\./g)).toHaveLength(1);
    expect(page.documentText()).not.toContain('The application is dismissed.');
  });

  it("keeps the judge's deletions when they reopen the order, until they reset to the applicant's wording", async () => {
    await openPage((await app.get(PAGE)).text);
    check('application-decision', 'grant');
    // The judge deletes the applicant's clause about costs.
    const snapshot = JSON.parse(control<HTMLTextAreaElement>('#order-document').value);
    const wording = snapshot.current.content.find((node: { attrs?: { id?: string | null } }) => !node.attrs?.id);
    wording.content.pop();
    await app.close();
    app = await bootApp({
      application: APPLICATION,
      order: {
        id: 'order-saved',
        version: 4,
        orderType: 'APPLICATION_DECISION',
        formData: { 'application-decision': 'grant' },
        docweaveSnapshot: snapshot,
      },
    });

    const reopened = await openPage((await app.get(`${PAGE}&orderId=order-saved`)).text);
    expect(reopened.documentText()).toContain('The hearing on 14 October is adjourned.');
    expect(reopened.documentText()).not.toContain('Costs in the case.');

    control<HTMLButtonElement>('[data-restore-requested-wording]').click();
    expect(reopened.documentText()).toContain('Costs in the case.');
    expect(reopened.documentText().match(/The hearing on 14 October is adjourned\./g)).toHaveLength(1);
  });

  it('orders the application dismissed', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('application-decision', 'dismiss');
    expect(page.orderText()).toContain('The application is dismissed.');
  });

  it('lists the application for a hearing, on notice unless the judge says otherwise', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    const listing = document.querySelector<HTMLElement>('[data-decision-shows="list"]');
    expect(listing?.hidden).toBe(true);
    check('application-decision', 'list');
    expect(listing?.hidden).toBe(false);
    expect(page.orderText()).toContain('The application is listed for a hearing on notice to the other parties.');
    check('application-list-notice', 'without-notice');
    expect(page.orderText()).toContain('The application is listed for a hearing without notice.');
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
      const requested = control<HTMLElement>('#application-requested');
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
      check('application-decision', 'grant');

      expect(page.documentText().split('\n').slice(2)).toEqual([
        'IT IS ORDERED THAT:',
        'The defendant asks that:',
        'The hearing on 14 October is adjourned.',
        'to a date after 28 days;',
        'Unless the defendant complies with paragraph 1 above, costs are reserved.',
        'Why: counsel is unwell.',
      ]);
      // One numbered list of two clauses, the first with its own subclause, and the first of the order's lists.
      expect(clauseLists()).toEqual([2]);
      const snapshot = JSON.stringify(JSON.parse(control<HTMLTextAreaElement>('#order-document').value).current);
      expect(snapshot).toContain('"marks":[{"type":"strong"}],"text":"adjourned"');
      expect(snapshot).toMatch(/"type":"list_item".*"type":"ordered_list".*to a date after 28 days/);
    });

    it("keeps bullets out of the clause numbers, so the applicant's next numbered clause keeps its number", async () => {
      await app.close();
      app = await bootApp({
        application: {
          ...RICH,
          whatOrderWanted:
            '<ol><li><p>Adjourn the hearing.</p></li><li><p>Costs reserved.</p></li></ol>' +
            '<ul><li><p>The defendant is in hospital.</p><ol><li><p>since Monday;</p></li></ol></li>' +
            '<li>Counsel is unavailable.</li></ul>' +
            '<ol start="3"><li><p>Liberty to apply.</p></li></ol>',
        },
      });
      const page = await openPage((await app.get(PAGE)).text);
      check('application-decision', 'grant');
      expect(page.documentText().split('\n').slice(3)).toEqual([
        'Adjourn the hearing.',
        'Costs reserved.',
        '\u2022 The defendant is in hospital.',
        'since Monday;',
        '\u2022 Counsel is unavailable.',
        'Liberty to apply.',
      ]);
      // Clauses 1 and 2, the bullets (their numbered list kept), then clause 3: the order numbers its lists on.
      expect(clauseLists()).toEqual([2, 1]);
      const snapshot = JSON.stringify(JSON.parse(control<HTMLTextAreaElement>('#order-document').value).current);
      expect(snapshot).toMatch(/"type":"bullet_list".*"type":"ordered_list".*since Monday;/);
    });

    it('starts another clause with what follows a subclause, as a clause can only end with its subclauses', async () => {
      await app.close();
      app = await bootApp({
        application: {
          ...RICH,
          whatOrderWanted:
            '<ol><li><p>The defendant must:</p><ol><li><p>pay the rent;</p></li></ol><p>by 4pm.</p></li>' +
            '<li><p>Costs reserved.</p></li></ol>',
        },
      });
      const page = await openPage((await app.get(PAGE)).text);
      check('application-decision', 'grant');
      expect(page.documentText().split('\n').slice(3)).toEqual([
        'The defendant must:',
        'pay the rent;',
        'by 4pm.',
        'Costs reserved.',
      ]);
      expect(clauseLists()).toEqual([3]);
    });
  });

  it('offers the decisions on an application to suspend the warrant on every application', async () => {
    await openPage((await app.get(PAGE)).text);
    const warrant = control<HTMLElement>('#application-decision-warrant').closest('fieldset');
    expect(warrant?.querySelector('legend')?.textContent?.trim()).toBe(
      'Application to suspend the warrant of possession'
    );
    expect([...(warrant?.querySelectorAll('label') ?? [])].map(label => label.textContent?.trim())).toEqual([
      'Granted',
      'Dismissed',
    ]);
  });

  it('suspends the warrant of possession on the conditions a suspended possession order has', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    const conditions = control<HTMLElement>('[data-decision-shows="suspend-warrant"]');
    expect(conditions.hidden).toBe(true);
    check('application-decision', 'suspend-warrant');
    expect(conditions.hidden).toBe(false);

    type('warrant-arrears', '850');
    check('warrant-payment-terms', 'instalments');
    type('warrant-instalment-amount', '25');
    type('warrant-instalment-frequency', 'weekly');
    typeDate('warrant-instalment-date', '6', '11', '2026');

    expect(page.orderText().split('\n').slice(2)).toEqual([
      'IT IS ORDERED THAT:',
      'The warrant of possession is suspended on condition that the defendant pays (i) the rent as it falls due plus (ii) the arrears of £850.00 by payments of £25.00 to the claimant every week, the first instalment to be paid on or before 6 November 2026.',
      'Payment of the above instalments made to the claimant shall be applied first to any arrears prior to any order for costs.',
    ]);
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    expect((await app.post(PAGE, body)).status).toBe(302);
  });

  it('needs the conditions to suspend the warrant', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('application-decision', 'suspend-warrant');
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Enter valid arrears');
    expect(rejected.text).toContain('Select a one-off payment or instalments');
  });

  it('dismisses an application to suspend the warrant, saying when the eviction may go ahead', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('application-decision', 'refuse-warrant-suspension');
    expect(control<HTMLElement>('[data-decision-shows="refuse-warrant-suspension"]').hidden).toBe(false);
    typeDate('warrant-eviction-date', '23', '10', '2026');

    expect(page.orderText().split('\n').slice(3)).toEqual([
      'The application to suspend the execution of the warrant of possession is dismissed.',
      'For the avoidance of doubt subject to any further order of the court, the execution of the warrant of possession on 23 October 2026 may take place.',
    ]);
  });

  it('needs the date the eviction may go ahead to dismiss an application to suspend the warrant', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('application-decision', 'refuse-warrant-suspension');
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Enter a valid date the eviction may take place');
  });

  it('needs a decision before review', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Select what you decide about the application');
    await openPage(rejected.text);
    // The decision is asked over two rows, and its error is shown once, on the first.
    expect([...document.querySelectorAll('.govuk-error-message')].map(error => error.textContent?.trim())).toEqual([
      'Error: Select what you decide about the application',
    ]);
  });
});
