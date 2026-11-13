import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  cancelHearing,
  check,
  control,
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

  it("offers box work and each of the case's hearings, and moves a hearing's order to box work keeping its wording", async () => {
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

    check('made-at', 'without-hearing');
    const changed = await app.post(PAGE, page.body('CHANGE_MADE_AT'));

    expect(changed.status).toBe(200);
    expect(submittedOrders()).toEqual([]);
    expect(startClientContexts().at(-1)).toEqual({ madeAt: {} });
    const boxWork = await openPage(changed.text);
    expect(control('[name="made-at"][value="without-hearing"]').checked).toBe(true);
    expect(document.querySelector('[data-attendance-row]')).toBeNull();
    expect(document.querySelector('[name="hearing-notes"]')).toBeNull();
    expect(control<HTMLTextAreaElement>('[name="recitals-text"]').value).toBe('UPON reading the papers');
    expect(boxWork.documentText()).toContain('UPON the Court considering the papers without a hearing');
    expect(boxWork.documentText()).toContain('UPON reading the papers');

    expect((await app.post(PAGE, boxWork.body('SAVE_DRAFT'))).status).toBe(302);
    const [saved] = submittedOrders() as { hearing: unknown; order: { formData: Record<string, unknown> } }[];
    expect(saved.hearing).toBeNull();
    expect(saved.order.formData['recitals-text']).toBe('UPON reading the papers');
    expect(saved.order.formData).not.toHaveProperty('made-at');
    // Reopened, the draft is box work.
    await openPage((await app.get(PAGE)).text);
    expect(control('[name="made-at"][value="without-hearing"]').checked).toBe(true);
  });

  it("decides an application task's application, and another open one, at a hearing the judge chooses", async () => {
    app = await bootApp({ application: APPLICATION, applications: [OTHER_APPLICATION], hearings: [LATER_HEARING] });
    const taskPage = `${PAGE}?genAppId=gen-app-1&taskId=task-9`;
    let page = await openPage((await app.get(taskPage)).text);
    expect(control('[name="made-at"][value="without-hearing"]').checked).toBe(true);
    expect(document.querySelector('[data-attendance-row]')).toBeNull();
    check('app-gen-app-1-decision', 'grant');

    check('made-at', '2');
    page = await openPage((await app.post(taskPage, page.body('CHANGE_MADE_AT'))).text);

    expect(startClientContexts().at(-1)).toEqual({ genAppId: 'gen-app-1', madeAt: { hearingId: 2 } });
    expect(document.querySelectorAll('[data-attendance-row]')).toHaveLength(2);
    expect(control('[name="current-rent"]').value).toBe('800');
    expect(
      [...document.querySelectorAll<HTMLElement>('[data-application]')].map(row => row.dataset.applicationReference)
    ).toEqual(['GA1', 'GA2']);
    expect(control('[name="app-gen-app-1-decision"][value="grant"]').checked).toBe(true);
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

  it("keeps a hearing's changed facts and notes rather than lose them to another choice", async () => {
    app = await bootApp({ hearings: [LATER_HEARING] });
    const page = await openPage((await app.get(PAGE)).text);
    type('hearing-notes', 'Defendant asked for time');

    check('made-at', '2');
    const refused = await app.post(PAGE, page.body('CHANGE_MADE_AT'));

    expect(refused.status).toBe(400);
    await openPage(refused.text);
    expect(errors()).toContain('Save the order as a draft to keep your changes to the case facts and notes');
    expect(control('[name="made-at"][value="1"]').checked).toBe(true);
    expect(control<HTMLTextAreaElement>('[name="hearing-notes"]').value).toBe('Defendant asked for time');
  });

  it('keeps a possession order at its hearing', async () => {
    app = await bootApp();
    const page = await openPage((await app.get(PAGE)).text);
    check('made-at', 'without-hearing');

    const refused = await app.post(PAGE, page.body('CHANGE_MADE_AT'));

    expect(refused.status).toBe(400);
    await openPage(refused.text);
    expect(errors()).toContain('Possession orders are only made at a hearing');
    expect(control('#tab-outright')).toBeTruthy();
  });

  it('shows the order for a hearing chosen without its button, rather than save it', async () => {
    app = await bootApp({ hearings: [LATER_HEARING] });
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    check('made-at', '2');

    const shown = await app.post(PAGE, page.body('SAVE_DRAFT'));

    expect(shown.status).toBe(400);
    expect(submittedOrders()).toEqual([]);
    await openPage(shown.text);
    expect(errors()).toContain('You changed when the order is made');
    expect(control('[name="made-at"][value="2"]').checked).toBe(true);
    expect(control('[name="current-rent"]').value).toBe('800');
  });

  it('keeps what the judge wrote, where they had it, when the hearing they choose has been cancelled', async () => {
    app = await bootApp({ hearings: [LATER_HEARING] });
    const page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    check('recitals', 'yes');
    type('recitals-text', 'UPON hearing the claimant');
    check('made-at', '2');
    cancelHearing(2);

    const refused = await app.post(PAGE, page.body('CHANGE_MADE_AT'));

    expect(refused.status).toBe(422);
    const shown = await openPage(refused.text);
    expect(errors()).toContain("The hearing is not one of this case's hearings");
    expect(control('[name="made-at"][value="1"]').checked).toBe(true);
    expect(control<HTMLTextAreaElement>('[name="recitals-text"]').value).toBe('UPON hearing the claimant');
    expect(shown.documentText()).toContain('UPON hearing the claimant');
  });

  it('keeps the chosen hearing and what the judge wrote when pcs-api refuses the save', async () => {
    app = await bootApp({ hearings: [LATER_HEARING] });
    let page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    check('made-at', '2');
    page = await openPage((await app.post(PAGE, page.body('CHANGE_MADE_AT'))).text);
    check('recitals', 'yes');
    type('recitals-text', 'UPON hearing the defendant');
    type('hearing-notes', 'Adjourned for advice');

    refuseNextEvent('The order has been updated by another user. Reload it and try again');
    const refused = await app.post(PAGE, page.body('SAVE_DRAFT'));

    expect(refused.status).toBe(422);
    const shown = await openPage(refused.text);
    expect(errors()).toContain('The order has been updated by another user');
    expect(control('[name="made-at"][value="2"]').checked).toBe(true);
    expect(control<HTMLTextAreaElement>('[name="hearing-notes"]').value).toBe('Adjourned for advice');
    expect(control<HTMLTextAreaElement>('[name="recitals-text"]').value).toBe('UPON hearing the defendant');
    expect(shown.documentText()).toContain('UPON hearing the defendant');

    // Cancelled before the judge saves again, the order comes back where it was saved, still as they wrote it,
    // without the cancelled hearing's notes against another hearing.
    cancelHearing(2);
    const again = await app.post(PAGE, shown.body('SAVE_DRAFT'));
    expect(again.status).toBe(422);
    await openPage(again.text);
    expect(errors()).toContain("The hearing is not one of this case's hearings");
    expect(control('[name="made-at"][value="1"]').checked).toBe(true);
    expect(control<HTMLTextAreaElement>('[name="recitals-text"]').value).toBe('UPON hearing the defendant');
    expect(control<HTMLTextAreaElement>('[name="hearing-notes"]').value).toBe('');
    expect(submittedOrders()).toEqual([]);
  });

  it('keeps Enter in a field sending the order, not changing when it is made', async () => {
    app = await bootApp({ hearings: [LATER_HEARING] });
    const { form } = await openPage((await app.get(PAGE)).text);
    // The form's first submit button is the one implicit submission uses.
    const first = form.querySelector<HTMLButtonElement>('button[type="submit"], button:not([type])');
    expect(first?.value).toBe('SUBMIT_FOR_REVIEW');
    expect(form.querySelectorAll('button[value="CHANGE_MADE_AT"]')).toHaveLength(1);
  });
});
