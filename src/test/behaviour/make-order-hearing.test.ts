import { DateTime } from 'luxon';

import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  control,
  openPage,
  recordAttendance,
  refuseNextEvent,
  selectTab,
  startClientContexts,
  submittedOrders,
  type,
  typeDate,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;
const FOR_HEARING = `${PAGE}?hearingId=7`;

/** The hearing as pcs-api starts the order for it: the last hearing's facts, and the case's earlier notes. */
const HEARING = {
  id: 7,
  date: '2026-10-13T10:00:00',
  version: null,
  caseFacts: {
    tenancyStartDate: '2020-02-03',
    tenancyType: 'SECURE_TENANCY',
    currentRent: 900,
    rentFrequency: 'MONTHLY',
    arrearsToday: 1200,
    lastPaymentDate: '2026-08-01',
  },
  recorded: { by: 'DJ Howard Daley', on: '2026-09-01T15:30:00Z' },
  note: null,
  earlierNotes: [
    {
      by: 'DJ Howard Daley',
      createdOn: '2026-09-01T15:30:00Z',
      hearingDate: '2026-09-01T10:00:00',
      note: 'Turned up with x and y.\nMade clear needs to do x and y.',
    },
    { by: 'HHJ Anesh Pema', createdOn: '2026-07-20T09:00:00Z', hearingDate: null, note: 'Read the papers.' },
  ],
};

