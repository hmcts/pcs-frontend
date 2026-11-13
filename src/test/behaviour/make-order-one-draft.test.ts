import {
  CASE_REFERENCE,
  type TestApp,
  bootApp,
  check,
  control,
  futureDate,
  openPage,
  selectTab,
  startClientContexts,
  submittedOrders,
  type,
  typeDate,
  writeInPreview,
} from './harness';

const PAGE = `/case/${CASE_REFERENCE}/make-order`;
const FROM_APPLICATION = `${PAGE}?genAppId=gen-app-1&taskId=task-9`;

const HEARING = { id: 2, date: '2026-11-20T14:00:00', caseFacts: { currentRent: 800 } };

const APPLICATION = {
  id: 'gen-app-1',
  reference: 'GA1',
  type: 'Adjourn the hearing',
  applicant: 'Alex Example (Defendant 1)',
  submittedOn: '2026-10-01',
  whatOrderWanted: null,
  documents: [],
};

const OWN_WORDING = 'The parties have permission to apply.';

function errors(): string {
  return document.querySelector('#make-order-error-summary')?.textContent ?? '';
}

function madeAt(): string | undefined {
  return document.querySelector<HTMLInputElement>('[name="made-at"]:checked')?.value;
}

function orderId(): string {
  return control('[name="orderId"]').value;
}

interface Saved {
  action: string;
  hearing: { id: number } | null;
  order: { id: string | null; version: number; formData: Record<string, unknown> };
}

