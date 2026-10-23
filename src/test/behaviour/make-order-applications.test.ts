import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  check,
  control,
  openPage,
  recordAttendance,
  selectTab,
  startClientContexts,
  submittedOrders,
  type,
  typeDate,
  uncheck,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;
/** The page as a court staff message's task opens it, on the application it asks the judge to decide. */
const TASK_PAGE = `${PAGE}?genAppId=gen-app-1`;
/** What the first application's answers start with. */
const P = 'app-gen-app-1';

const ADJOURN = {
  id: 'gen-app-1',
  reference: 'GA1',
  type: 'Adjourn the hearing',
  applicant: 'Alex Example (Defendant 1)',
  submittedOn: '2026-10-01',
  within14Days: 'YES',
  otherPartiesAgreed: 'NO',
  withoutNotice: 'NO',
  whatOrderWanted: '1. The hearing on 14 October is adjourned.\n2. Costs in the case.',
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

const GRANTED = "The defendant's application dated 1 October 2026 is granted.";
const WORDING = '1. The hearing on 14 October is adjourned.\n2. Costs in the case.';

/** Puts the applicant's wording in the order, as the judge does with the application's button. */
function insertWording(reference = 'GA1'): void {
  control<HTMLButtonElement>(`[data-application-reference="${reference}"] [data-insert-requested-wording]`).click();
}

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
        'GA2: Something else – Suspend the warrant of possession',
      ]);
      expect(control<HTMLDetailsElement>(`details#${P}-more`).open).toBe(false);
      expect(control(`[name="${P}-decision"][value="none"]`).checked).toBe(true);
      expect(control('[name="app-gen-app-2-decision"][value="none"]').checked).toBe(true);
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
      typeDate('app-gen-app-2-eviction-date', '23', '10', '2026');

      const text = page.documentText();
      expect(text).toContain("UPON considering the defendant's application dated 9 October 2026");
      expect(text).not.toContain('1 October 2026');
      expect(ordered(text)).toEqual([
        'IT IS ORDERED THAT:',
        'The claim is adjourned generally with liberty to restore by application by any party on notice to all other parties.',
        'The application to suspend the execution of the warrant of possession is dismissed.',
        'For the avoidance of doubt subject to any further order of the court, the execution of the warrant of possession on 23 October 2026 may take place.',
      ]);

      expect((await app.post(PAGE, page.body('SUBMIT_FOR_REVIEW'))).status).toBe(302);
      const [submitted] = submittedOrders() as { order: { formData: Record<string, unknown> } }[];
      expect(submitted.order.formData[`${P}-decision`]).toBe('none');
      expect(submitted.order.formData['app-gen-app-2-decision']).toBe('dismiss');
    });

    it("keeps the applicant's wording the judge inserted as they order on the claim and stop again", async () => {
      const page = await openPage((await app.get(PAGE)).text);
      recordAttendance();
      check(`${P}-decision`, 'grant');
      insertWording();
      check('claim-order', 'yes');
      selectTab('tab-adjournment');
      check('adj-type', 'generally');
      expect(ordered(page.documentText())).toEqual([
        'IT IS ORDERED THAT:',
        'The claim is adjourned generally with liberty to restore by application by any party on notice to all other parties.',
        GRANTED,
        ...WORDING.split('\n'),
      ]);
      expect(control('#order-type').value).toBe('ADJOURNMENT');

      uncheck('claim-order', 'yes');
      expect(control<HTMLElement>('[data-claim-order]').hidden).toBe(true);
      expect(control('#order-type').value).toBe('NO_ORDER_ON_CLAIM');
      expect(page.documentText()).not.toContain('The claim is adjourned generally');
      // Ticking again goes back to the tab the judge had open.
      check('claim-order', 'yes');
      expect(control('#order-type').value).toBe('ADJOURNMENT');
      expect(page.documentText().match(/The hearing on 14 October is adjourned\./g)).toHaveLength(1);
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
      expect(document.querySelector('h1')?.textContent).toBe('Make an order');
      expect(startClientContexts()).toEqual([{ genAppId: 'gen-app-1' }]);
      // Made without a hearing: no one attended.
      expect(document.querySelector('[data-attendance-row]')).toBeNull();
      expect(control<HTMLDetailsElement>(`details#${P}-more`).open).toBe(true);
      expect(control<HTMLDetailsElement>('details#app-gen-app-2-more').open).toBe(false);
      expect(document.querySelector(`[name="${P}-decision"]:checked`)).toBeNull();
      expect(control(`#${P}-details`).textContent).toContain('Alex Example (Defendant 1)');
      expect(control<HTMLAnchorElement>(`#${P}-details a`).href).toContain(
        `/case/${CASE_REFERENCE}/view-documents/3f2a6c1e-0000-4000-8000-000000000001`
      );
      expect(control(`#${P}-requested`).innerHTML.trim()).toBe(
        '<p>1. The hearing on 14 October is adjourned.<br>2. Costs in the case.</p>'
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

    it("grants it in a clause naming it, puts the applicant's lines after it only on request, then the costs", async () => {
      const page = await openPage((await app.get(TASK_PAGE)).text);
      const button = control<HTMLButtonElement>('[data-application-reference="GA1"] [data-insert-requested-wording]');
      expect(button.closest<HTMLElement>('[hidden]')).not.toBeNull();
      check(`${P}-decision`, 'grant');
      expect(button.closest<HTMLElement>('[hidden]')).toBeNull();
      expect(page.documentText()).not.toContain('The hearing on 14 October is adjourned.');
      insertWording();
      check('costs', 'yes');
      check('costs-choice', 'def-pay-cl-fixed');
      type('costs-def-pay-cl-fixed-amount', '150');

      expect(ordered(page.documentText())).toEqual([
        'IT IS ORDERED THAT:',
        GRANTED,
        ...WORDING.split('\n'),
        "The defendant shall pay the claimant's costs of the application in the fixed sum of £150.00.",
      ]);
      // The applicant's lines are one clause after the granted one, as they wrote them, then the costs.
      expect(clauseLists()).toEqual([2, 1]);
    });

    it('offers no wording to insert when the applicant asked for no order', async () => {
      await app.close();
      app = await bootApp({ application: { ...ADJOURN, whatOrderWanted: null } });
      const page = await openPage((await app.get(TASK_PAGE)).text);
      expect(document.querySelector('[data-insert-requested-wording]')).toBeNull();
      check(`${P}-decision`, 'grant');
      expect(ordered(page.orderText())).toEqual(['IT IS ORDERED THAT:', GRANTED]);
    });

    it('keeps the wording the judge inserted when the decision changes', async () => {
      const page = await openPage((await app.get(TASK_PAGE)).text);
      check(`${P}-decision`, 'grant');
      insertWording();
      check(`${P}-decision`, 'dismiss');
      expect(page.documentText()).toContain("The defendant's application dated 1 October 2026 is dismissed.");
      expect(page.documentText()).not.toContain('is granted.');
      check(`${P}-decision`, 'grant');
      expect(page.documentText().match(/The hearing on 14 October is adjourned\./g)).toHaveLength(1);
      expect(page.documentText()).not.toContain('is dismissed.');
    });

    it("keeps the judge's deletion of the wording when they reopen the order, until they insert it again", async () => {
      await openPage((await app.get(TASK_PAGE)).text);
      check(`${P}-decision`, 'grant');
      insertWording();
      // The judge deletes the applicant's clause: the inserted one, with no id.
      const snapshot = JSON.parse(control<HTMLTextAreaElement>('#order-document').value);
      const dropInserted = (node: { attrs?: { id?: string | null }; content?: unknown[] }): void => {
        node.content = node.content?.filter(
          child =>
            !(
              (child as { attrs?: { id?: string | null } }).attrs?.id === undefined &&
              JSON.stringify(child).includes('Costs in the case')
            )
        );
        node.content?.forEach(child => dropInserted(child as typeof node));
      };
      dropInserted(snapshot.current);
      await app.close();
      app = await bootApp({
        application: ADJOURN,
        order: {
          id: 'order-saved',
          version: 4,
          orderType: 'NO_ORDER_ON_CLAIM',
          formData: { [`${P}-decision`]: 'grant' },
          docweaveSnapshot: snapshot,
        },
      });

      const reopened = await openPage((await app.get(`${TASK_PAGE}&orderId=order-saved`)).text);
      expect(reopened.documentText()).toContain(GRANTED);
      expect(reopened.documentText()).not.toContain('Costs in the case.');
      insertWording();
      expect(reopened.documentText().match(/Costs in the case\./g)).toHaveLength(1);
    });

    it('lists the application for a hearing on notice, asking when as an adjournment does', async () => {
      const page = await openPage((await app.get(TASK_PAGE)).text);
      const listing = control<HTMLElement>('[data-application-reference="GA1"] [data-decision-shows="list"]');
      expect(listing.hidden).toBe(true);
      check(`${P}-decision`, 'list');
      expect(listing.hidden).toBe(false);
      const rejected = await app.post(TASK_PAGE, page.body('SUBMIT_FOR_REVIEW'));
      expect(rejected.text).toContain('Enter a valid hearing date');
      expect(rejected.text).toContain('Enter the time estimate as a whole number');

      check(`${P}-list-when`, 'specific');
      typeDate(`${P}-list-hearing-date-specific`, '2', '11', '2026');
      type(`${P}-list-specific-time`, '10:30');
      type(`${P}-list-time-estimate`, '30');
      check(`${P}-list-directions`, 'defence');
      typeDate(`${P}-list-defence-date`, '20', '10', '2026');
      expect(ordered(page.orderText()).slice(1)).toEqual([
        "The defendant's application dated 1 October 2026 shall be listed for a hearing on notice to all parties on 2 November 2026 at 10:30am with a time estimate of 30 minutes.",
        'The defendant must by 4pm on 20 October 2026 submit to the court and all other parties a defence.',
      ]);
    });
  });

  describe('on an application to suspend the warrant of possession', () => {
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

    it('grants it on the conditions a suspended possession order has, which it needs', async () => {
      const page = await openPage((await app.get(WARRANT_PAGE)).text);
      const conditions = control<HTMLElement>('[data-decision-shows="grant"]');
      expect(conditions.hidden).toBe(true);
      check(`${W}-decision`, 'grant');
      expect(conditions.hidden).toBe(false);
      const rejected = await app.post(WARRANT_PAGE, page.body('SUBMIT_FOR_REVIEW'));
      expect(rejected.text).toContain('Enter valid arrears');
      expect(rejected.text).toContain('Select a one-off payment or instalments');

      type(`${W}-warrant-arrears`, '850');
      check(`${W}-warrant-payment-terms`, 'instalments');
      type(`${W}-warrant-instalment-amount`, '25');
      type(`${W}-warrant-instalment-frequency`, 'weekly');
      typeDate(`${W}-warrant-instalment-date`, '6', '11', '2026');
      expect(page.orderText().split('\n')).toEqual([
        'UPON the Court considering the papers without a hearing',
        "AND UPON considering the second defendant's application dated 9 October 2026",
        'IT IS ORDERED THAT:',
        'The warrant of possession is suspended on condition that the defendants pay (i) the rent as it falls due plus (ii) the arrears of £850.00 by payments of £25.00 to the claimant every week, the first instalment to be paid on or before 6 November 2026.',
        'Payment of the above instalments made to the claimant shall be applied first to any arrears prior to any order for costs.',
      ]);
      expect((await app.post(WARRANT_PAGE, page.body('SUBMIT_FOR_REVIEW'))).status).toBe(302);
    });

    it('dismisses it saying when the eviction may go ahead, which it needs', async () => {
      const page = await openPage((await app.get(WARRANT_PAGE)).text);
      check(`${W}-decision`, 'dismiss');
      expect(control<HTMLElement>('[data-decision-shows="dismiss"]').hidden).toBe(false);
      const rejected = await app.post(WARRANT_PAGE, page.body('SUBMIT_FOR_REVIEW'));
      expect(rejected.text).toContain('Enter a valid date the eviction may take place');

      typeDate(`${W}-eviction-date`, '23', '10', '2026');
      expect(ordered(page.orderText()).slice(1)).toEqual([
        'The application to suspend the execution of the warrant of possession is dismissed.',
        'For the avoidance of doubt subject to any further order of the court, the execution of the warrant of possession on 23 October 2026 may take place.',
      ]);
    });
  });
});
