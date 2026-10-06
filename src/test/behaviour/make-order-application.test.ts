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
  });

  it("orders the application granted, leaving the applicant's wording for the judge to add", async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('application-decision', 'grant');

    expect(page.orderText()).toBe(
      [
        'UPON the application of Jane Doe (Defendant) dated 1 October 2026 (GA2) to adjourn the hearing',
        'AND UPON the Court considering the application without a hearing',
        'IT IS ORDERED THAT:',
        'The application is granted.',
      ].join('\n')
    );
    expect(control<HTMLButtonElement>('[data-use-requested-wording]').disabled).toBe(false);

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

  it("does not offer the applicant's wording again once the judge has added it", async () => {
    await app.close();
    app = await bootApp({
      application: APPLICATION,
      orderReturnedToJudge: { orderType: 'APPLICATION_DECISION', formData: { 'application-wording-added': 'yes' } },
    });
    await openPage((await app.get(`${PAGE}&orderId=order-returned`)).text);
    const button = control<HTMLButtonElement>('[data-use-requested-wording]');
    expect(button.disabled).toBe(true);
    expect(button.textContent?.trim()).toBe('Added to the order preview');
  });

  it('lists the application for a hearing, on notice unless the judge says otherwise', async () => {
    const page = await openPage((await app.get(PAGE)).text);
    check('application-decision', 'list');
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
