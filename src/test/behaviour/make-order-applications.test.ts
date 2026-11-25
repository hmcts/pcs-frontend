import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  check,
  control,
  offered,
  openPage,
  recordAttendance,
  selectTab,
  startClientContexts,
  submittedOrders,
  type,
  typeDate,
  uncheck,
  writeInPreview,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;
/** The page as a court staff message's task opens it, on the application it asks the judge to decide. */
const TASK_PAGE = `${PAGE}?genAppId=gen-app-1`;
/** What the first application's answers start with. */
const P = 'app-gen-app-1';
/** The case bundle pcs-api gives a judge. */
const CASE_BUNDLE = {
  id: 'b0b0b0b0-0000-4000-8000-000000000002',
  fileName: '1234-case-bundle.pdf',
  updatedAt: '2026-10-07T22:24:17Z',
};

const ADJOURN = {
  id: 'gen-app-1',
  reference: 'GA1',
  type: 'Adjourn the hearing',
  adjournment: true,
  applicant: 'Alex Example (Defendant 1)',
  submittedOn: '2026-10-01',
  within14Days: 'YES',
  otherPartiesAgreed: 'NO',
  withoutNotice: 'NO',
  whatOrderWanted: 'I am in hospital that week.',
  listed: false,
  documents: [{ id: '3f2a6c1e-0000-4000-8000-000000000001', fileName: 'hospital-letter.pdf' }],
};

const WARRANT = {
  id: 'gen-app-2',
  reference: 'GA2',
  type: 'Suspend enforcement',
  somethingElseDetails: null,
  enforcementSuspension: true,
  applicant: 'Alex Example (Defendant 1)',
  submittedOn: '2026-10-09',
  whatOrderWanted: null,
  listed: false,
  documents: [],
};

/** The order's lines from "IT IS ORDERED THAT:" on. */
function ordered(text: string): string[] {
  const lines = text.split('\n');
  return lines.slice(lines.indexOf('IT IS ORDERED THAT:'));
}

/** The number of clauses in each numbered list of the order the page will submit. */
function clauseLists(): number[] {
  const snapshot = JSON.parse(control<HTMLTextAreaElement>('#order-document').value);
  return snapshot.current.content
    .filter((node: { type: string }) => node.type === 'ordered_list')
    .map((node: { content: unknown[] }) => node.content.length);
}

