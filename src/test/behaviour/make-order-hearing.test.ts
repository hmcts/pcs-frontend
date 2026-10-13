import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  control,
  openPage,
  recordAttendance,
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
  recorded: { by: 'DJ Howard Daley', hearingDate: '2026-09-01T10:00:00', on: '2026-09-01T15:30:00Z' },
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
    expect(control('#case-facts-source').textContent).toBe(
      'Hearing on 13 October 2026. As at the hearing on 1 September 2026, recorded by DJ Howard Daley.'
    );
    expect(control('[name="current-rent"]').value).toBe('900');
    expect(control('[name="arrears-today"]').value).toBe('1200');
    expect(control('[name="date-last-payment-month"]').value).toBe('8');
    expect(control('[name="date-last-hearing-day"]').value).toBe('1');
    expect(control<HTMLTextAreaElement>('#hearing-notes').value).toBe('');

    // The earlier notes, newest first, are for reading only.
    const earlier = [...document.querySelectorAll('.pcs-hearing-notes__note')].map(note => note.textContent);
    expect(earlier).toHaveLength(2);
    expect(earlier[0]).toContain('Hearing on 1 September 2026 – DJ Howard Daley');
    expect(earlier[0]).toContain('Made clear needs to do x and y.');
    expect(earlier[1]).toContain('Note made on 20 July 2026 – HHJ Anesh Pema');
    expect(document.querySelector('.pcs-hearing-notes__list')?.querySelector('input, textarea')).toBeNull();
  });

  it("shows the hearing's recorded facts and note over those the judge's saved draft holds", async () => {
    app = await bootApp({
      hearing: { ...HEARING, note: 'Recorded note' },
      order: {
        id: 'draft',
        version: 2,
        formData: { 'current-rent': '700', 'arrears-today': '5', 'hearing-notes': 'Old' },
      },
    });

    await openPage((await app.get(FOR_HEARING)).text);

    expect(control('[name="current-rent"]').value).toBe('900');
    expect(control('[name="arrears-today"]').value).toBe('1200');
    expect(control<HTMLTextAreaElement>('#hearing-notes').value).toBe('Recorded note');
  });

  it("sends the hearing's facts and its recorded note, as changed, with the order for review", async () => {
    app = await bootApp({ hearing: { ...HEARING, version: 3, note: 'Adjourned for a rent statement.' } });
    const page = await openPage((await app.get(FOR_HEARING)).text);
    expect(control<HTMLTextAreaElement>('#hearing-notes').value).toBe('Adjourned for a rent statement.');

    type('current-rent', '950.50');
    type('arrears-today', '1,300');
    typeDate('date-notice', '10', '8', '2026');
    type('hearing-notes', 'Paid £200 on the day.');
    selectTab('tab-free-form');
    recordAttendance();
    const sent = await app.post(FOR_HEARING, page.body('SUBMIT_FOR_REVIEW'));

    expect(sent.location).toBe(`${PAGE}/sent-for-review`);
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
        lastPaymentDate: '2026-08-01',
        lastPayment: null,
        arrearsToday: 1300,
      },
    });
  });

  it('keeps the hearing and its earlier notes when the order cannot be sent yet', async () => {
    app = await bootApp({ hearing: HEARING });
    const page = await openPage((await app.get(FOR_HEARING)).text);

    const incomplete = await app.post(FOR_HEARING, page.body('SUBMIT_FOR_REVIEW'));

    expect(incomplete.status).toBe(400);
    const shown = parse(incomplete.text);
    expect(shown.querySelector('#case-facts-source')?.textContent).toContain('Hearing on 13 October 2026');
    expect(shown.querySelectorAll('.pcs-hearing-notes__note')).toHaveLength(2);
  });
});