describe("make an order: the judge's one draft on a case", () => {
  let app: TestApp;
  afterEach(() => app.close());

  it("reopens a draft saved at a hearing from the application's link and the case's own, as it was saved", async () => {
    app = await bootApp({ application: APPLICATION, hearings: [HEARING] });
    let page = await openPage((await app.get(FROM_APPLICATION)).text);
    expect(madeAt()).toBe('without-hearing');
    expect(document.querySelector('#discard-draft')).toBeNull();
    check('app-gen-app-1-decision', 'grant');
    check('order-notice', 'without-notice');
    const due = futureDate(25);
    typeDate('without-notice-by', due.day, due.month, due.year);
    // The judge writes in the order itself, then says it is made at the hearing.
    writeInPreview(OWN_WORDING);
    check('made-at', '2');
    page = await openPage((await app.post(FROM_APPLICATION, page.body('CHANGE_MADE_AT'))).text);
    expect(submittedOrders()).toEqual([]);
    expect(page.documentText()).toContain(OWN_WORDING);
    expect(page.documentText()).not.toContain('without a hearing');

    expect((await app.post(FROM_APPLICATION, page.body('SAVE_DRAFT'))).status).toBe(302);
    const [saved] = submittedOrders() as unknown as Saved[];
    expect(saved.hearing?.id).toBe(2);

    // The application's link, which names no hearing, and the case's own both open the draft at its hearing.
    for (const link of [FROM_APPLICATION, PAGE]) {
      page = await openPage((await app.get(link)).text);
      expect(madeAt()).toBe('2');
      expect(orderId()).not.toBe('');
      expect(control('[name="current-rent"]').value).toBe('800');
      expect(control('[name="app-gen-app-1-decision"][value="grant"]').checked).toBe(true);
      expect(control('[name="order-notice"][value="without-notice"]').checked).toBe(true);
      expect(control('[name="without-notice-by-day"]').value).toBe(due.day);
      expect(page.documentText()).toContain(OWN_WORDING);
      expect(page.documentText()).toContain('If you were not notified of the application before this order was made');
      expect(document.querySelector('#other-draft-warning')).toBeNull();
    }
    const draftId = orderId();
    expect(startClientContexts().at(-1)).toBeUndefined();

    // Moved to no hearing and back, saving each time, it stays the same draft with the judge's own wording.
    check('made-at', 'without-hearing');
    page = await openPage((await app.post(PAGE, page.body('CHANGE_MADE_AT'))).text);
    expect(page.documentText()).toContain('without a hearing');
    expect(page.documentText()).toContain(OWN_WORDING);
    expect((await app.post(PAGE, page.body('SAVE_DRAFT'))).status).toBe(302);
    page = await openPage((await app.get(`${PAGE}?hearingId=2`)).text);
    expect(madeAt()).toBe('without-hearing');
    expect(orderId()).toBe(draftId);
    page = await openPage((await app.get(FROM_APPLICATION)).text);
    expect(madeAt()).toBe('without-hearing');
    check('made-at', '2');
    page = await openPage((await app.post(FROM_APPLICATION, page.body('CHANGE_MADE_AT'))).text);
    expect((await app.post(FROM_APPLICATION, page.body('SAVE_DRAFT'))).status).toBe(302);

    const saves = submittedOrders() as unknown as Saved[];
    expect(saves.map(save => [save.order.id, save.hearing?.id ?? null])).toEqual([
      [null, 2],
      [draftId, null],
      [draftId, 2],
    ]);
    page = await openPage((await app.get(PAGE)).text);
    expect(orderId()).toBe(draftId);
    expect(madeAt()).toBe('2');
    expect(page.documentText()).toContain(OWN_WORDING);
  });

  it('starts no second draft from a page opened before the draft was saved, and keeps what was on it', async () => {
    app = await bootApp({ hearing: null, hearings: [HEARING] });
    const staleTab = (await app.get(PAGE)).text;
    let page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    check('recitals', 'yes');
    type('recitals-text', 'UPON reading the first draft');
    expect((await app.post(PAGE, page.body('SAVE_DRAFT'))).status).toBe(302);

    page = await openPage(staleTab);
    selectTab('tab-free-form');
    check('recitals', 'yes');
    type('recitals-text', 'UPON reading the other tab');
    writeInPreview(OWN_WORDING);
    const refused = await app.post(PAGE, page.body('SAVE_DRAFT'));

    expect(refused.status).toBe(422);
    expect(submittedOrders()).toHaveLength(1);
    page = await openPage(refused.text);
    expect(errors()).toContain('You already have a draft order on this case');
    expect(control<HTMLTextAreaElement>('[name="recitals-text"]').value).toBe('UPON reading the other tab');
    expect(page.documentText()).toContain(OWN_WORDING);
    // It is still a page with no order of its own, so neither saving nor sending it again touches the draft.
    expect(orderId()).toBe('');
    expect(document.querySelector('#discard-draft')).toBeNull();
    expect((await app.post(PAGE, page.body('SAVE_DRAFT'))).status).toBe(422);
    expect((await app.post(PAGE, page.body('SUBMIT_FOR_REVIEW'))).status).toBe(422);
    expect(submittedOrders()).toHaveLength(1);

    await openPage((await app.get(PAGE)).text);
    expect(control<HTMLTextAreaElement>('[name="recitals-text"]').value).toBe('UPON reading the first draft');
  });

  it('keeps the saved draft when an old page tries to discard it', async () => {
    app = await bootApp({ hearing: null });
    let page = await openPage((await app.get(PAGE)).text);
    selectTab('tab-free-form');
    writeInPreview(OWN_WORDING);
    expect((await app.post(PAGE, page.body('SAVE_DRAFT'))).status).toBe(302);
    page = await openPage((await app.get(PAGE)).text);
    const savedId = orderId();
    expect(document.querySelector('#discard-draft')).toBeNull();
    const refused = await app.post(PAGE, { ...page.body('DISCARD_DRAFT'), 'discard-draft': 'yes' });
    expect(refused.status).toBe(400);
    expect(submittedOrders()).toHaveLength(1);
    page = await openPage((await app.get(PAGE)).text);
    expect(orderId()).toBe(savedId);
    expect(page.documentText()).toContain(OWN_WORDING);
  });
});
