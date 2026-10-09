import {
  CASE_REFERENCE,
  MANAGE_CASE_URL,
  type Page,
  type TestApp,
  bootApp,
  check,
  control,
  eventStarts,
  openPage,
  recordAttendance,
  refuseNextEvent,
  refuseNextStart,
  selectTab,
  submittedEventTokens,
  submittedReviews,
  type,
  writeInPreview,
} from './harness';

const MAKE_ORDER = `/case/${CASE_REFERENCE}/make-order`;
const BASE = `/case/${CASE_REFERENCE}/confirm-order-review`;
const INTRO = `${BASE}?orderId=order-awaiting-review&taskId=task-1`;
const REVIEW = `${BASE}/review`;
const REVIEW_DATES = `${BASE}/review-dates`;
const PROCEED_TO_ISSUE = `${BASE}/proceed-to-issue`;
const CHECK_YOUR_ANSWERS = `${BASE}/check-your-answers`;

type Order = { orderType: string; formData: Record<string, unknown>; docweaveSnapshot: unknown };

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

function errors(html: string): string[] {
  return [...parse(html).querySelectorAll('.govuk-error-summary__list li')].map(item => item.textContent!.trim());
}

/**
 * The order a judge sends for review from the make order page, an outright order unless a tab is named, with the
 * Docweave document the page built; `edit` changes that document as the judge would in the preview.
 */
async function judgesOrder(options: { tab?: string; staffMessage?: string; edit?: () => void } = {}): Promise<Order> {
  const judgeApp = await bootApp();
  try {
    const page = await openPage((await judgeApp.get(MAKE_ORDER)).text);
    if (options.tab) {
      selectTab(options.tab);
    } else {
      // An outright order the make order page would send: possession forthwith, on mandatory grounds.
      check('outright-possession', 'forthwith');
      check('outright-grounds-type', 'mandatory');
    }
    recordAttendance();
    if (options.staffMessage) {
      check('staff-message', 'yes');
      type('staff-message-text', options.staffMessage);
    }
    options.edit?.();
    const body = page.body();
    const { orderType, orderDocument } = Object.fromEntries(body);
    const formData: Record<string, unknown> = {};
    const hidden = [
      '_csrf',
      'action',
      'eventToken',
      'caseContext',
      'orderId',
      'orderVersion',
      'orderType',
      'orderDocument',
    ];
    body.forEach((value, name) => {
      if (!hidden.includes(name)) {
        formData[name] = value;
      }
    });
    return { orderType, formData, docweaveSnapshot: JSON.parse(orderDocument) };
  } finally {
    await judgeApp.close();
  }
}

/** Changes the wording of the first generated paragraph, as a judge editing the preview would. */
function changeGeneratedWording(): void {
  const field = document.querySelector<HTMLTextAreaElement>('#order-document')!;
  const snapshot = JSON.parse(field.value);
  const paragraph = snapshot.current.content.find(
    (node: { type: string; attrs?: { id?: string | null } }) => node.type === 'paragraph' && node.attrs?.id
  );
  paragraph.content = [{ type: 'text', text: 'Wording the judge rewrote' }];
  field.value = JSON.stringify(snapshot);
}

// Making an order boots the judge's page, so the plain order most tests review is made once.
let plainOrder: Promise<Order> | undefined;

/** The order as pcs-api starts its review, the given one or else the plain one. */
async function awaitingReview(order?: Order) {
  return { id: 'order-awaiting-review', version: 3, ...(order ?? (await (plainOrder ??= judgesOrder()))) };
}

async function caseworkerReviewing(order?: Order): Promise<TestApp> {
  return bootApp({ caseworker: true, order: await awaitingReview(order) });
}

/** Opens the review of the order, as the caseworker reaches it from the introduction. */
async function openReview(app: TestApp): Promise<Page> {
  await app.get(INTRO);
  return openPage((await app.get(REVIEW)).text);
}

/** Goes on to issue the order as the review page shows it, which asks for the review dates next. */
async function issueFromReview(app: TestApp): Promise<void> {
  const page = await openReview(app);
  expect((await app.post(REVIEW, page.body('ISSUE'))).location).toBe(REVIEW_DATES);
}

/** Takes the caseworker from the introduction to the given page with every answer before it given. */
async function reachProceedToIssue(app: TestApp): Promise<void> {
  await issueFromReview(app);
  const dates = await app.post(REVIEW_DATES, new URLSearchParams({ 'has-review-dates': 'no', action: 'continue' }));
  expect(dates.location).toBe(PROCEED_TO_ISSUE);
}

