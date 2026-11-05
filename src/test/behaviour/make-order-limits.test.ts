import { CASE_REFERENCE, type TestApp, bootApp, openPage, recordAttendance, selectTab } from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;

describe('make an order: limits', () => {
  let app: TestApp;
  beforeEach(async () => {
    app = await bootApp();
  });
  afterEach(() => app.close());

  /** Sends the order for review with the given answers over the page's own, and returns the error summary's messages: none if it was sent. */
  async function errors(tab: string, answers: Record<string, string>): Promise<string[]> {
    const page = await openPage((await app.get(PAGE)).text);
    selectTab(tab);
    recordAttendance();
    const body = page.body();
    Object.entries(answers).forEach(([name, value]) => body.set(name, value));
    body.set('action', 'SUBMIT_FOR_REVIEW');
    const response = await app.post(PAGE, body);
    if (response.status === 302) {
      return [];
    }
    expect(response.status).toBe(400);
    await openPage(response.text);
    // Each error shows on the field the summary links to, as well as in the summary.
    return [...document.querySelectorAll<HTMLAnchorElement>('#make-order-error-summary a')].map(link => {
      const message = link.textContent!.trim();
      expect(document.querySelector(`${link.hash}-error`)?.textContent).toContain(message);
      return message;
    });
  }

  it('keeps hearing notes, recitals and the staff message to 30,000 characters, listing errors in page order', async () => {
    const tooLong = 'a'.repeat(30001);
    expect(
      await errors('tab-free-form', {
        'hearing-notes': tooLong,
        recitals: 'yes',
        'recitals-text': tooLong,
        'staff-message': 'yes',
        'staff-message-text': tooLong,
      })
    ).toEqual([
      'Hearing notes must be 30,000 characters or less',
      'Recitals must be 30,000 characters or less',
      'Staff message must be 30,000 characters or less',
    ]);
  });

  it('asks for the staff message once the judge has ticked it', async () => {
    expect(
      await errors('tab-free-form', {
        'staff-message': 'yes',
        'staff-message-text': '  ',
      })
    ).toEqual(['Enter a message for court staff']);
  });

  it('counts a new line as one character, and ignores text the judge has not asked to include', async () => {
    // Browsers post a new line as two characters.
    const atTheLimit = `${'a'.repeat(29998)}\r\na`;
    expect(
      await errors('tab-free-form', {
        'hearing-notes': atTheLimit,
        'recitals-text': 'a'.repeat(30001),
        'staff-message-text': 'a'.repeat(30001),
      })
    ).toEqual([]);
  });

  it('keeps the details of grounds to 100 characters', async () => {
    const outright = { 'outright-possession': 'forthwith', 'outright-grounds-type': 'mandatory' };
    expect(await errors('tab-outright', { ...outright, 'outright-grounds-details': 'a'.repeat(100) })).toEqual([]);
    expect(await errors('tab-outright', { ...outright, 'outright-grounds-details': 'a'.repeat(101) })).toEqual([
      'Details of grounds must be 100 characters or less',
    ]);
  });

  it('takes amounts of up to £1,000,000,000 in pounds and pence', async () => {
    const judgment = {
      'outright-possession': 'forthwith',
      'outright-grounds-type': 'mandatory',
      'outright-options': 'money-judgment',
      'outright-mj-sections': 'arrears',
      costs: 'yes',
      'costs-choice': 'def-pay-cl-fixed',
    };
    expect(
      await errors('tab-outright', {
        ...judgment,
        'current-rent': '1,000,000,000',
        'outright-mj-arrears': '1000000000.00',
        'outright-mj-interest': '0.5',
        'costs-def-pay-cl-fixed-amount': '355',
      })
    ).toEqual([]);
    expect(
      await errors('tab-outright', {
        ...judgment,
        'arrears-notice': '-5',
        'current-rent': '750.001',
        'arrears-today': '1000000000.01',
        'outright-mj-arrears': '2,000,000,000',
        'outright-mj-interest': 'ten pounds',
        'costs-def-pay-cl-fixed-amount': '1000000001',
      })
    ).toEqual([
      'Enter valid arrears at notice',
      'Enter a valid current rent',
      'Arrears today must be £1,000,000,000 or less',
      'Arrears amount must be £1,000,000,000 or less',
      'Enter a valid interest amount',
      'Costs amount must be £1,000,000,000 or less',
    ]);
  });

  it('takes adjourned payments every week, fortnight or month', async () => {
    const payments = {
      'adj-type': 'generally',
      'adj-gen': 'payments',
      'adj-gen-payments-amount': '100',
      'adj-gen-payments-date-day': '1',
      'adj-gen-payments-date-month': '10',
      'adj-gen-payments-date-year': '2026',
    };
    expect(await errors('tab-adjournment', { ...payments, 'adj-gen-payments-frequency': 'fortnightly' })).toEqual([]);
    expect(await errors('tab-adjournment', { ...payments, 'adj-gen-payments-frequency': 'yearly' })).toEqual([
      'Select weekly, fortnightly or monthly payments',
    ]);
  });

  it('needs a real time for a hearing on a specific date', async () => {
    const hearing = {
      'adj-type': 'further-hearing',
      'adj-when': 'specific',
      'adj-hearing-date-specific-day': '1',
      'adj-hearing-date-specific-month': '10',
      'adj-hearing-date-specific-year': '2026',
      'adj-time-estimate': '30',
    };
    for (const time of ['10:30am', '2 p.m.', '14:30', '09.15', '12am']) {
      expect(await errors('tab-adjournment', { ...hearing, 'adj-specific-time': time })).toEqual([]);
    }
    expect(await errors('tab-adjournment', { ...hearing, 'adj-specific-time': '' })).toEqual([
      'Enter the time of hearing',
    ]);
    for (const time of ['25:00', '13pm', '0:30am', '1030', 'after lunch']) {
      expect(await errors('tab-adjournment', { ...hearing, 'adj-specific-time': time })).toEqual([
        'Enter a valid time of hearing, like 10:30am or 14:30',
      ]);
    }
  });
});
