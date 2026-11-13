import { DateTime } from 'luxon';

import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  check,
  control,
  openPage,
  recordAttendance,
  submittedOrders,
  typeDate,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;
const REVIEW = `/case/${CASE_REFERENCE}/confirm-order-review`;

const OWN_INITIATIVE =
  "As this order was made on the court's own initiative, any party affected by the order may apply to set aside, " +
  'vary, or stay the order. Any such application must be made by 4pm on';
const WITHOUT_NOTICE =
  'If you were not notified of the application before this order was made, you may apply to set aside, vary, or ' +
  'stay the order. Any such application must be made by 4pm on';

const APPLICATION = {
  id: 'gen-app-1',
  reference: 'GA1',
  type: 'Adjourn the hearing',
  applicant: 'Alex Example (Defendant 1)',
  submittedOn: '2026-10-01',
  withoutNotice: 'YES',
  whatOrderWanted: 'The hearing is adjourned.',
  documents: [],
};

/** Seven days from today, or the Monday after when that is a weekend. */
function sevenDaysOn(): DateTime {
  const date = DateTime.now().setZone('Europe/London').startOf('day').plus({ days: 7 });
  return date.weekday === 6 ? date.plus({ days: 2 }) : date.weekday === 7 ? date.plus({ days: 1 }) : date;
}

describe("make an order: made on the court's own initiative or without notice", () => {
  let app: TestApp;
  afterEach(() => app.close());

  it('says nothing unless the judge chooses, then ends the order with the statement and its date', async () => {
    app = await bootApp();
    const page = await openPage((await app.get(PAGE)).text);
    expect(control('[name="order-notice"][value="none"]').checked).toBe(true);
    expect(page.orderText()).not.toContain('set aside');

    check('order-notice', 'own-initiative');
    const due = sevenDaysOn();
    expect(control('[name="own-initiative-by-day"]').value).toBe(String(due.day));
    expect(page.orderText().split('\n').at(-1)).toBe(`${OWN_INITIATIVE} ${due.toFormat('d MMMM yyyy')}.`);

    typeDate('own-initiative-by', '4', '12', '2026');
    expect(page.orderText().split('\n').at(-1)).toBe(`${OWN_INITIATIVE} 4 December 2026.`);
    check('order-notice', 'without-notice');
    typeDate('without-notice-by', '7', '12', '2026');
    expect(page.orderText()).not.toContain(OWN_INITIATIVE);
    expect(page.orderText().split('\n').at(-1)).toBe(`${WITHOUT_NOTICE} 7 December 2026.`);
    check('order-notice', 'none');
    expect(page.orderText()).not.toContain('set aside');
  });

  it('needs a real date to apply by before review, and keeps the choice and date on the saved order', async () => {
    app = await bootApp();
    const page = await openPage((await app.get(PAGE)).text);
    recordAttendance();
    check('outright-possession', 'forthwith');
    check('outright-grounds-type', 'mandatory');
    check('order-notice', 'own-initiative');
    typeDate('own-initiative-by', '31', '2', '2027');

    const refused = await app.post(PAGE, page.body('SUBMIT_FOR_REVIEW'));
    expect(refused.status).toBe(400);
    expect(refused.text).toContain('Enter a real date by which a party may apply to set aside, vary or stay the order');

    const corrected = await openPage(refused.text);
    expect(control('[name="order-notice"][value="own-initiative"]').checked).toBe(true);
    typeDate('own-initiative-by', '1', '3', '2027');
    expect((await app.post(PAGE, corrected.body('SUBMIT_FOR_REVIEW'))).status).toBe(302);
    const [sent] = submittedOrders() as { order: { formData: Record<string, unknown> } }[];
    expect(sent.order.formData).toMatchObject({
      'order-notice': 'own-initiative',
      'own-initiative-by-day': '1',
      'own-initiative-by-month': '3',
      'own-initiative-by-year': '2027',
    });

    const reopened = await openPage((await app.get(PAGE)).text);
    expect(control('[name="order-notice"][value="own-initiative"]').checked).toBe(true);
    expect(reopened.documentText()).toContain(`${OWN_INITIATIVE} 1 March 2027.`);
  });

  it("keeps the judge's own wording on an order deciding an application without notice, which court staff review", async () => {
    app = await bootApp({ application: APPLICATION });
    const page = await openPage((await app.get(`${PAGE}?genAppId=gen-app-1`)).text);
    check('app-gen-app-1-decision', 'grant');
    control<HTMLButtonElement>('[data-insert-requested-wording]').click();
    expect(page.documentText()).toContain('The hearing is adjourned.');

    check('order-notice', 'without-notice');
    typeDate('without-notice-by', '8', '12', '2026');

    const text = page.documentText();
    expect(text).toContain('The hearing is adjourned.');
    expect(text.split('\n').at(-1)).toBe(`${WITHOUT_NOTICE} 8 December 2026.`);
    expect((await app.post(`${PAGE}?genAppId=gen-app-1`, page.body('SUBMIT_FOR_REVIEW'))).status).toBe(302);
    const [{ order }] = submittedOrders() as { order: Record<string, unknown> }[];
    await app.close();

    // Court staff review the order as the judge left it, and can change the date.
    app = await bootApp({
      caseworker: true,
      application: APPLICATION,
      order: { ...order, id: 'order-awaiting-review', version: 3 },
    });
    await app.get(`${REVIEW}?orderId=order-awaiting-review&taskId=task-1`);
    const review = await openPage((await app.get(`${REVIEW}/review`)).text);
    expect(control('[name="order-notice"][value="without-notice"]').checked).toBe(true);
    expect(review.documentText()).toContain('The hearing is adjourned.');
    expect(review.documentText()).toContain(`${WITHOUT_NOTICE} 8 December 2026.`);
    typeDate('without-notice-by', '9', '12', '2026');
    expect(review.documentText()).toContain(`${WITHOUT_NOTICE} 9 December 2026.`);
    expect(review.documentText()).toContain('The hearing is adjourned.');
  });
});
