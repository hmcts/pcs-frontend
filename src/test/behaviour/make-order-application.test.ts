import { requestedParagraphs } from '../../main/assets/js/make-order/wording/application';

import { CASE_REFERENCE, type TestApp, bootApp, check, control, openPage, submittedOrders } from './harness';

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
  whatOrderWanted: '1. The hearing on 14 October is adjourned.\n2. Costs in the case.',
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
    expect(submitted.order.orderType).toBe('APPLICATION_DECISION');
  });

  it("splits the applicant's wording into paragraphs, keeping lines they wrapped by hand together", () => {
    expect(
      requestedParagraphs(
        '1. The hearing be adjourned so the defendant can get\nlegal advice.\n2) Costs reserved.\n\nWhy.'
      )
    ).toEqual(['The hearing be adjourned so the defendant can get legal advice.', 'Costs reserved.', 'Why.']);
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
    const listing = document.querySelector<HTMLElement>('[data-application-listing]');
    expect(listing?.hidden).toBe(true);
    check('application-decision', 'list');
    expect(listing?.hidden).toBe(false);
    expect(page.orderText()).toContain('The application is listed for a hearing on notice to the other parties.');
    check('application-list-notice', 'without-notice');
    expect(page.orderText()).toContain('The application is listed for a hearing without notice.');
  });

  it('needs a decision before review', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    const body = page.body();
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const rejected = await app.post(PAGE, body);
    expect(rejected.status).toBe(400);
    expect(rejected.text).toContain('Select what you decide about the application');
  });
});
