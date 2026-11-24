import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  cancelHearing,
  check,
  control,
  eventStarts,
  offered,
  openPage,
  recordAttendance,
  refuseNextEvent,
  selectTab,
  startClientContexts,
  submittedOrders,
  type,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;

/** Another of the case's hearings, with its own facts. */
const LATER_HEARING = { id: 2, date: '2026-11-20T14:00:00', caseFacts: { currentRent: 800 } };

const APPLICATION = {
  id: 'gen-app-1',
  reference: 'GA1',
  type: 'Adjourn the hearing',
  applicant: 'Alex Example (Defendant 1)',
  submittedOn: '2026-10-01',
  whatOrderWanted: null,
  documents: [],
};
const OTHER_APPLICATION = { ...APPLICATION, id: 'gen-app-2', reference: 'GA2', submittedOn: '2026-10-05' };

function errors(): string {
  return document.querySelector('#make-order-error-summary')?.textContent ?? '';
}

describe('make an order: choosing when it is made', () => {
  let app: TestApp;
  afterEach(() => app.close());

  it('saves as box work without asking when the case has no hearings', async () => {
    app = await bootApp({ hearing: null, hearings: [] });
    const page = await openPage((await app.get(PAGE)).text);

    expect(page.form.textContent).not.toContain('When the order is made');
    expect(page.form.querySelector('input[type="radio"][name="made-at"]')).toBeNull();

    expect((await app.post(PAGE, page.body('SAVE_DRAFT'))).status).toBe(302);
    expect(submittedOrders().at(-1)?.hearing).toBeNull();
  });

  it("offers box work and each of the case's hearings, and moves a hearing's order to box work on the page, keeping its wording", async () => {
    app = await bootApp({ hearings: [LATER_HEARING] });
    const page = await openPage((await app.get(PAGE)).text);
    expect([...document.querySelectorAll<HTMLInputElement>('[name="made-at"]')].map(choice => choice.value)).toEqual([
      'without-hearing',
      '1',
      '2',
    ]);
    expect(control('[name="made-at"][value="1"]').checked).toBe(true);
    expect(control('label[for="made-at-3"]').textContent?.trim()).toBe('At the hearing on 20 November 2026 at 2:00pm');
    selectTab('tab-free-form');
    check('recitals', 'yes');
    type('recitals-text', 'UPON reading the papers');
    expect(offered('[data-attendance-row]')).toBe(true);
    expect(offered('[name="hearing-1-notes"]')).toBe(true);

    let submissions = 0;
    page.form.addEventListener('submit', () => submissions++);
    check('made-at', 'without-hearing');

    // The page follows the choice itself: nothing is sent, and the order is not started again.
    expect(submissions).toBe(0);
    expect(eventStarts()).toBe(1);
    expect(offered('[data-attendance-row]')).toBe(false);
    expect(offered('[name="hearing-1-notes"]')).toBe(false);
    expect(offered('[name="hearing-2-notes"]')).toBe(false);
    expect(control<HTMLTextAreaElement>('[name="recitals-text"]').value).toBe('UPON reading the papers');
    expect(page.documentText()).toContain('UPON the Court considering the papers without a hearing');
    expect(page.documentText()).toContain('UPON reading the papers');

    expect((await app.post(PAGE, page.body('SAVE_DRAFT'))).status).toBe(302);
    const [saved] = submittedOrders() as { hearing: unknown; order: { formData: Record<string, unknown> } }[];
    expect(saved.hearing).toBeNull();
    expect(saved.order.formData['recitals-text']).toBe('UPON reading the papers');
    expect(saved.order.formData).not.toHaveProperty('made-at');
    expect(Object.keys(saved.order.formData).filter(field => field.startsWith('hearing-'))).toEqual([]);
    // Reopened, the draft is box work.
    await openPage((await app.get(PAGE)).text);
    expect(control('[name="made-at"][value="without-hearing"]').checked).toBe(true);
    expect(offered('[data-attendance-row]')).toBe(false);
  });

  it("decides an application task's application, and another open one, at a hearing the judge chooses", async () => {
    app = await bootApp({ application: APPLICATION, applications: [OTHER_APPLICATION], hearings: [LATER_HEARING] });
    const taskPage = `${PAGE}?genAppId=gen-app-1&taskId=task-9`;
    const page = await openPage((await app.get(taskPage)).text);
    expect(control('[name="made-at"][value="without-hearing"]').checked).toBe(true);
    expect(offered('[data-attendance-row]')).toBe(false);
    check('app-gen-app-1-decision', 'grant');

    check('made-at', '2');

    expect(eventStarts()).toBe(1);
    expect(startClientContexts()).toEqual([{ genAppId: 'gen-app-1' }]);
    expect(offered('[data-attendance-row]')).toBe(true);
    expect(document.querySelectorAll('[data-attendance-row]')).toHaveLength(2);
    expect(offered('[name="hearing-2-current-rent"]')).toBe(true);
    expect(control('[name="hearing-2-current-rent"]').value).toBe('800');
    expect(
      [...document.querySelectorAll<HTMLElement>('[data-application]')].map(row => row.dataset.applicationReference)
    ).toEqual(['GA1', 'GA2']);
    expect(control('[name="app-gen-app-1-decision"][value="grant"]').checked).toBe(true);
    expect(page.openingText()).toContain('on 20 November 2026');
    expect(page.orderText()).not.toContain('without a hearing');
    recordAttendance();
    check('app-gen-app-2-decision', 'dismiss');
    expect(page.orderText()).toContain("The defendant's application dated 1 October 2026 is granted.");
    expect(page.orderText()).toContain("The defendant's application dated 5 October 2026 is dismissed.");

    expect((await app.post(taskPage, page.body('SUBMIT_FOR_REVIEW'))).status).toBe(302);
    const [sent] = submittedOrders() as { taskId: string; hearing: { id: number }; order: Record<string, unknown> }[];
    expect(sent.taskId).toBe('task-9');
    expect(sent.hearing.id).toBe(2);
    expect(sent.order.applicationDecisions).toEqual([
      { genAppId: 'gen-app-1', decision: 'GRANT' },
      { genAppId: 'gen-app-2', decision: 'DISMISS' },
    ]);
  });

  it("keeps each hearing's facts and notes its own, sending only those of the hearing chosen", async () => {
    app = await bootApp({ hearings: [LATER_HEARING] });
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    type('hearing-1-notes', 'Defendant asked for time');

    check('made-at', '2');

    // What the judge wrote for the first hearing waits on the page, out of the form, and comes back with it.
    expect(offered('[name="hearing-1-notes"]')).toBe(false);
    expect(control('[name="hearing-2-current-rent"]').value).toBe('800');
    expect(page.body().has('hearing-1-notes')).toBe(false);
    check('made-at', '1');
    expect(offered('[name="hearing-1-notes"]')).toBe(true);
    expect(control<HTMLTextAreaElement>('[name="hearing-1-notes"]').value).toBe('Defendant asked for time');

    check('made-at', '2');
    type('hearing-2-notes', 'Adjourned for advice');
    expect((await app.post(PAGE, page.body('SAVE_DRAFT'))).status).toBe(302);
    expect(submittedOrders().at(-1)?.hearing).toMatchObject({ id: 2, note: 'Adjourned for advice' });
    expect(JSON.stringify(submittedOrders())).not.toContain('Defendant asked for time');
  });

  it('offers no possession tabs for box work, where a possession order becomes free form', async () => {
    app = await bootApp();
    await openPage((await app.get(PAGE)).text);
    const tabs = (): (string | undefined)[] =>
      [...document.querySelectorAll<HTMLElement>('.govuk-tabs__list [data-order-type]')].map(
        tab => tab.dataset.orderType
      );
    expect(control('#order-type').value).toBe('OUTRIGHT_POSSESSION');

    check('made-at', 'without-hearing');

    expect(control('#order-type').value).toBe('FREE_FORM');
    expect(tabs()).toEqual(['ADJOURNMENT', 'STRIKE_OUT_DISMISSAL', 'FREE_FORM']);
    expect(offered('[name="list-on-notice"]')).toBe(true);
    expect(offered('[name="transfer-enforcement"]')).toBe(true);

    check('made-at', '1');

    expect(tabs().slice(0, 2)).toEqual(['OUTRIGHT_POSSESSION', 'SUSPENDED_POSSESSION']);
    expect(offered('[name="list-on-notice"]')).toBe(false);
    expect(offered('[name="transfer-enforcement"]')).toBe(false);
  });

  it('keeps what the judge wrote, where the order was, when the hearing they choose has been cancelled', async () => {
    app = await bootApp({ hearings: [LATER_HEARING] });
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    check('recitals', 'yes');
    type('recitals-text', 'UPON hearing the claimant');
    check('made-at', '2');
    cancelHearing(2);

    const refused = await app.post(PAGE, page.body('SAVE_DRAFT'));

    expect(refused.status).toBe(400);
    expect(submittedOrders()).toEqual([]);
    const shown = await openPage(refused.text);
    expect(errors()).toContain('Select a hearing the case has, or that the order is made without one');
    expect(document.querySelector('[name="made-at"][value="2"]')).toBeNull();
    expect(control('[name="made-at"][value="1"]').checked).toBe(true);
    expect(control<HTMLTextAreaElement>('[name="recitals-text"]').value).toBe('UPON hearing the claimant');
    expect(shown.documentText()).toContain('UPON hearing the claimant');
  });

  it('keeps the chosen hearing and what the judge wrote when pcs-api refuses the save', async () => {
    app = await bootApp({ hearings: [LATER_HEARING] });
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    check('made-at', '2');
    check('recitals', 'yes');
    type('recitals-text', 'UPON hearing the defendant');
    type('hearing-2-notes', 'Adjourned for advice');

    refuseNextEvent('The order has been updated by another user. Reload it and try again');
    const refused = await app.post(PAGE, page.body('SAVE_DRAFT'));

    expect(refused.status).toBe(422);
    const shown = await openPage(refused.text);
    expect(errors()).toContain('The order has been updated by another user');
    expect(control('[name="made-at"][value="2"]').checked).toBe(true);
    expect(offered('[name="hearing-2-notes"]')).toBe(true);
    expect(control<HTMLTextAreaElement>('[name="hearing-2-notes"]').value).toBe('Adjourned for advice');
    expect(control<HTMLTextAreaElement>('[name="recitals-text"]').value).toBe('UPON hearing the defendant');
    expect(shown.documentText()).toContain('UPON hearing the defendant');

    // Cancelled before the judge saves again, the order comes back where it was saved, still as they wrote it,
    // without the cancelled hearing's notes against another hearing.
    cancelHearing(2);
    const again = await app.post(PAGE, shown.body('SAVE_DRAFT'));
    expect(again.status).toBe(400);
    await openPage(again.text);
    expect(errors()).toContain('Select a hearing the case has, or that the order is made without one');
    expect(control('[name="made-at"][value="1"]').checked).toBe(true);
    expect(control<HTMLTextAreaElement>('[name="recitals-text"]').value).toBe('UPON hearing the defendant');
    expect(control<HTMLTextAreaElement>('[name="hearing-1-notes"]').value).toBe('');
    expect(submittedOrders()).toEqual([]);
  });

  it('uses Send order for implicit submission, with no button of its own for the choice of hearing', async () => {
    app = await bootApp({ hearings: [LATER_HEARING] });
    const { form } = await openPage((await app.get(PAGE)).text);
    // The form's first submit button is the one implicit submission uses.
    const first = form.querySelector<HTMLButtonElement>('button[type="submit"], button:not([type])');
    expect(first?.value).toBe('SUBMIT_FOR_REVIEW');
    expect(form.querySelector('button[value="CHANGE_MADE_AT"]')).toBeNull();
  });
});
