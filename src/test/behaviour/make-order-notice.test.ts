import { DateTime } from 'luxon';

import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  check,
  control,
  futureDate,
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

/** The parts of an apply-by date as the page shows them. */
function dateValues(prefix: string): string[] {
  return ['day', 'month', 'year'].map(part => control(`[name="${prefix}-${part}"]`).value);
}

/** A date as the order gives it. */
function shown({ day, month, year }: { day: string; month: string; year: string }): string {
  return DateTime.fromObject({ day: Number(day), month: Number(month), year: Number(year) }).toFormat('d MMMM yyyy');
}

describe("make an order: made on the court's own initiative or without notice", () => {
  let app: TestApp;
  afterEach(() => app.close());

  it('says nothing unless the judge chooses, then ends the order with the statement and its date', async () => {
    app = await bootApp();
    const page = await openPage((await app.get(PAGE)).text);
    expect(control('[name="order-notice"][value="none"]').checked).toBe(true);
    expect(page.orderText()).not.toContain('set aside');

    // No date is suggested: the judge gives one.
    check('order-notice', 'own-initiative');
    expect(dateValues('own-initiative-by')).toEqual(['', '', '']);
    expect(document.body.textContent).not.toContain('7 days');
    expect(page.orderText().split('\n').at(-1)).toBe(`${OWN_INITIATIVE} [date not provided].`);

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
    const due = futureDate(30);
    typeDate('own-initiative-by', '31', '2', due.year);

    const refused = await app.post(PAGE, page.body('SUBMIT_FOR_REVIEW'));
    expect(refused.status).toBe(400);
    expect(refused.text).toContain('Enter a real date by which a party may apply to set aside, vary or stay the order');

    const corrected = await openPage(refused.text);
    expect(control('[name="order-notice"][value="own-initiative"]').checked).toBe(true);
    typeDate('own-initiative-by', due.day, due.month, due.year);
    expect((await app.post(PAGE, corrected.body('SAVE_DRAFT'))).status).toBe(302);
    const [saved] = submittedOrders() as { order: { formData: Record<string, unknown> } }[];
    expect(saved.order.formData).toMatchObject({
      'order-notice': 'own-initiative',
      'own-initiative-by-day': due.day,
      'own-initiative-by-month': due.month,
      'own-initiative-by-year': due.year,
    });
    expect(Object.keys(saved.order.formData).filter(field => field.startsWith('without-notice-by'))).toEqual([]);

    const reopened = await openPage((await app.get(PAGE)).text);
    expect(control('[name="order-notice"][value="own-initiative"]').checked).toBe(true);
    expect(reopened.documentText()).toContain(`${OWN_INITIATIVE} ${shown(due)}.`);
    expect((await app.post(PAGE, reopened.body('SUBMIT_FOR_REVIEW'))).status).toBe(302);
    const sent = submittedOrders().at(-1) as { action: string; order: { formData: Record<string, unknown> } };
    expect(sent.action).toBe('SUBMIT_FOR_REVIEW');
    expect(sent.order.formData).toMatchObject({ 'order-notice': 'own-initiative', 'own-initiative-by-day': due.day });
  });

  it("keeps the judge's own wording on an order deciding an application without notice, which court staff review", async () => {
    app = await bootApp({ application: APPLICATION });
    const page = await openPage((await app.get(`${PAGE}?genAppId=gen-app-1`)).text);
    check('app-gen-app-1-decision', 'grant');
    control<HTMLButtonElement>('[data-insert-requested-wording]').click();
    expect(page.documentText()).toContain('The hearing is adjourned.');

    check('order-notice', 'without-notice');
    const due = futureDate(25);
    typeDate('without-notice-by', due.day, due.month, due.year);

    const text = page.documentText();
    expect(text).toContain('The hearing is adjourned.');
    expect(text.split('\n').at(-1)).toBe(`${WITHOUT_NOTICE} ${shown(due)}.`);
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
    expect(review.documentText()).toContain(`${WITHOUT_NOTICE} ${shown(due)}.`);
    const later = futureDate(26);
    typeDate('without-notice-by', later.day, later.month, later.year);
    expect(review.documentText()).toContain(`${WITHOUT_NOTICE} ${shown(later)}.`);
    expect(review.documentText()).toContain('The hearing is adjourned.');
  });

  it('leaves a blank date blank, not one kept from before, on a draft saved with neither', async () => {
    // A draft saved by an earlier page, which kept dates for choices not made.
    app = await bootApp({
      order: {
        id: 'draft-1',
        version: 4,
        orderType: 'FREE_FORM',
        formData: {
          'order-notice': 'none',
          'own-initiative-by-day': '1',
          'own-initiative-by-month': '1',
          'own-initiative-by-year': '2026',
        },
      },
    });
    const page = await openPage((await app.get(PAGE)).text);
    expect(control('[name="own-initiative-by-day"]').value).toBe('');

    expect((await app.post(PAGE, page.body('SAVE_DRAFT'))).status).toBe(302);
    const [saved] = submittedOrders() as { order: { formData: Record<string, unknown> } }[];
    expect(Object.keys(saved.order.formData).filter(field => /-by-(day|month|year)$/.test(field))).toEqual([]);

    const reopened = await openPage((await app.get(PAGE)).text);
    check('order-notice', 'own-initiative');
    expect(dateValues('own-initiative-by')).toEqual(['', '', '']);
    expect(reopened.orderText().split('\n').at(-1)).toBe(`${OWN_INITIATIVE} [date not provided].`);
  });

  it('changes nothing else as the judge changes the statement or decides an application without notice', async () => {
    app = await bootApp({ application: APPLICATION });
    const page = await openPage((await app.get(`${PAGE}?genAppId=gen-app-1`)).text);

    // Deciding an application whose applicant asked for it without notice leaves the statement to the judge.
    check('app-gen-app-1-decision', 'grant');
    expect(control('[name="order-notice"][value="none"]').checked).toBe(true);
    expect(page.orderText()).not.toContain('set aside');

    check('order-notice', 'own-initiative');
    const due = futureDate(20);
    typeDate('own-initiative-by', due.day, due.month, due.year);
    check('order-notice', 'without-notice');
    expect(dateValues('without-notice-by')).toEqual(['', '', '']);
    check('order-notice', 'own-initiative');
    expect(dateValues('own-initiative-by')).toEqual([due.day, due.month, due.year]);

    check('app-gen-app-1-decision', 'dismiss');
    expect(control('[name="order-notice"][value="own-initiative"]').checked).toBe(true);
    expect(dateValues('own-initiative-by')).toEqual([due.day, due.month, due.year]);
    expect(page.orderText().split('\n').at(-1)).toBe(`${OWN_INITIATIVE} ${shown(due)}.`);

    // A date the judge asks for with a quick date button is theirs.
    check('order-notice', 'without-notice');
    control<HTMLButtonElement>('#without-notice-by-pills [data-date-pill-days="14"]').click();
    expect(dateValues('without-notice-by')).toEqual(Object.values(futureDate(14)));
  });

  it('leaves a date the judge cleared blank when it asks for one, rather than fill it in again', async () => {
    app = await bootApp();
    const page = await openPage((await app.get(PAGE)).text);
    recordAttendance();
    check('outright-possession', 'forthwith');
    check('outright-grounds-type', 'mandatory');
    check('order-notice', 'without-notice');
    typeDate('without-notice-by', '', '', '');

    const refused = await app.post(PAGE, page.body('SUBMIT_FOR_REVIEW'));

    expect(refused.status).toBe(400);
    expect(refused.text).toContain('Enter a real date by which a party may apply to set aside, vary or stay the order');
    await openPage(refused.text);
    expect(control('[name="order-notice"][value="without-notice"]').checked).toBe(true);
    expect(['day', 'month', 'year'].map(part => control(`[name="without-notice-by-${part}"]`).value)).toEqual([
      '',
      '',
      '',
    ]);
  });

  it('keeps a date the judge chose on their draft, but will not send or issue it once it has passed', async () => {
    const yesterday = DateTime.now().setZone('Europe/London').minus({ days: 1 });
    const passed = {
      'order-notice': 'own-initiative',
      'own-initiative-by-day': String(yesterday.day),
      'own-initiative-by-month': String(yesterday.month),
      'own-initiative-by-year': String(yesterday.year),
    };
    app = await bootApp({ order: { id: 'draft-1', version: 4, orderType: 'FREE_FORM', formData: passed } });
    const page = await openPage((await app.get(PAGE)).text);
    expect(control('[name="own-initiative-by-day"]').value).toBe(String(yesterday.day));
    recordAttendance();

    const refused = await app.post(PAGE, page.body('SUBMIT_FOR_REVIEW'));
    expect(refused.status).toBe(400);
    expect(refused.text).toContain(
      'The date by which a party may apply to set aside, vary or stay the order must be today or in the future'
    );
    expect(submittedOrders()).toEqual([]);
    await app.close();

    // Nor will court staff issue an order whose date passed while it waited for review.
    app = await bootApp({
      caseworker: true,
      order: { id: 'order-awaiting-review', version: 3, orderType: 'FREE_FORM', formData: passed },
    });
    await app.get(`${REVIEW}?orderId=order-awaiting-review&taskId=task-1`);
    const review = await openPage((await app.get(`${REVIEW}/review`)).text);
    recordAttendance();
    const notIssued = await app.post(`${REVIEW}/review`, review.body('ISSUE'));
    expect(notIssued.status).toBe(400);
    expect(notIssued.text).toContain(
      'must be today or in the future. If the date needs to change, you can send a query to the Judge to return the order to them'
    );
  });
});