describe('make an order: deciding applications', () => {
  let app: TestApp;
  afterEach(() => app.close());

  it('links the whole file download once the case has a bundle', async () => {
    app = await bootApp();
    await openPage((await app.get(PAGE)).text);
    expect(document.querySelector('#case-bundle-link')).toBeNull();
    await app.close();

    app = await bootApp({ caseBundle: CASE_BUNDLE });
    await openPage((await app.get(PAGE)).text);

    const link = document.querySelector<HTMLAnchorElement>('#case-bundle-link');
    expect(link?.href).toContain(`/case/${CASE_REFERENCE}/view-documents/${CASE_BUNDLE.id}`);
    expect(link?.textContent).toBe('Whole file download (opens in new tab)');
    expect(link?.target).toBe('_blank');
    expect(document.body.textContent).toContain('Last updated 7 October 2026 at 11:24pm');
  });

  describe('at a hearing', () => {
    beforeEach(async () => {
      app = await bootApp({ applications: [ADJOURN, WARRANT] });
    });

    it('lists every open application before the claim, folded away, with nothing decided', async () => {
      await openPage((await app.get(PAGE)).text);
      // The claim's order types wait behind a tick box, so the order starts as one on the applications alone.
      const claimTabs = control<HTMLElement>('[data-claim-order]');
      expect(
        control<HTMLElement>('[data-applications]').compareDocumentPosition(claimTabs) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(claimTabs.hidden).toBe(true);
      expect(control('#order-type').value).toBe('NO_ORDER_ON_CLAIM');
      const rows = [...document.querySelectorAll<HTMLElement>('[data-application]')];
      expect(rows.map(row => row.querySelector('h3')?.textContent?.trim())).toEqual([
        'GA1: Adjourn the hearing',
        'GA2: Suspend enforcement',
      ]);
      expect(control<HTMLDetailsElement>(`details#${P}-more`).open).toBe(false);
      expect(control(`[name="${P}-decision"][value="none"]`).checked).toBe(true);
      expect(control('[name="app-gen-app-2-decision"][value="none"]').checked).toBe(true);
    });

    it('says which applications an earlier order listed for a hearing, still to be decided', async () => {
      await app.close();
      app = await bootApp({ applications: [ADJOURN, { ...WARRANT, listed: true }] });
      await openPage((await app.get(PAGE)).text);
      const tags = [...document.querySelectorAll<HTMLElement>('[data-application]')].map(
        row => row.querySelector('h3 .govuk-tag')?.textContent?.trim() ?? null
      );
      expect(tags).toEqual([null, 'Listed for hearing']);
      expect(control('[name="app-gen-app-2-decision"][value="none"]').checked).toBe(true);
    });

    it('offers no striking out at a hearing, and refuses it', async () => {
      const page = await openPage((await app.get(PAGE)).text);
      const decisions = [...document.querySelectorAll<HTMLInputElement>(`[name="${P}-decision"]:enabled`)].map(
        input => input.value
      );
      expect(decisions).toEqual(['none', 'adjourn', 'dismiss', 'list', 'freeform']);
      expect(
        control(`[name="${P}-decision"][value="strike-out"]`).closest<HTMLElement>('.govuk-radios__item')!.hidden
      ).toBe(true);
      recordAttendance();
      const body = page.body('SUBMIT_FOR_REVIEW');
      body.set(`${P}-decision`, 'strike-out');
      const rejected = await app.post(PAGE, body);
      expect(rejected.status).toBe(400);
      expect(rejected.text).toContain('Select what you decide about application GA1');
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

    it('puts each decided application after the claim, with a recital, and leaves the rest alone', async () => {
      const page = await openPage((await app.get(PAGE)).text);
      recordAttendance();
      check('claim-order', 'yes');
      selectTab('tab-adjournment');
      check('adj-type', 'generally');
      check('app-gen-app-2-decision', 'dismiss');

      const text = page.documentText();
      expect(text).toContain("UPON considering the defendant's application dated 9 October 2026");
      expect(text).not.toContain('1 October 2026');
      expect(ordered(text)).toEqual([
        'IT IS ORDERED THAT:',
        'The claim is adjourned generally with liberty to restore by application by any party on notice to all other parties.',
        "The defendant's application dated 9 October 2026 to suspend enforcement is dismissed.",
      ]);

      expect((await app.post(PAGE, page.body('SUBMIT_FOR_REVIEW'))).status).toBe(302);
      const [submitted] = submittedOrders() as { order: { formData: Record<string, unknown> } }[];
      expect(submitted.order.formData[`${P}-decision`]).toBe('none');
      expect(submitted.order.formData['app-gen-app-2-decision']).toBe('dismiss');
    });

    it("keeps an application's clause as the judge orders on the claim and stops again", async () => {
      const page = await openPage((await app.get(PAGE)).text);
      recordAttendance();
      check(`${P}-decision`, 'dismiss');
      check('claim-order', 'yes');
      selectTab('tab-adjournment');
      check('adj-type', 'generally');
      expect(ordered(page.documentText())).toEqual([
        'IT IS ORDERED THAT:',
        'The claim is adjourned generally with liberty to restore by application by any party on notice to all other parties.',
        "The defendant's application dated 1 October 2026 is dismissed.",
      ]);
      expect(control('#order-type').value).toBe('ADJOURNMENT');

      uncheck('claim-order', 'yes');
      expect(control<HTMLElement>('[data-claim-order]').hidden).toBe(true);
      expect(control('#order-type').value).toBe('NO_ORDER_ON_CLAIM');
      expect(page.documentText()).not.toContain('The claim is adjourned generally');
      // Ticking again goes back to the tab the judge had open.
      check('claim-order', 'yes');
      expect(control('#order-type').value).toBe('ADJOURNMENT');
      expect(page.documentText().match(/application dated 1 October 2026 is dismissed\./g)).toHaveLength(1);
    });
  });

  describe("from a court staff message's task", () => {
    beforeEach(async () => {
      app = await bootApp({ application: ADJOURN, applications: [WARRANT] });
    });

    it('opens the one page from the XUI task link, with that application first, open and to be decided', async () => {
      const launch = await app.get(
        `/cases/${CASE_REFERENCE}/event/ext:makeOrder?expected_sub=judge-uid&genAppId=gen-app-1&taskId=task-1`
      );
      expect(launch.location).toBe(`${PAGE}?taskId=task-1&genAppId=gen-app-1`);

      const page = await openPage((await app.get(launch.location!)).text);
      check('order-notice', 'none');
      expect(document.querySelector('h1')?.textContent).toBe('Make an order');
      expect(startClientContexts()).toEqual([{ genAppId: 'gen-app-1' }]);
      // Made without a hearing: no one attended.
      expect(offered('[data-attendance-row]')).toBe(false);
      expect(control<HTMLDetailsElement>(`details#${P}-more`).open).toBe(true);
      expect(control<HTMLDetailsElement>('details#app-gen-app-2-more').open).toBe(false);
      expect(document.querySelector(`[name="${P}-decision"]:checked`)).toBeNull();
      // On the papers it may be struck out.
      expect(document.querySelector(`[name="${P}-decision"][value="strike-out"]`)).not.toBeNull();
      expect(control(`#${P}-details`).textContent).toContain('Alex Example (Defendant 1)');
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
      expect((await app.post(launch.location!, page.body('SUBMIT_FOR_REVIEW'))).status).toBe(302);
      const [submitted] = submittedOrders() as { order: Record<string, unknown>; taskId: string; hearing: unknown }[];
      expect(submitted.order.orderType).toBe('NO_ORDER_ON_CLAIM');
      expect(submitted.order).not.toHaveProperty('genAppId');
      expect(submitted.hearing).toBeNull();
      expect(submitted.taskId).toBe('task-1');
    });

    it('needs a decision on the application the task asked about, and a real one on any other', async () => {
      const page = await openPage((await app.get(TASK_PAGE)).text);
      check('order-notice', 'none');
      const body = page.body('SUBMIT_FOR_REVIEW');
      body.set('app-gen-app-2-decision', 'nonsense');
      const rejected = await app.post(TASK_PAGE, body);
      expect(rejected.status).toBe(400);
      await openPage(rejected.text);
      expect([...document.querySelectorAll('.govuk-error-message')].map(error => error.textContent?.trim())).toEqual([
        'Error: Select what you decide about application GA1',
        'Error: Select what you decide about application GA2',
      ]);
    });

    it('needs the decision written in the order when the judge decides an application freeform', async () => {
      const page = await openPage((await app.get(TASK_PAGE)).text);
      check('order-notice', 'none');
      check(`${P}-decision`, 'freeform');
      const rejected = await app.post(TASK_PAGE, page.body('SUBMIT_FOR_REVIEW'));
      expect(rejected.status).toBe(400);
      const again = await openPage(rejected.text);
      expect([...document.querySelectorAll('.govuk-error-message')].map(error => error.textContent?.trim())).toEqual([
        'Error: Write the decision on application GA1 in the order',
      ]);

      writeInPreview('The hearing on 14 October is adjourned to the first open date after 28 days.');
      expect((await app.post(TASK_PAGE, again.body('SUBMIT_FOR_REVIEW'))).status).toBe(302);
    });

    it("puts the application's clauses before the costs", async () => {
      const page = await openPage((await app.get(TASK_PAGE)).text);
      check('order-notice', 'none');
      check(`${P}-decision`, 'dismiss');
      check('costs', 'yes');
      check('costs-choice', 'def-pay-cl-fixed');
      type('costs-def-pay-cl-fixed-amount', '150');

      expect(ordered(page.documentText())).toEqual([
        'IT IS ORDERED THAT:',
        "The defendant's application dated 1 October 2026 is dismissed.",
        "The defendant shall pay the claimant's costs of the application in the fixed sum of £150.00.",
      ]);
      expect(clauseLists()).toEqual([1, 1]);
    });

    it("shows what the applicant asked for and why, and refuses taking an applicant's wording", async () => {
      const page = await openPage((await app.get(TASK_PAGE)).text);
      check('order-notice', 'none');
      expect(document.querySelector(`[name="${P}-decision"][value="applicant-wording"]`)).toBeNull();
      expect(control(`#${P}-explanation`).textContent?.trim()).toBe('I am in hospital that week.');
      check(`${P}-decision`, 'freeform');
      expect(ordered(page.orderText())).toEqual(['IT IS ORDERED THAT:']);
      const body = page.body('SUBMIT_FOR_REVIEW');
      body.set(`${P}-decision`, 'applicant-wording');
      const rejected = await app.post(TASK_PAGE, body);
      expect(rejected.status).toBe(400);
      expect(rejected.text).toContain('Select what you decide about application GA1');
    });

    it('lists the application for a hearing on notice, asking when as an adjournment does', async () => {
      const page = await openPage((await app.get(TASK_PAGE)).text);
      check('order-notice', 'none');
      const listing = control<HTMLElement>('[data-application-reference="GA1"] [data-decision-shows="list"]');
      expect(listing.hidden).toBe(true);
      check(`${P}-decision`, 'list');
      expect(listing.hidden).toBe(false);
      const rejected = await app.post(TASK_PAGE, page.body('SUBMIT_FOR_REVIEW'));
      expect(rejected.text).toContain('Enter a valid hearing date');
      expect(rejected.text).toContain(
        'Enter the time estimate in whole days, hours and minutes, with minutes under 60'
      );

      check(`${P}-list-when`, 'specific');
      typeDate(`${P}-list-hearing-date-specific`, '2', '11', '2026');
      type(`${P}-list-specific-time`, '10:30');
      type(`${P}-list-time-estimate-minutes`, '30');
      check(`${P}-list-directions`, 'defence');
      typeDate(`${P}-list-defence-date`, '20', '10', '2026');
      expect(ordered(page.orderText()).slice(1)).toEqual([
        "The defendant's application dated 1 October 2026 shall be listed for a hearing on notice to all parties on 2 November 2026 at 10:30am with a time estimate of 30 minutes.",
        'The defendant must by 4pm on 20 October 2026 submit to the court and all other parties a defence.',
      ]);
    });
  });

  describe('on an application to adjourn a hearing', () => {
    beforeEach(async () => {
      app = await bootApp({ application: ADJOURN, applications: [WARRANT] });
    });

    it('adjourns the hearing generally or to a further hearing, asking when as the adjournment tab does', async () => {
      const page = await openPage((await app.get(TASK_PAGE)).text);
      check('order-notice', 'none');
      const adjournment = control<HTMLElement>('[data-application-reference="GA1"] [data-decision-shows="adjourn"]');
      expect(adjournment.hidden).toBe(true);
      check(`${P}-decision`, 'adjourn');
      expect(adjournment.hidden).toBe(false);
      expect((await app.post(TASK_PAGE, page.body('SUBMIT_FOR_REVIEW'))).text).toContain('Select an adjournment type');

      check(`${P}-adjourn-type`, 'generally');
      expect(ordered(page.orderText()).slice(1)).toEqual([
        'The hearing is adjourned generally with liberty to restore by application by any party on notice to all other parties.',
      ]);

      check(`${P}-adjourn-type`, 'further-hearing');
      expect((await app.post(TASK_PAGE, page.body('SUBMIT_FOR_REVIEW'))).text).toContain('Enter a valid hearing date');
      check(`${P}-adjourn-when`, 'specific');
      typeDate(`${P}-adjourn-hearing-date-specific`, '2', '11', '2026');
      type(`${P}-adjourn-specific-time`, '10:30');
      type(`${P}-adjourn-time-estimate-minutes`, '30');
      expect(ordered(page.orderText()).slice(1)).toEqual([
        'The hearing shall be adjourned to be heard on 2 November 2026 at 10:30am with a time estimate of 30 minutes.',
      ]);
      expect((await app.post(TASK_PAGE, page.body('SUBMIT_FOR_REVIEW'))).status).toBe(302);
      const [submitted] = submittedOrders() as { order: Record<string, unknown> }[];
      expect(submitted.order.applicationDecisions).toEqual([{ genAppId: 'gen-app-1', decision: 'DISPOSED' }]);
    });

    it('offers adjourning only on an application to adjourn, and refuses it on another', async () => {
      const page = await openPage((await app.get(TASK_PAGE)).text);
      const decisions = (name: string): string[] =>
        [...document.querySelectorAll<HTMLInputElement>(`[name="${name}"]`)].map(input => input.value);
      expect(decisions(`${P}-decision`)).toEqual([
        'none',
        'adjourn',
        'dismiss',
        'strike-out',
        'list',
        'freeform',
      ]);
      expect(decisions('app-gen-app-2-decision')).not.toContain('adjourn');
      const body = page.body('SUBMIT_FOR_REVIEW');
      body.set(`${P}-decision`, 'dismiss');
      body.set('app-gen-app-2-decision', 'adjourn');
      const rejected = await app.post(TASK_PAGE, body);
      expect(rejected.status).toBe(400);
      expect(rejected.text).toContain('Select what you decide about application GA2');
    });
  });

  describe('listing an application when the case has hearings to come', () => {
    beforeEach(async () => {
      app = await bootApp({
        application: ADJOURN,
        hearings: [
          { id: 7, date: '2020-03-02T10:00:00' },
          { id: 8, date: '2099-01-12T10:00:00' },
        ],
      });
    });

    it('lists it to be heard at a hearing the case already has, which asks nothing more', async () => {
      const page = await openPage((await app.get(TASK_PAGE)).text);
      check('order-notice', 'none');
      check(`${P}-decision`, 'list');
      const choices = [...document.querySelectorAll<HTMLInputElement>(`input[name="${P}-list-at"]`)];
      // A hearing already held is not one to list it at.
      expect(choices.map(choice => choice.labels?.[0]?.textContent?.trim())).toEqual([
        'A new hearing',
        'The hearing on 12 January 2099 at 10:00am',
      ]);
      const listNew = control<HTMLElement>(`#conditional-${P}-list-at`);
      expect(listNew.classList).not.toContain('govuk-radios__conditional--hidden');

      check(`${P}-list-at`, '8');
      expect(listNew.classList).toContain('govuk-radios__conditional--hidden');
      expect(ordered(page.orderText()).slice(1)).toEqual([
        "The defendant's application dated 1 October 2026 shall be heard at the hearing on 12 January 2099 at 10:00am.",
      ]);
      const accepted = await app.post(TASK_PAGE, page.body('SUBMIT_FOR_REVIEW'));
      expect(accepted.text).not.toContain('Enter a valid hearing date');
      const [submitted] = submittedOrders() as { order: { formData: Record<string, unknown> } }[];
      expect(submitted.order.formData[`${P}-list-at`]).toBe('8');
    });

    it('lists it at a new hearing without notice to the other parties', async () => {
      const page = await openPage((await app.get(TASK_PAGE)).text);
      check('order-notice', 'none');
      check(`${P}-decision`, 'list');
      check(`${P}-list-without-notice`, 'yes');
      typeDate(`${P}-list-hearing-date-next-list`, '2', '11', '2026');
      type(`${P}-list-time-estimate-minutes`, '30');
      expect(ordered(page.orderText()).slice(1)).toEqual([
        "The defendant's application dated 1 October 2026 shall be listed for a hearing without notice to the other parties on the next available possession list after 2 November 2026 with a time estimate of 30 minutes. Further details of the hearing will be provided by the court.",
      ]);
    });
  });

  describe('on an application to suspend enforcement', () => {
    const WARRANT_PAGE = `${PAGE}?genAppId=gen-app-2`;
    const W = 'app-gen-app-2';

    beforeEach(async () => {
      // The second of two defendants applies, so the order says which, and that both defendants pay.
      app = await bootApp({
        defendants: [
          { id: 'defendant-1', name: 'Alex Example' },
          { id: 'defendant-2', name: 'Sam Example' },
        ],
        application: { ...WARRANT, applicant: 'Sam Example (Defendant 2)' },
      });
    });

    it('suspends it on the conditions a suspended possession order has, which it needs', async () => {
      const page = await openPage((await app.get(WARRANT_PAGE)).text);
      const conditions = control<HTMLElement>('[data-decision-shows="suspend"]');
      expect(conditions.hidden).toBe(true);
      check(`${W}-decision`, 'suspend');
      expect(conditions.hidden).toBe(false);
      const rejected = await app.post(WARRANT_PAGE, page.body('SUBMIT_FOR_REVIEW'));
      expect(rejected.text).toContain('Enter valid arrears');
      expect(rejected.text).toContain('Select a one-off payment or instalments');

      type(`${W}-suspension-arrears`, '850');
      check(`${W}-suspension-payment-terms`, 'instalments');
      type(`${W}-suspension-instalment-amount`, '25');
      type(`${W}-suspension-instalment-frequency`, 'weekly');
      typeDate(`${W}-suspension-instalment-date`, '6', '11', '2026');
      expect(page.orderText().split('\n')).toEqual([
        'UPON the Court considering the papers without a hearing',
        "AND UPON considering the second defendant's application dated 9 October 2026",
        'IT IS ORDERED THAT:',
        'Enforcement of the possession order is suspended on condition that the defendants pay (i) the rent as it falls due plus (ii) the arrears of £850.00 by payments of £25.00 to the claimant every week, the first instalment to be paid on or before 6 November 2026.',
        'Payment of the above instalments made to the claimant shall be applied first to any arrears prior to any order for costs.',
      ]);
      expect((await app.post(WARRANT_PAGE, page.body('SUBMIT_FOR_REVIEW'))).status).toBe(302);
    });

    it('offers no striking out, and refuses it', async () => {
      const page = await openPage((await app.get(WARRANT_PAGE)).text);
      const decisions = [...document.querySelectorAll<HTMLInputElement>(`[name="${W}-decision"]`)].map(
        input => input.value
      );
      expect(decisions).toEqual(['none', 'suspend', 'dismiss', 'list', 'freeform']);
      const body = page.body('SUBMIT_FOR_REVIEW');
      body.set(`${W}-decision`, 'strike-out');
      const rejected = await app.post(WARRANT_PAGE, body);
      expect(rejected.status).toBe(400);
      expect(rejected.text).toContain('Select what you decide about application GA2');
    });

    it('dismisses it with nothing more to answer', async () => {
      const page = await openPage((await app.get(WARRANT_PAGE)).text);
      check(`${W}-decision`, 'dismiss');
      expect(ordered(page.orderText()).slice(1)).toEqual([
        "The second defendant's application dated 9 October 2026 to suspend enforcement is dismissed.",
      ]);
      expect((await app.post(WARRANT_PAGE, page.body('SUBMIT_FOR_REVIEW'))).status).toBe(302);
    });
  });

  describe('whether each applicant asked for their application to be made without notice', () => {
    const WITHOUT_NOTICE = {
      id: 'gen-app-3',
      reference: 'GA3',
      type: 'Something else',
      somethingElseDetails: 'Stop the eviction',
      applicant: 'Alex Example (Defendant 1)',
      submittedOn: '2026-10-11',
      withoutNotice: 'YES',
      withoutNoticeReason: 'Risk of harm',
      whatOrderWanted: null,
      documents: [],
    };

    /** What an application's details say of its request, by the row's key. */
    function detailsRow(prefix: string): string | undefined {
      return [...document.querySelectorAll(`#${prefix}-details .govuk-summary-list__row`)]
        .find(row => row.querySelector('dt')?.textContent?.trim() === 'Without notice requested')
        ?.querySelector('dd')
        ?.textContent?.trim();
    }

    it('retains the recorded notice status and request warning in the details without a header label', async () => {
      // GA1 asked not to be without notice, GA2 was made before the question was asked, GA3 asked to be.
      app = await bootApp({ applications: [ADJOURN, WARRANT, WITHOUT_NOTICE] });
      await openPage((await app.get(PAGE)).text);

      expect(document.querySelector('[id$="-notice-request"]')).toBeNull();
      expect([detailsRow('app-gen-app-1'), detailsRow('app-gen-app-2'), detailsRow('app-gen-app-3')]).toEqual([
        'No',
        'Not recorded',
        'Yes: Risk of harm',
      ]);
      // A request is not a promise of who is told.
      expect(control('#app-gen-app-3-more').textContent).toContain(
        'The applicant asked for this application to be made without notice.'
      );
      expect(document.body.textContent).not.toContain('will be told');
    });
  });
});
