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
  workingDate,
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
  adjournment: true,
  whatOrderWanted: 'I am in hospital.',
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

    // Both statements default to 10 days, to the next working day, unless the judge changes it.
    check('order-notice', 'own-initiative');
    const defaultDate = workingDate(10);
    expect(dateValues('own-initiative-by')).toEqual(Object.values(defaultDate));
    expect(page.orderText().split('\n').at(-1)).toBe(`${OWN_INITIATIVE} ${shown(defaultDate)}.`);
    const pills = [...document.querySelectorAll<HTMLElement>('#own-initiative-by-pills [data-date-pill-days]')];
    expect(pills.map(pill => pill.textContent)).toEqual(['10 days', '14 days', '28 days']);
    expect(dateValues('without-notice-by')).toEqual(Object.values(defaultDate));

    typeDate('own-initiative-by', '4', '12', '2026');
    expect(page.orderText().split('\n').at(-1)).toBe(`${OWN_INITIATIVE} 4 December 2026.`);
    check('order-notice', 'without-notice');
    typeDate('without-notice-by', '7', '12', '2026');
    expect(page.orderText()).not.toContain(OWN_INITIATIVE);
    expect(page.orderText().split('\n').at(-1)).toBe(`${WITHOUT_NOTICE} 7 December 2026.`);
    check('order-notice', 'none');
    expect(page.orderText()).not.toContain('set aside');
  });

  it('moves a date to apply by off a weekend or bank holiday, as the court office is closed then', async () => {
    // A bank holiday on the working day 10 days would give, so the date runs to the next one.
    const due = workingDate(10);
    const holiday = `${due.year}-${due.month}-${due.day}`;
    app = await bootApp({ bankHolidays: [holiday] });
    await openPage((await app.get(PAGE)).text);
    check('order-notice', 'own-initiative');
    const after = workingDate(10, [holiday]);
    expect(dateValues('own-initiative-by')).toEqual([after.day, after.month, after.year]);

    // The quick dates for it are working days too.
    control<HTMLButtonElement>('#own-initiative-by-pills [data-date-pill-days="14"]').click();
    const fortnight = workingDate(14, [holiday]);
    expect(dateValues('own-initiative-by')).toEqual([fortnight.day, fortnight.month, fortnight.year]);
    expect([0, 6]).not.toContain(
      new Date(Number(fortnight.year), Number(fortnight.month) - 1, Number(fortnight.day)).getDay()
    );
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

  it('keeps the adjournment on an order deciding an application without notice', async () => {
    app = await bootApp({ application: APPLICATION });
    const page = await openPage((await app.get(`${PAGE}?genAppId=gen-app-1`)).text);
    check('app-gen-app-1-decision', 'adjourn');
    check('app-gen-app-1-adjourn-type', 'generally');
    expect(page.documentText()).toContain('The hearing is adjourned generally');

    check('order-notice', 'without-notice');
    const due = futureDate(25);
    typeDate('without-notice-by', due.day, due.month, due.year);

    const text = page.documentText();
    expect(text).toContain('The hearing is adjourned generally');
    expect(text.split('\n').at(-1)).toBe(`${WITHOUT_NOTICE} ${shown(due)}.`);
    expect((await app.post(`${PAGE}?genAppId=gen-app-1`, page.body('SUBMIT_FOR_REVIEW'))).status).toBe(302);
  });

  it('offers the default date, not one kept from before, on a draft saved with neither', async () => {
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
    const defaultDate = workingDate(10);
    expect(dateValues('own-initiative-by')).toEqual(Object.values(defaultDate));
    expect(dateValues('without-notice-by')).toEqual(Object.values(defaultDate));

    expect((await app.post(PAGE, page.body('SAVE_DRAFT'))).status).toBe(302);
    const [saved] = submittedOrders() as { order: { formData: Record<string, unknown> } }[];
    expect(Object.keys(saved.order.formData).filter(field => /-by-(day|month|year)$/.test(field))).toEqual([]);

    const reopened = await openPage((await app.get(PAGE)).text);
    check('order-notice', 'own-initiative');
    expect(dateValues('own-initiative-by')).toEqual(Object.values(defaultDate));
    expect(reopened.orderText().split('\n').at(-1)).toBe(`${OWN_INITIATIVE} ${shown(defaultDate)}.`);
  });

  it('changes nothing else as the judge changes the statement or decides an application without notice', async () => {
    app = await bootApp({ application: APPLICATION });
    const page = await openPage((await app.get(`${PAGE}?genAppId=gen-app-1`)).text);

    // An order on an application without a hearing starts without notice, which the judge may change.
    check('app-gen-app-1-decision', 'dismiss');
    expect(control('[name="order-notice"][value="without-notice"]').checked).toBe(true);
    const defaultDate = workingDate(10);
    expect(page.orderText().split('\n').at(-1)).toBe(`${WITHOUT_NOTICE} ${shown(defaultDate)}.`);

    check('order-notice', 'own-initiative');
    const due = futureDate(20);
    typeDate('own-initiative-by', due.day, due.month, due.year);
    check('order-notice', 'without-notice');
    expect(dateValues('without-notice-by')).toEqual(Object.values(defaultDate));
    check('order-notice', 'own-initiative');
    expect(dateValues('own-initiative-by')).toEqual([due.day, due.month, due.year]);

    check('app-gen-app-1-decision', 'dismiss');
    expect(control('[name="order-notice"][value="own-initiative"]').checked).toBe(true);
    expect(dateValues('own-initiative-by')).toEqual([due.day, due.month, due.year]);
    expect(page.orderText().split('\n').at(-1)).toBe(`${OWN_INITIATIVE} ${shown(due)}.`);

    // A date the judge asks for with a quick date button is theirs.
    check('order-notice', 'without-notice');
    control<HTMLButtonElement>('#without-notice-by-pills [data-date-pill-days="14"]').click();
    expect(dateValues('without-notice-by')).toEqual(Object.values(workingDate(14)));
  });

  it.each(['own-initiative', 'without-notice'])(
    'leaves an older %s draft without a deadline until the judge picks one',
    async choice => {
      app = await bootApp({
        order: { id: 'draft-1', orderType: 'FREE_FORM', formData: { 'order-notice': choice } },
      });
      await openPage((await app.get(PAGE)).text);

      const prefix = `${choice}-by`;
      expect(control(`[name="order-notice"][value="${choice}"]`).checked).toBe(true);
      expect(dateValues(prefix)).toEqual(['', '', '']);
      control<HTMLButtonElement>(`#${prefix}-pills [data-date-pill-days="10"]`).click();
      expect(dateValues(prefix)).toEqual(Object.values(workingDate(10)));
    }
  );

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
    const docweaveSnapshot = JSON.parse(control<HTMLTextAreaElement>('#order-document').value);

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
      order: {
        id: 'order-awaiting-review',
        version: 3,
        orderType: 'FREE_FORM',
        formData: passed,
        docweaveSnapshot,
      },
    });
    await app.get(`${REVIEW}?orderId=order-awaiting-review&taskId=task-1`);
    const review = await openPage((await app.get(`${REVIEW}/review`)).text);
    const notIssued = await app.post(`${REVIEW}/review`, review.body('ISSUE'));
    expect(notIssued.status).toBe(400);
    expect(notIssued.text).toContain('must be today or in the future. Return the order to the Judge with a query.');
  });

  it('starts with the answer the judges agreed for how the order is made', async () => {
    const opened = async (options: Parameters<typeof bootApp>[0]): Promise<string> => {
      app = await bootApp(options);
      await openPage((await app.get(PAGE)).text);
      const answer = control('[name="order-notice"]:checked').value;
      await app.close();
      return answer;
    };
    const suspension = { ...APPLICATION, id: 'gen-app-2', type: 'Suspend enforcement', enforcementSuspension: true };

    expect(await opened({ hearing: null })).toBe('own-initiative');
    expect(await opened({ hearing: null, applications: [APPLICATION] })).toBe('without-notice');
    expect(await opened({ hearing: null, applications: [suspension] })).toBe('none');
    app = await bootApp({ applications: [APPLICATION] });
    await openPage((await app.get(PAGE)).text);
    expect(control('[name="order-notice"]:checked').value).toBe('none');
  });
});
