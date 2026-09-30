import {
  CASE_REFERENCE,
  MANAGE_CASE_URL,
  type TestApp,
  bootApp,
  check,
  eventStarts,
  openPage,
  openReviewPage,
  recordAttendance,
  refuseNextEvent,
  selectTab,
  submittedEventTokens,
  submittedReviews,
  type,
  writeInPreview,
} from './harness';

const MAKE_ORDER = `/case/${CASE_REFERENCE}/make-order`;
const BASE = `/case/${CASE_REFERENCE}/confirm-order-review`;
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
 * The order a judge sends for review from the make order page, with the Docweave document the page
 * built; `edit` changes that document as the judge would in the preview.
 */
async function judgesOrder(options: { tab?: string; staffMessage?: string; edit?: () => void } = {}): Promise<Order> {
  const judgeApp = await bootApp();
  try {
    const page = await openPage((await judgeApp.get(MAKE_ORDER)).text);
    if (options.tab) {
      selectTab(options.tab);
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

async function caseworkerReviewing(order?: Order): Promise<TestApp> {
  return bootApp({ caseworker: true, orderAwaitingReview: order ?? (await (plainOrder ??= judgesOrder())) });
}

/** Takes the caseworker from the introduction to the given page with every answer before it given. */
async function reachProceedToIssue(app: TestApp): Promise<void> {
  await app.get(BASE);
  expect((await app.post(REVIEW, new URLSearchParams({ action: 'ISSUE' }))).location).toBe(REVIEW_DATES);
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

      const intro = await app.get(BASE);

      expect(intro.status).toBe(200);
      const page = parse(intro.text);
      expect(page.querySelector('h1')?.textContent?.trim()).toBe('Confirm order review');
      expect(page.body.textContent).toContain('1777-0276-0001-7760');
      expect(page.body.textContent).toContain('10 Test Street, Bristol, BS1 1AA');
      expect(page.body.textContent).toContain('Example Housing vs Alex Example');
      expect(page.querySelector('.govuk-warning-text')).toBeNull();
      expect(page.querySelector<HTMLAnchorElement>('a.govuk-button')?.getAttribute('href')).toBe(REVIEW);
      expect(page.body.textContent).not.toContain('Previous');
      expect(eventStarts()).toBe(1);
    });

    it('warns that a free form order needs reviewing in full', async () => {
      app = await caseworkerReviewing(
        await judgesOrder({ tab: 'tab-free-form', edit: () => writeInPreview('The claim is adjourned.') })
      );

      const page = parse((await app.get(BASE)).text);

      expect(page.querySelector('#free-form-warning')?.textContent).toContain(
        'The Judge has created a custom order. Review the full order before issuing'
      );
      expect(page.querySelector('#edited-warning')).toBeNull();
    });

    it('warns when the judge edited the generated order', async () => {
      app = await caseworkerReviewing(await judgesOrder({ edit: changeGeneratedWording }));

      const page = parse((await app.get(BASE)).text);

      expect(page.querySelector('#edited-warning')?.textContent).toContain(
        'The system has identified differences between the order preview and the information entered by the Judge in the data fields. You must update the data in the fields to match the preview'
      );
    });

    it('says so when there is no order waiting for review', async () => {
      app = await bootApp({ caseworker: true });

      const page = parse((await app.get(BASE)).text);

      expect(page.querySelector('h1')?.textContent?.trim()).toBe('No order to review');
      expect(page.body.textContent).toContain('There is no order waiting for review on this case');
      expect(page.querySelector<HTMLAnchorElement>('a.govuk-button')?.href).toBe(MANAGE_CASE_URL);
    });

    it('does not exist for someone CCD does not let review orders', async () => {
      app = await bootApp({ orderAwaitingReview: await (plainOrder ??= judgesOrder()) });

      expect((await app.get(BASE)).status).toBe(404);
    });

    it('does not exist while the make order feature flag is off', async () => {
      app = await bootApp({ caseworker: true, makeOrderEnabled: false });

      expect((await app.get(BASE)).status).toBe(404);
    });

    it('starts again from the introduction when a later page is opened without a review under way', async () => {
      app = await caseworkerReviewing();

      const review = await app.get(REVIEW);

      expect(review.status).toBe(302);
      expect(review.location).toBe(BASE);
    });
  });

  describe('reviewing the order', () => {
    it("shows the judge's message and their order", async () => {
      app = await caseworkerReviewing(await judgesOrder({ staffMessage: 'Please list for a review in 28 days.' }));
      await app.get(BASE);

      await openReviewPage((await app.get(REVIEW)).text);

      expect(document.querySelector('#judge-message')?.textContent).toContain('Please list for a review in 28 days.');
      expect(document.querySelector('[data-order-preview]')?.textContent).toContain('IT IS ORDERED THAT');
      expect(document.querySelector('#judge-edits')).toBeNull();
      expect(document.querySelector('[data-order-preview] ins, [data-order-preview] del')).toBeNull();
    });

    it('tells the caseworker what the judge added and changed in the order', async () => {
      app = await caseworkerReviewing(
        await judgesOrder({
          edit: () => {
            changeGeneratedWording();
            writeInPreview('The defendant may apply to vary this order.');
          },
        })
      );
      await app.get(BASE);

      await openReviewPage((await app.get(REVIEW)).text);

      const edits = document.querySelector('#judge-edits')?.textContent;
      expect(edits).toContain('The Judge edited this order');
      expect(edits).toContain('Order preview edited by the Judge');
      expect(edits).toContain('The Judge added wording to the order. Check the wording and any follow-up before issue');
      expect(edits).toContain('The Judge changed generated wording. Check the fields below still reflect the order');
      // Docweave shows the judge's changes to the generated wording as tracked changes.
      const preview = document.querySelector('[data-order-preview]')!;
      expect([...preview.querySelectorAll('ins')].map(ins => ins.textContent)).toContain(
        'The defendant may apply to vary this order.'
      );
      const reworded = preview.querySelector('[data-docweave-change="modified"]')!;
      expect([...reworded.querySelectorAll('ins')].map(ins => ins.textContent).join(' ')).toContain('rewrote');
      expect(reworded.querySelector('del')).not.toBeNull();
      expect(document.querySelector('#tracked-changes-key')?.textContent).toContain(
        'Wording the Judge added is underlined and highlighted. Wording they removed is struck through.'
      );
    });

    it('returns the order to the judge with the query, submitting the event the introduction started', async () => {
      app = await caseworkerReviewing();
      await app.get(BASE);
      const page = await openReviewPage((await app.get(REVIEW)).text);
      check('send-query', 'yes');
      type('query-to-judge', 'Which defendant does paragraph 2 mean?');

      const returned = await app.post(REVIEW, page.body('RETURN_TO_JUDGE'));

      expect(returned.location).toBe(`${BASE}/referred-to-judge`);
      expect(submittedReviews()).toEqual([
        {
          action: 'RETURN_TO_JUDGE',
          orderId: 'order-awaiting-review',
          version: 3,
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
      await app.get(BASE);

      const unticked = await app.post(REVIEW, new URLSearchParams({ action: 'RETURN_TO_JUDGE' }));
      expect(unticked.status).toBe(400);
      expect(errors(unticked.text)).toEqual(["Select 'Send query to Judge' and enter your query to return the order"]);

      const empty = await app.post(REVIEW, new URLSearchParams({ 'send-query': 'yes', action: 'RETURN_TO_JUDGE' }));
      expect(errors(empty.text)).toEqual(['Enter your query for the Judge']);

      const tooLong = await app.post(
        REVIEW,
        new URLSearchParams({ 'send-query': 'yes', 'query-to-judge': 'x'.repeat(30001), action: 'RETURN_TO_JUDGE' })
      );
      expect(errors(tooLong.text)).toEqual(['Your query for the Judge must be 30,000 characters or less']);
      expect(submittedReviews()).toEqual([]);
    });

    it('does not issue the order while the caseworker has a query for the judge', async () => {
      app = await caseworkerReviewing();
      await app.get(BASE);

      const issued = await app.post(
        REVIEW,
        new URLSearchParams({ 'send-query': 'yes', 'query-to-judge': 'A query', action: 'ISSUE' })
      );

      expect(issued.status).toBe(400);
      expect(errors(issued.text)).toEqual([
        "Return the order to the Judge, or untick 'Send query to Judge' to issue it",
      ]);
    });

    it('cancels the review, keeping nothing, and returns the caseworker to the case', async () => {
      app = await caseworkerReviewing();
      await app.get(BASE);
      await app.post(REVIEW, new URLSearchParams({ action: 'ISSUE' }));

      const cancelled = await app.get(`${BASE}/cancel`);

      expect(cancelled.location).toBe(MANAGE_CASE_URL);
      expect((await app.get(REVIEW_DATES)).location).toBe(BASE);
      expect(submittedReviews()).toEqual([]);
    });
  });

  describe('review dates', () => {
    beforeEach(async () => {
      app = await caseworkerReviewing();
      await app.get(BASE);
      await app.post(REVIEW, new URLSearchParams({ action: 'ISSUE' }));
    });

    it('asks whether there are review dates to add', async () => {
      const unanswered = await app.post(REVIEW_DATES, new URLSearchParams({ action: 'continue' }));

      expect(unanswered.status).toBe(400);
      expect(errors(unanswered.text)).toEqual(['Select if there are any review dates to add']);
    });

    it('needs a real date, a reason and a description of up to 500 characters for each review date', async () => {
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

    it('needs a four-digit year', async () => {
      const shortYear = await app.post(
        REVIEW_DATES,
        new URLSearchParams({
          'has-review-dates': 'yes',
          'review-date-1-date-day': '1',
          'review-date-1-date-month': '2',
          'review-date-1-date-year': '202',
          'review-date-1-reason': 'OTHER',
          'review-date-1-description': 'Check',
          action: 'continue',
        })
      );

      expect(errors(shortYear.text)).toEqual(['Date of review 1 must be a real date']);
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

    it('asks the caseworker to confirm removing a review date, and keeps it if they cancel', async () => {
      const answers = {
        'has-review-dates': 'yes',
        'review-date-1-date-day': '15',
        'review-date-1-date-month': '1',
        'review-date-1-date-year': '2027',
        'review-date-1-reason': 'STAY_CASE',
        'review-date-1-description': 'Check the stay',
      };
      const removing = await app.post(REVIEW_DATES, new URLSearchParams({ ...answers, action: 'remove-1' }));
      expect(removing.location).toBe(`${REVIEW_DATES}/remove/1`);

      const confirm = parse((await app.get(`${REVIEW_DATES}/remove/1`)).text);
      expect(confirm.querySelector('h1')?.textContent).toContain('Are you sure you want to remove review date 1?');
      expect(confirm.body.textContent).toContain('15/01/2027');
      expect(confirm.body.textContent).toContain('Stay a case');
      expect(confirm.querySelector<HTMLAnchorElement>('.govuk-button-group a')?.getAttribute('href')).toBe(
        REVIEW_DATES
      );
      let page = parse((await app.get(REVIEW_DATES)).text);
      expect(page.querySelector<HTMLInputElement>('#review-date-1-description')?.value).toBe('Check the stay');

      await app.post(`${REVIEW_DATES}/remove/1`, new URLSearchParams({ confirm: 'yes' }));

      page = parse((await app.get(REVIEW_DATES)).text);
      expect(page.querySelector<HTMLInputElement>('#review-date-1-description')?.value).toBe('');
    });

    it('goes back to the review keeping the answers', async () => {
      const previous = await app.post(
        REVIEW_DATES,
        new URLSearchParams({ 'has-review-dates': 'no', action: 'previous' })
      );
      expect(previous.location).toBe(REVIEW);

      const page = parse((await app.get(REVIEW_DATES)).text);
      expect(page.querySelector<HTMLInputElement>('input[name="has-review-dates"][value="no"]')?.checked).toBe(true);
    });
  });

  describe('proceed to issue', () => {
    beforeEach(async () => {
      app = await caseworkerReviewing();
      await reachProceedToIssue(app);
    });

    it('serves the order on all parties under the County Court seal unless the caseworker changes it', async () => {
      const page = parse((await app.get(PROCEED_TO_ISSUE)).text);

      expect(page.querySelector<HTMLInputElement>('input[name="serve-all-parties"][value="yes"]')?.checked).toBe(true);
      expect(page.querySelector<HTMLInputElement>('input[name="seal"][value="COUNTY_COURT"]')?.checked).toBe(true);
      expect(page.querySelector<HTMLInputElement>('input[name="next-steps"]:checked')).toBeNull();
      expect(page.querySelector<HTMLInputElement>('input[name="final-order"]:checked')).toBeNull();
      expect(page.querySelector('#outstanding-tasks-guidance')?.textContent).toBe(
        'You should complete all outstanding tasks'
      );
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

    it('lists the parties to serve in claim order', async () => {
      const page = parse((await app.get(PROCEED_TO_ISSUE)).text);

      expect(
        [...page.querySelectorAll('input[name="parties-to-serve"]')].map(input =>
          page.querySelector(`label[for="${input.id}"]`)?.textContent?.trim()
        )
      ).toEqual(['Claimant 1: Example Housing', 'Defendant 1: Alex Example']);
    });

    it('lets the caseworker continue with tasks still to do', async () => {
      const outstanding = await app.post(PROCEED_TO_ISSUE, proceedToIssueAnswers({ 'next-steps': 'outstanding' }));

      expect(outstanding.location).toBe(CHECK_YOUR_ANSWERS);
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

    it('issues the order with the answers, submitting the event the introduction started', async () => {
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
          issue: {
            reviewDates: [{ date: '2027-03-05', reason: 'UNLESS_ORDER', description: 'Check compliance' }],
            nextStepsComplete: true,
            finalOrder: true,
            serveAllParties: true,
            partiesToServe: [],
            seal: 'COUNTY_COURT',
          },
        },
      ]);
      expect(submittedEventTokens()).toEqual(['event-token-1']);

      const confirmation = parse((await app.get(`${BASE}/order-issued`)).text);
      expect(confirmation.querySelector('.govuk-panel__title')?.textContent?.trim()).toBe('Order issued');
      expect((await app.get(`${BASE}/order-issued`)).status).toBe(200);
      expect(submittedReviews()).toHaveLength(1);
      expect((await app.get(`${BASE}/referred-to-judge`)).location).toBe(MANAGE_CASE_URL);
    });

    it('escapes the names of the parties to serve', async () => {
      await app.close();
      app = await bootApp({
        caseworker: true,
        orderAwaitingReview: await (plainOrder ??= judgesOrder()),
        defendants: [{ id: 'defendant-id', name: '<img src=x onerror=alert(1)>' }],
      });
      await reachProceedToIssue(app);
      await app.post(
        PROCEED_TO_ISSUE,
        proceedToIssueAnswers({ 'serve-all-parties': 'no', 'parties-to-serve': 'defendant-id' })
      );

      const page = await app.get(CHECK_YOUR_ANSWERS);

      expect(page.text).not.toContain('<img src=x');
      expect(parse(page.text).body.textContent).toContain('Defendant 1: <img src=x onerror=alert(1)>');
    });

    it('does not issue an order whose answers were reset since the page showed them', async () => {
      await app.post(PROCEED_TO_ISSUE, proceedToIssueAnswers());
      // Opening the review again, such as in another tab, starts its answers afresh.
      await app.get(BASE);

      const submitted = await app.post(CHECK_YOUR_ANSWERS, new URLSearchParams({ action: 'continue' }));

      expect(submitted.location).toBe(REVIEW_DATES);
      expect(submittedReviews()).toEqual([]);
    });

    it('shows why pcs-api refused the review', async () => {
      await app.post(PROCEED_TO_ISSUE, proceedToIssueAnswers());
      refuseNextEvent('The order has been updated by another user. Reload it and try again');

      const refused = await app.post(CHECK_YOUR_ANSWERS, new URLSearchParams({ action: 'continue' }));

      expect(refused.status).toBe(422);
      expect(errors(refused.text)).toEqual(['The order has been updated by another user. Reload it and try again']);
    });

    it('asks any unanswered question before showing the answers', async () => {
      expect((await app.get(CHECK_YOUR_ANSWERS)).location).toBe(PROCEED_TO_ISSUE);
    });
  });
});