/** The tenancy types the judge can choose from, after the blank first option. */
function tenancyTypes(): string[] {
  return [...document.querySelectorAll('#tenancy-type option')].slice(1).map(option => option.textContent!.trim());
}

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('make an order: for a hearing', () => {
  let app: TestApp;
  afterEach(() => app.close());

  it('starts from the facts the last hearing recorded, under a blank note and the earlier notes', async () => {
    app = await bootApp({ hearing: HEARING });

    await openPage((await app.get(FOR_HEARING)).text);

    // The link's hearing goes to pcs-api, which starts the order for it.
    expect(startClientContexts()).toEqual([{ hearingId: '7' }]);
    expect(control('#case-facts-source').textContent).toBe('Last updated by DJ Howard Daley on 1 September 2026.');
    expect(control('[name="current-rent"]').value).toBe('900');
    expect(control('[name="arrears-today"]').value).toBe('1200');
    expect(control('[name="date-last-payment-month"]').value).toBe('8');
    expect(control<HTMLTextAreaElement>('#hearing-notes').value).toBe('');

    // The earlier notes, newest first, are for reading only.
    const earlier = [...document.querySelectorAll('.pcs-hearing-notes__note')].map(note => note.textContent);
    expect(earlier).toHaveLength(2);
    expect(earlier[0]).toContain('1 September 2026 – DJ Howard Daley');
    expect(earlier[0]).toContain('Made clear needs to do x and y.');
    expect(earlier[1]).toContain('20 July 2026 – HHJ Anesh Pema');
    expect(document.querySelector('.pcs-hearing-notes__list')?.querySelector('input, textarea')).toBeNull();
    expect(tenancyTypes()).toEqual([
      'Assured tenancy',
      'Secure tenancy',
      'Introductory tenancy',
      'Flexible tenancy',
      'Demoted tenancy',
      'Other',
    ]);
  });

  it('posts edits without the hearing snapshot or historical notes, and ignores a forged snapshot', async () => {
    app = await bootApp({ hearing: { ...HEARING, version: 3 } });
    const page = await openPage((await app.get(FOR_HEARING)).text);
    const body = page.body('SAVE_DRAFT');

    expect(body.has('hearing')).toBe(false);
    expect(body.has('caseContext')).toBe(false);
    expect([...body.values()].join(' ')).not.toContain('Read the papers.');
    body.set('hearing', 'not even JSON');
    body.set('hearing-notes', 'The judge changed this note.');
    expect((await app.post(FOR_HEARING, body)).status).toBe(302);
    expect(submittedOrders().at(-1)?.hearing).toMatchObject({
      id: 7,
      version: 3,
      note: 'The judge changed this note.',
    });
    expect(submittedOrders().at(-1)?.order).not.toHaveProperty(['formData', 'hearing']);
  });

  it('reloads stale hearing edits and lets the judge save against the new version', async () => {
    app = await bootApp({ hearing: { ...HEARING, version: 3 } });
    const firstTab = (await app.get(FOR_HEARING)).text;
    const second = await openPage((await app.get(FOR_HEARING)).text);
    type('hearing-notes', 'Changed in the other tab.');
    await app.post(FOR_HEARING, second.body('SAVE_DRAFT'));

    const first = await openPage(firstTab);
    type('current-rent', '950.50');
    const stale = await app.post(FOR_HEARING, first.body('SAVE_DRAFT'));
    expect(stale.status).toBe(409);
    expect(submittedOrders()).toHaveLength(1);
    const retry = await openPage(stale.text);
    expect(control('#make-order-error-summary').textContent).toContain('hearing facts or notes have changed');
    expect(control<HTMLTextAreaElement>('#hearing-notes').value).toBe('Changed in the other tab.');
    expect(retry.body().get('hearingVersion')).toBe('4');
    type('current-rent', '950.50');
    expect((await app.post(FOR_HEARING, retry.body('SAVE_DRAFT'))).status).toBe(302);
    expect(submittedOrders().at(-1)?.hearing).toMatchObject({
      id: 7,
      version: 4,
      caseFacts: { currentRent: 950.5 },
      note: 'Changed in the other tab.',
    });
  });

  it('does not update hearing values that already match, even from an older version', async () => {
    app = await bootApp({ hearing: { ...HEARING, version: 3 } });
    const firstTab = (await app.get(FOR_HEARING)).text;
    const second = await openPage((await app.get(FOR_HEARING)).text);
    type('hearing-notes', 'The same note.');
    await app.post(FOR_HEARING, second.body('SAVE_DRAFT'));

    const first = await openPage(firstTab);
    type('hearing-notes', 'The same note.');
    expect((await app.post(FOR_HEARING, first.body('SAVE_DRAFT'))).status).toBe(302);
    expect(submittedOrders().at(-1)?.hearing).toEqual({ id: 7, version: 4 });
  });

  it('keeps the hearing version through validation errors and rejects a retry if it has since changed', async () => {
    app = await bootApp({ hearing: { ...HEARING, version: 3 } });
    const page = await openPage((await app.get(FOR_HEARING)).text);
    type('current-rent', '950.505');
    const invalid = await app.post(FOR_HEARING, page.body('SAVE_DRAFT'));
    expect(invalid.status).toBe(400);
    const retryBody = (await openPage(invalid.text)).body('SAVE_DRAFT');
    expect(retryBody.get('hearingVersion')).toBe('3');
    retryBody.set('current-rent', '950.50');

    const other = await openPage((await app.get(FOR_HEARING)).text);
    type('hearing-notes', 'Changed elsewhere.');
    await app.post(FOR_HEARING, other.body('SAVE_DRAFT'));
    expect((await app.post(FOR_HEARING, retryBody)).status).toBe(409);
    expect(submittedOrders()).toHaveLength(1);
  });

  it('treats an unrecorded hearing as a version that can become stale', async () => {
    app = await bootApp({ hearing: HEARING });
    const firstTab = (await app.get(FOR_HEARING)).text;
    const second = await openPage((await app.get(FOR_HEARING)).text);
    expect(second.body().get('hearingVersion')).toBe('');
    type('hearing-notes', 'First recorded note.');
    await app.post(FOR_HEARING, second.body('SAVE_DRAFT'));

    const first = await openPage(firstTab);
    type('hearing-notes', 'A competing first note.');
    expect((await app.post(FOR_HEARING, first.body('SAVE_DRAFT'))).status).toBe(409);
    expect(submittedOrders()).toHaveLength(1);
  });

  it('reloads the hearing and version when the API refuses a save', async () => {
    app = await bootApp({ hearing: { ...HEARING, version: 3 } });
    const page = await openPage((await app.get(FOR_HEARING)).text);
    type('hearing-notes', 'Attempted change.');
    const body = page.body('SAVE_DRAFT');
    refuseNextEvent('The hearing record has changed.');
    const refused = await app.post(FOR_HEARING, body);
    expect(refused.status).toBe(422);
    const retry = await openPage(refused.text);
    expect(retry.body().get('eventToken')).not.toBe(body.get('eventToken'));
    expect(retry.body().get('hearingVersion')).toBe('3');
    type('hearing-notes', 'Checked the latest note.');
    expect((await app.post(FOR_HEARING, retry.body('SAVE_DRAFT'))).status).toBe(302);
    expect(submittedOrders().at(-1)?.hearing).toMatchObject({ id: 7, version: 3, note: 'Checked the latest note.' });
  });

  it("offers a Welsh case's contracts as its tenancy types", async () => {
    app = await bootApp({ hearing: { ...HEARING, inWales: true } });
    await openPage((await app.get(FOR_HEARING)).text);

    expect(tenancyTypes()).toEqual(['Secure contract', 'Standard contract', 'Other']);
  });

  it('makes an order without a hearing with no case facts or notes, here or in what it sends', async () => {
    app = await bootApp({ hearing: null });
    const page = await openPage((await app.get(PAGE)).text);

    expect(document.querySelector('[data-case-facts]')).toBeNull();
    expect(document.querySelector('#hearing-notes')).toBeNull();
    await app.post(PAGE, page.body('SAVE_DRAFT'));
    expect(submittedOrders().at(-1)?.hearing).toBeNull();
  });

  it("checks the hearing's facts on every save, then sends them and its recorded note, as changed", async () => {
    app = await bootApp({ hearing: { ...HEARING, version: 3, note: 'Adjourned for a rent statement.' } });
    let page = await openPage((await app.get(FOR_HEARING)).text);
    expect(control<HTMLTextAreaElement>('#hearing-notes').value).toBe('Adjourned for a rent statement.');

    // A fact that is not valid stops even a draft, since saving records it, and keeps the hearing on the page.
    type('current-rent', '950.505');
    const today = DateTime.now().setZone('Europe/London');
    typeDate('date-notice', String(today.day), String(today.month), String(today.year));
    const tomorrow = today.plus({ days: 1 });
    typeDate('date-last-payment', String(tomorrow.day), String(tomorrow.month), String(tomorrow.year));
    const refused = await app.post(FOR_HEARING, page.body('SAVE_DRAFT'));
    expect(refused.status).toBe(400);
    expect(submittedOrders()).toHaveLength(0);
    const shown = parse(refused.text);
    expect([...shown.querySelectorAll('#make-order-error-summary a')].map(link => link.textContent)).toEqual([
      'Date of service of notice must be in the past',
      'Enter a valid current rent',
      'Date of last payment must be today or in the past',
    ]);
    expect(shown.querySelector('#date-notice-error')?.textContent).toContain('must be in the past');
    expect(shown.querySelector('label[for="hearing-notes"]')?.textContent).toContain('13 October 2026');
    expect(shown.querySelectorAll('.pcs-hearing-notes__note')).toHaveLength(2);

    // Facts and a note left as they started are not sent, so another judge's changes to them are not refused.
    type('current-rent', '900.00');
    typeDate('date-notice', '', '', '');
    typeDate('date-last-payment', '1', '8', '2026');
    expect((await app.post(FOR_HEARING, page.body('SAVE_DRAFT'))).status).toBe(302);
    expect(submittedOrders().at(-1)?.hearing).toEqual({ id: 7, version: 3 });

    page = await openPage((await app.get(FOR_HEARING)).text);
    type('current-rent', '950.50');
    type('arrears-today', '1,300');
    typeDate('date-notice', '10', '8', '2026');
    typeDate('date-last-payment', String(today.day), String(today.month), String(today.year));
    type('hearing-notes', 'Paid £200 on the day.');
    selectTab('tab-free-form');
    recordAttendance();
    const sent = await app.post(FOR_HEARING, page.body('SUBMIT_FOR_REVIEW'));

    expect(sent.location).toBe(`${PAGE}/sent-for-review`);
    // The facts and note go with the hearing, never in the order's own answers.
    expect(submittedOrders().at(-1)?.order).not.toHaveProperty(['formData', 'current-rent']);
    expect(submittedOrders().at(-1)?.order).not.toHaveProperty(['formData', 'hearing-notes']);
    expect(submittedOrders().at(-1)?.hearing).toEqual({
      id: 7,
      version: 3,
      note: 'Paid £200 on the day.',
      caseFacts: {
        tenancyStartDate: '2020-02-03',
        tenancyType: 'SECURE_TENANCY',
        noticeDate: '2026-08-10',
        currentRent: 950.5,
        rentFrequency: 'MONTHLY',
        groundsPleaded: null,
        arrearsAtNotice: null,
        arrearsAtIssue: null,
        lastPaymentDate: today.toISODate(),
        lastPayment: null,
        arrearsToday: 1300,
      },
    });
  });
});