const proceedToIssueAnswers = (answers: Record<string, string> = {}) =>
  new URLSearchParams({
    'next-steps': 'complete',
    'final-order': 'no',
    'serve-all-parties': 'yes',
    seal: 'COUNTY_COURT',
    action: 'continue',
    ...answers,
  });

describe('confirm order review', () => {
  let app: TestApp;
  afterEach(() => app?.close());

  describe('introduction', () => {
    it('shows the case and what the caseworker needs to do, starting the review event', async () => {
      app = await caseworkerReviewing();

      const intro = await app.get(INTRO);

      expect(intro.status).toBe(200);
      const page = parse(intro.text);
      expect(page.querySelector('h1')?.textContent?.trim()).toBe('Confirm order review');
      expect(page.body.textContent).toContain('1777-0276-0001-7760');
      expect(page.body.textContent).toContain('10 Test Street, Bristol, BS1 1AA');
      expect(page.body.textContent).toContain('Example Housing vs Alex Example');
      expect(page.querySelector('.govuk-warning-text')).toBeNull();
      expect(page.querySelector<HTMLAnchorElement>('a.govuk-button')?.getAttribute('href')).toBe(REVIEW);
      expect(eventStarts()).toBe(1);
    });

    it('warns that a free form order needs reviewing in full', async () => {
      app = await caseworkerReviewing(
        await judgesOrder({ tab: 'tab-free-form', edit: () => writeInPreview('The claim is adjourned.') })
      );

      const page = parse((await app.get(INTRO)).text);

      expect(page.querySelector('#free-form-warning')?.textContent).toContain(
        'The Judge has created a custom order. Review the full order before issuing'
      );
      expect(page.querySelector('#edited-warning')).toBeNull();
    });

    it('says so when pcs-api will not start the review', async () => {
      app = await caseworkerReviewing();
      refuseNextStart('The order is no longer waiting for review');

      const page = parse((await app.get(INTRO)).text);

      expect(page.querySelector('h1')?.textContent?.trim()).toBe('No order to review');
      expect(page.body.textContent).toContain('The order is no longer waiting for review');
      expect(page.querySelector<HTMLAnchorElement>('a.govuk-button')?.href).toBe(MANAGE_CASE_URL);
    });

    it('does not exist for someone CCD does not let review orders', async () => {
      app = await bootApp({ order: await awaitingReview() });

      expect((await app.get(INTRO)).status).toBe(404);
    });
  });

  describe('reviewing the order', () => {
    it("shows the judge's message and their order", async () => {
      app = await caseworkerReviewing(await judgesOrder({ staffMessage: 'Please list for a review in 28 days.' }));

      await openReview(app);

      expect(document.querySelector('#judge-message')?.textContent).toContain('Please list for a review in 28 days.');
      expect(document.querySelector('[data-order-preview]')?.textContent).toContain('IT IS ORDERED THAT');
      expect(document.querySelector('#judge-edits')).toBeNull();
      expect(document.querySelector('[data-order-preview] .docweave-editor__clause')).toBeNull();
    });

    it('warns of what the judge added and changed, and shows their answers and wording for the caseworker to change', async () => {
      app = await caseworkerReviewing(
        await judgesOrder({
          edit: () => {
            changeGeneratedWording();
            writeInPreview('The defendant may apply to vary this order.');
          },
        })
      );

      const intro = parse((await app.get(INTRO)).text);
      expect(intro.querySelector('#edited-warning')?.textContent).toContain('identified differences');

      const page = await openPage((await app.get(REVIEW)).text);

      const edits = document.querySelector('#judge-edits')?.textContent;
      expect(edits).toContain('The Judge added wording to the order');
      expect(edits).toContain('The Judge changed generated wording');
      // Docweave marks the clauses the judge added and changed as its editor showed them.
      const preview = document.querySelector('[data-order-preview]')!;
      expect(preview.querySelector('.docweave-editor__clause--inserted')?.textContent).toContain(
        'The defendant may apply to vary this order.'
      );
      expect(preview.querySelector('.docweave-editor__clause--modified')?.textContent).toContain(
        'Wording the judge rewrote'
      );
      expect(document.querySelector('#judge-changes-key')).not.toBeNull();
      // Below it, the judge's answers and their wording, in the editor the caseworker may change.
      expect(control('input[name="claimant-claimant-id-attendance"][value="litigant-in-person"]').checked).toBe(true);
      expect(control('input[name="defendant-defendant-id-attendance"][value="not-present"]').checked).toBe(true);
      expect(page.documentText()).toContain('Wording the judge rewrote');
      expect(document.querySelector('#order-editor')?.textContent).toContain('Wording the judge rewrote');
    });

    it("keeps the caseworker's changes to the answers and the wording, under the order the judge submitted", async () => {
      app = await caseworkerReviewing();
      const page = await openReview(app);
      check('recitals', 'yes');
      type('recitals-text', 'Upon hearing the claimant');
      writeInPreview('The claimant may apply to restore the claim.');

      expect((await app.post(REVIEW, page.body('ISSUE'))).location).toBe(REVIEW_DATES);

      const again = await openPage((await app.get(REVIEW)).text);
      expect(control<HTMLTextAreaElement>('[name="recitals-text"]').value).toBe('Upon hearing the claimant');
      expect(again.documentText()).toContain('The claimant may apply to restore the claim.');
      const judges = document.querySelector('[data-order-preview]')?.textContent;
      expect(judges).toContain('IT IS ORDERED THAT');
      expect(judges).not.toContain('Upon hearing the claimant');
      expect(judges).not.toContain('The claimant may apply to restore the claim.');
    });

    it('does not go on to issue an order the judge could not have sent', async () => {
      app = await caseworkerReviewing();
      const page = await openReview(app);
      type('current-rent', 'a lot');

      const refused = await app.post(REVIEW, page.body('ISSUE'));

      expect(refused.status).toBe(400);
      expect(errors(refused.text)).toEqual(['Enter a valid current rent']);
      await openPage(refused.text);
      expect(control('[name="current-rent"]').value).toBe('a lot');
    });

    it('returns the order to the judge with the query, submitting the event the introduction started', async () => {
      app = await caseworkerReviewing();
      const page = await openReview(app);
      check('send-query', 'yes');
      type('query-to-judge', 'Which defendant does paragraph 2 mean?');

      const returned = await app.post(REVIEW, page.body('RETURN_TO_JUDGE'));

      expect(returned.location).toBe(`${BASE}/referred-to-judge`);
      expect(submittedReviews()).toEqual([
        {
          action: 'RETURN_TO_JUDGE',
          orderId: 'order-awaiting-review',
          version: 3,
          taskId: 'task-1',
          queryToJudge: 'Which defendant does paragraph 2 mean?',
        },
      ]);
      expect(submittedEventTokens()).toEqual(['event-token-1']);
      const confirmation = parse((await app.get(`${BASE}/referred-to-judge`)).text);
      expect(confirmation.querySelector('.govuk-panel__title')?.textContent?.trim()).toBe('Referred to Judge');
      expect(confirmation.querySelector('.govuk-panel__body')?.textContent).toContain(
        'Example Housing vs Alex Example'
      );
      const close = confirmation.querySelector<HTMLAnchorElement>('a.govuk-button');
      expect(close?.textContent?.trim()).toBe('Close and return to case summary');
      expect(close?.href).toBe(MANAGE_CASE_URL);
    });

    it('does not return the order to the judge without a query', async () => {
      app = await caseworkerReviewing();
      await app.get(INTRO);

      const empty = await app.post(REVIEW, new URLSearchParams({ 'send-query': 'yes', action: 'RETURN_TO_JUDGE' }));

      expect(empty.status).toBe(400);
      expect(errors(empty.text)).toEqual(['Enter your query for the Judge']);
      expect(submittedReviews()).toEqual([]);
    });

    it('cancels the review, keeping nothing, and returns the caseworker to the case', async () => {
      app = await caseworkerReviewing();
      await issueFromReview(app);

      const cancelled = await app.get(`${BASE}/cancel`);

      expect(cancelled.location).toBe(MANAGE_CASE_URL);
      expect((await app.get(REVIEW_DATES)).location).toBe(BASE);
      expect(submittedReviews()).toEqual([]);
    });
  });

  describe('review dates', () => {
    beforeEach(async () => {
      app = await caseworkerReviewing();
      await issueFromReview(app);
    });

    it('asks whether there are review dates, then for a real date, a reason and a description of each', async () => {
      const unanswered = await app.post(REVIEW_DATES, new URLSearchParams({ action: 'continue' }));
      expect(errors(unanswered.text)).toEqual(['Select if there are any review dates to add']);

      const incomplete = await app.post(
        REVIEW_DATES,
        new URLSearchParams({
          'has-review-dates': 'yes',
          'review-date-1-date-day': '31',
          'review-date-1-date-month': '2',
          'review-date-1-date-year': '2027',
          'review-date-1-description': 'x'.repeat(501),
          action: 'continue',
        })
      );

      expect(errors(incomplete.text)).toEqual([
        'Date of review 1 must be a real date',
        'Select the reason for review 1',
        'The description of review 1 must be 500 characters or less',
      ]);
    });

    it('adds review dates one after another, up to 10', async () => {
      const reviewDate = (n: number) => ({
        [`review-date-${n}-date-day`]: '15',
        [`review-date-${n}-date-month`]: '1',
        [`review-date-${n}-date-year`]: '2027',
        [`review-date-${n}-reason`]: 'GENERAL_ORDER',
        [`review-date-${n}-description`]: `Review ${n}`,
      });
      let answers: Record<string, string> = { 'has-review-dates': 'yes' };
      for (let n = 1; n <= 10; n++) {
        answers = { ...answers, ...reviewDate(n) };
        await app.post(REVIEW_DATES, new URLSearchParams({ ...answers, action: 'add' }));
      }

      const page = parse((await app.get(REVIEW_DATES)).text);

      expect(page.querySelectorAll('fieldset.pcs-review-date')).toHaveLength(10);
      expect(page.querySelector<HTMLInputElement>('#review-date-10-description')?.value).toBe('Review 10');
      expect(page.querySelector('button[value="add"]')).toBeNull();
      expect(page.body.textContent).toContain('You can add up to 10 review dates.');
    });

    it('removes a review date, keeping the others as they were last typed', async () => {
      const answers = {
        'has-review-dates': 'yes',
        'review-date-1-description': 'Check the stay',
        'review-date-2-description': 'Check compliance',
      };
      await app.post(REVIEW_DATES, new URLSearchParams({ 'has-review-dates': 'yes', action: 'add' }));

      const removing = await app.post(REVIEW_DATES, new URLSearchParams({ ...answers, action: 'remove-1' }));

      expect(removing.location).toBe(REVIEW_DATES);
      const page = parse((await app.get(REVIEW_DATES)).text);
      expect(page.querySelectorAll('fieldset.pcs-review-date')).toHaveLength(1);
      expect(page.querySelector<HTMLInputElement>('#review-date-1-description')?.value).toBe('Check compliance');
    });
  });

  describe('proceed to issue', () => {
    beforeEach(async () => {
      app = await caseworkerReviewing();
      await reachProceedToIssue(app);
    });

    it('serves the order on all parties, in claim order, under the County Court seal unless changed', async () => {
      const page = parse((await app.get(PROCEED_TO_ISSUE)).text);

      expect(page.querySelector<HTMLInputElement>('input[name="serve-all-parties"][value="yes"]')?.checked).toBe(true);
      expect(page.querySelector<HTMLInputElement>('input[name="seal"][value="COUNTY_COURT"]')?.checked).toBe(true);
      expect(page.querySelector<HTMLInputElement>('input[name="next-steps"]:checked')).toBeNull();
      expect(page.querySelector<HTMLInputElement>('input[name="final-order"]:checked')).toBeNull();
      expect(page.querySelector('#outstanding-tasks-guidance')?.textContent).toBe(
        'You should complete all outstanding tasks'
      );
      // The parties to serve, in claim order.
      expect(
        [...page.querySelectorAll('input[name="parties-to-serve"]')].map(input =>
          page.querySelector(`label[for="${input.id}"]`)?.textContent?.trim()
        )
      ).toEqual(['Claimant 1: Example Housing', 'Defendant 1: Alex Example']);
    });

    it('asks every question, and who to serve when not all parties are served', async () => {
      const unanswered = await app.post(
        PROCEED_TO_ISSUE,
        new URLSearchParams({ 'serve-all-parties': 'no', action: 'continue' })
      );

      expect(errors(unanswered.text)).toEqual([
        'Select if all the next steps for court staff have been completed',
        'Select if this is a final order',
        'Select who to serve the order on',
        'Select which seal this order should have',
      ]);
    });
  });

  describe('check your answers', () => {
    beforeEach(async () => {
      app = await caseworkerReviewing();
      await reachProceedToIssue(app);
    });

    it('shows the answers, each with a change link that comes back to it', async () => {
      await app.post(
        PROCEED_TO_ISSUE,
        proceedToIssueAnswers({ 'serve-all-parties': 'no', 'parties-to-serve': 'defendant-id', seal: 'HIGH_COURT' })
      );

      const page = parse((await app.get(CHECK_YOUR_ANSWERS)).text);
      const rows = [...page.querySelectorAll('.govuk-summary-list__row')].map(row => [
        row.querySelector('.govuk-summary-list__key')?.textContent?.trim(),
        row.querySelector('.govuk-summary-list__value')?.textContent?.trim(),
      ]);
      expect(rows).toEqual([
        ['Are there any review dates to add?', 'No'],
        ['Have all the next steps for court staff been completed?', 'There are no other tasks to complete'],
        ['Is this a final order?', 'No'],
        ['Should this order be served on all parties?', 'No'],
        ['Who should the order be served on?', 'Defendant 1: Alex Example'],
        ['Which seal should this order have?', 'High Court seal'],
      ]);

      const changeSeal = [...page.querySelectorAll<HTMLAnchorElement>('.govuk-summary-list__actions a')].at(-1)!;
      expect(changeSeal.getAttribute('href')).toBe(`${PROCEED_TO_ISSUE}?change=cya`);
      const changed = await app.post(`${PROCEED_TO_ISSUE}?change=cya`, proceedToIssueAnswers({ seal: 'COUNTY_COURT' }));
      expect(changed.location).toBe(CHECK_YOUR_ANSWERS);
    });

    it("issues the order with the caseworker's changes and answers, submitting the event the introduction started", async () => {
      const page = await openPage((await app.get(REVIEW)).text);
      check('recitals', 'yes');
      type('recitals-text', 'Upon hearing the claimant');
      writeInPreview('The claimant may apply to restore the claim.');
      await app.post(REVIEW, page.body('ISSUE'));
      const { orderType, orderDocument } = Object.fromEntries(page.body());
      await app.post(
        `${REVIEW_DATES}?change=cya`,
        new URLSearchParams({
          'has-review-dates': 'yes',
          'review-date-1-date-day': '5',
          'review-date-1-date-month': '3',
          'review-date-1-date-year': '2027',
          'review-date-1-reason': 'UNLESS_ORDER',
          'review-date-1-description': ' Check compliance ',
          action: 'continue',
        })
      );
      await app.post(PROCEED_TO_ISSUE, proceedToIssueAnswers({ 'final-order': 'yes' }));

      const submitted = await app.post(CHECK_YOUR_ANSWERS, new URLSearchParams({ action: 'continue' }));

      expect(submitted.location).toBe(`${BASE}/order-issued`);
      expect(submittedReviews()).toEqual([
        {
          action: 'ISSUE',
          orderId: 'order-awaiting-review',
          version: 3,
          taskId: 'task-1',
          issue: {
            order: {
              orderType,
              formData: expect.objectContaining({ recitals: 'yes', 'recitals-text': 'Upon hearing the claimant' }),
              docweaveSnapshot: JSON.parse(orderDocument),
              html: expect.stringContaining('<p>Upon hearing the claimant</p>'),
            },
            reviewDates: [{ date: '2027-03-05', reason: 'UNLESS_ORDER', description: 'Check compliance' }],
            nextStepsComplete: true,
            finalOrder: true,
            serveAllParties: true,
            partiesToServe: [],
            seal: 'COUNTY_COURT',
          },
        },
      ]);
      const { html } = (submittedReviews()[0] as { issue: { order: { html: string } } }).issue.order;
      expect(html).toContain('The claimant may apply to restore the claim.');
      expect(submittedEventTokens()).toEqual(['event-token-1']);

      const confirmation = parse((await app.get(`${BASE}/order-issued`)).text);
      expect(confirmation.querySelector('.govuk-panel__title')?.textContent?.trim()).toBe('Order issued');
      expect(submittedReviews()).toHaveLength(1);
      expect((await app.get(`${BASE}/referred-to-judge`)).location).toBe(MANAGE_CASE_URL);
    });

    it('shows why pcs-api refused the review', async () => {
      await app.post(PROCEED_TO_ISSUE, proceedToIssueAnswers());
      refuseNextEvent('The order has been updated by another user. Reload it and try again');

      const refused = await app.post(CHECK_YOUR_ANSWERS, new URLSearchParams({ action: 'continue' }));

      expect(refused.status).toBe(422);
      expect(errors(refused.text)).toEqual(['The order has been updated by another user. Reload it and try again']);
    });
  });
});
