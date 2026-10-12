import { buildFooterModel } from '@hmcts-cft/cft-ui-component-lib';
import { type DocWeaveSnapshot, describeChanges, renderHtml } from '@hmcts-cft/docweave';
import { Application, Request, RequestHandler, Response } from 'express';

import { CallbackRejectedError, HTTPError } from '../HttpError';
import { CONFIRM_ORDER_REVIEW_ROUTE } from '../constants/caseRoutes';
import { makeOrderFeatureMiddleware, oidcMiddleware } from '../middleware';

import { ccdCaseService } from '@services/ccdCaseService';
import { attendanceParties, orderFormModel } from '@utils/makeOrderForm';
import { MAKE_ORDER_TYPES, validateMakeOrder } from '@utils/makeOrderValidation';
import {
  type OrderStart,
  caseHeader,
  confirmationHeader,
  manageCaseDetailsUrl,
  postedSnapshot,
  refusedOrderEvent,
  xuiHeaderModel,
} from '@utils/orderCase';
import {
  MAX_QUERY_LENGTH,
  MAX_REVIEW_DATES,
  MAX_REVIEW_DESCRIPTION_LENGTH,
  NEXT_STEPS,
  type OrderReviewAnswers,
  type OrderReviewSession,
  REVIEW_REASONS,
  type ReviewDateAnswer,
  SEALS,
  type ValidationIssue,
  blankReviewDate,
  choice,
  list,
  newAnswers,
  reviewRequest,
  staffMessage,
  text,
  ticked,
  validateProceedToIssue,
  validateQuery,
  validateReviewDates,
} from '@utils/orderReview';

/*
 * A caseworker's review of a judge's order, reached from their Work Allocation task through XUI. Like the
 * make order page, it is plain Express rather than a citizen steps journey: its pages are a CCD event
 * started on the introduction and submitted with that start's token, its first page embeds the make
 * order form and its editor, and its forms post several buttons.
 */

const CONFIRM_ORDER_REVIEW_EVENT_ID = 'ext:confirmOrderReview';

const PAGES = {
  intro: '',
  review: '/review',
  reviewDates: '/review-dates',
  proceedToIssue: '/proceed-to-issue',
  checkYourAnswers: '/check-your-answers',
  cancel: '/cancel',
  confirmed: '/confirmed',
} as const;

type Page = keyof typeof PAGES;

function route(page: Page): string {
  return `${CONFIRM_ORDER_REVIEW_ROUTE}${PAGES[page]}`;
}

function pageUrl(caseReference: string, page: Page): string {
  return route(page).replace(':caseReference', caseReference);
}

function caseReferenceOf(req: Request): string {
  return req.params.caseReference as string;
}

function endReview(req: Request): void {
  delete req.session.orderReviews?.[caseReferenceOf(req)];
}

/** The review in progress on the case, if the introduction started one that has not ended. */
function reviewOf(req: Request): OrderReviewSession | undefined {
  const review = req.session.orderReviews?.[caseReferenceOf(req)];
  return review && !review.outcome ? review : undefined;
}

/**
 * The pages after the introduction continue the review the introduction started; without one, such as
 * after a cancel, a submission or in a new session, the caseworker starts again from the introduction.
 */
const reviewInProgress: RequestHandler = (req, res, next) =>
  reviewOf(req) ? next() : res.redirect(pageUrl(caseReferenceOf(req), 'intro'));

const journey = [oidcMiddleware, makeOrderFeatureMiddleware];
const inJourney = [...journey, reviewInProgress];

function errorSummary(issues: ValidationIssue[]) {
  return issues.length
    ? {
        titleText: 'There is a problem',
        errorList: issues.map(issue => ({ text: issue.message, href: `#${issue.id}` })),
      }
    : undefined;
}

function pageModel(req: Request, review: OrderStart, issues: ValidationIssue[] = []): Record<string, unknown> {
  const caseReference = caseReferenceOf(req);
  return {
    headerModel: xuiHeaderModel(req),
    footerModel: buildFooterModel(),
    formAction: req.originalUrl,
    ...caseHeader(review.caseContext),
    errorSummary: errorSummary(issues),
    validationErrors: Object.fromEntries(issues.map(issue => [issue.id, { text: issue.message }])),
    cancelUrl: pageUrl(caseReference, 'cancel'),
  };
}

/** How the judge changed the order Docweave generated from their answers, as the review pages tell the caseworker. */
function judgeEdits(snapshot: DocWeaveSnapshot | null | undefined) {
  const changes = snapshot ? describeChanges(snapshot) : { inserted: 0, modified: 0 };
  // Docweave does not let the judge remove a generated clause; wording they delete within one is a change.
  return { added: changes.inserted > 0, changed: changes.modified > 0 };
}

/**
 * The judge's order as the review pages show it: its preview, with the clauses they added and changed marked
 * as Docweave's editor showed them, and how the judge changed it.
 */
function orderModel(review: OrderReviewSession) {
  const snapshot = review.order.docweaveSnapshot;
  return {
    freeForm: review.order.orderType === 'FREE_FORM',
    edits: judgeEdits(snapshot),
    staffMessage: staffMessage(review.order.formData),
    orderPreviewHtml: snapshot ? renderHtml(snapshot, { changes: true }) : undefined,
  };
}

/** The review dates on the page, as many as it showed. */
function postedReviewDates(body: Record<string, unknown>, shown: number): ReviewDateAnswer[] {
  return Array.from({ length: shown }, (_, index) => {
    const prefix = `review-date-${index + 1}`;
    return {
      day: text(body[`${prefix}-date-day`]).trim(),
      month: text(body[`${prefix}-date-month`]).trim(),
      year: text(body[`${prefix}-date-year`]).trim(),
      reason: text(body[`${prefix}-reason`]),
      description: text(body[`${prefix}-description`]),
    };
  });
}

/** The review dates the page shows: at least one to fill in once the caseworker says there are some. */
function shownReviewDates(answers: OrderReviewAnswers): ReviewDateAnswer[] {
  return answers.reviewDates.length ? answers.reviewDates : [blankReviewDate()];
}

function partyChoices(review: OrderReviewSession) {
  const { claimants, defendants } = review.caseContext;
  // In claim order: the claimants, then the defendants in the order they were added to the claim.
  return [
    ...claimants.map((party, index) => ({ value: party.id, text: `Claimant ${index + 1}: ${party.name}` })),
    ...defendants.map((party, index) => ({ value: party.id, text: `Defendant ${index + 1}: ${party.name}` })),
  ];
}

/**
 * Submits the caseworker's review with the token the introduction's start gave; pcs-api refuses it if
 * the order changed since. The review then ends with its outcome, which its confirmation shows and which
 * survives a refresh, which cannot submit it again.
 */
async function submitReview(req: Request, review: OrderReviewSession, action: 'RETURN_TO_JUDGE' | 'ISSUE') {
  await ccdCaseService.submitCaseEvent(
    req.session.user!.accessToken,
    caseReferenceOf(req),
    CONFIRM_ORDER_REVIEW_EVENT_ID,
    review.eventToken,
    { sdkEventPayload: JSON.stringify(reviewRequest(review, action)) }
  );
  review.outcome = action === 'ISSUE' ? 'ISSUED' : 'RETURNED_TO_JUDGE';
}

/** The caseworker's answers in the order asked, in a section per page, which each is changed on. */
function checkYourAnswersContent(req: Request, review: OrderReviewSession): Record<string, unknown> {
  const { answers } = review;
  const label = (options: readonly { value: string; text: string }[], value?: string) =>
    options.find(option => option.value === value)?.text ?? value ?? '';
  const yesNo = (value?: string) => (value === 'yes' ? 'Yes' : 'No');
  const row = (key: string, hiddenText: string, ...lines: string[]) => ({ key, hiddenText, lines });
  const reviewDates = answers.hasReviewDates === 'yes' ? answers.reviewDates : [];
  const partyNames = new Map(partyChoices(review).map(party => [party.value, party.text]));
  const partiesToServe = answers.partiesToServe.map(id => partyNames.get(id) ?? id);
  return {
    sections: [
      {
        heading: 'Review dates',
        id: 'review-dates-answers',
        href: pageUrl(caseReferenceOf(req), 'reviewDates'),
        rows: [
          row('Are there any review dates to add?', 'whether there are review dates', yesNo(answers.hasReviewDates)),
          ...reviewDates.map(({ day, month, year, reason, description }, index) =>
            row(
              `Review date ${index + 1}`,
              `review date ${index + 1}`,
              `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`,
              label(REVIEW_REASONS, reason),
              description.trim()
            )
          ),
        ],
      },
      {
        heading: 'Proceed to issue',
        id: 'issue-answers',
        href: pageUrl(caseReferenceOf(req), 'proceedToIssue'),
        rows: [
          row(
            'Have all the next steps for court staff been completed?',
            'next steps',
            label(NEXT_STEPS, answers.nextSteps)
          ),
          row('Is this a final order?', 'whether this is a final order', yesNo(answers.finalOrder)),
          row(
            'Should this order be served on all parties?',
            'whether to serve all parties',
            yesNo(answers.serveAllParties)
          ),
          ...(answers.serveAllParties === 'no'
            ? [row('Who should the order be served on?', 'who to serve', ...partiesToServe)]
            : []),
          row('Which seal should this order have?', 'the seal', label(SEALS, answers.seal)),
        ],
      },
    ],
  };
}

/** What each question page shows besides the case and any errors. */
const VIEWS = {
  review: (_req: Request, review: OrderReviewSession) => ({
    ...orderModel(review),
    // The judge's form, which the caseworker may change: as they last sent it, or else as the judge did.
    ...orderFormModel(review, review.answers.order),
    answers: review.answers,
    maxQueryLength: MAX_QUERY_LENGTH,
  }),
  'review-dates': (_req: Request, review: OrderReviewSession) => ({
    answers: review.answers,
    reviewDates: shownReviewDates(review.answers),
    reasons: REVIEW_REASONS,
    canAddReviewDate: review.answers.reviewDates.length < MAX_REVIEW_DATES,
    maxDescriptionLength: MAX_REVIEW_DESCRIPTION_LENGTH,
  }),
  'proceed-to-issue': (_req: Request, review: OrderReviewSession) => ({
    answers: review.answers,
    nextSteps: NEXT_STEPS,
    seals: SEALS,
    parties: partyChoices(review),
  }),
  'check-your-answers': checkYourAnswersContent,
} as const;

type View = keyof typeof VIEWS;

function render(
  req: Request,
  res: Response,
  view: View,
  issues: ValidationIssue[] = [],
  status = issues.length ? 400 : 200
): void {
  const review = reviewOf(req)!;
  res.status(status).render(`confirm-order-review/${view}`, {
    ...pageModel(req, review, issues),
    ...VIEWS[view](req, review),
  });
}

/** Shows the page a submission came from again, with why pcs-api refused it. */
const showRefusal = (req: Request, res: Response, view: View) => (error: CallbackRejectedError) =>
  render(
    req,
    res,
    view,
    error.reasons.map(message => ({ id: 'confirm-order-review-form', message })),
    error.status
  );

/** What stops the order being issued as the review page last sent it, by the rules the judge's order met. */
function orderIssues(review: OrderReviewSession): ValidationIssue[] {
  const { order } = review.answers;
  if (!order) {
    return [{ id: 'order-type', message: 'Select the type of order' }];
  }
  return validateMakeOrder(order.orderType, order.formData, attendanceParties(review));
}

/**
 * The first page after the given one with a question left unanswered, if any. Continuing from a page goes
 * there, or else to check your answers, which only shows a complete review: so a page reached from check
 * your answers, to change an answer, returns there.
 */
function firstIncompletePage(review: OrderReviewSession, after?: Page): Page | undefined {
  const { answers } = review;
  const pages: [Page, ValidationIssue[]][] = [
    ['review', orderIssues(review)],
    ['reviewDates', validateReviewDates(answers)],
    ['proceedToIssue', validateProceedToIssue(answers)],
  ];
  const remaining = pages.slice(pages.findIndex(([page]) => page === after) + 1);
  return remaining.find(([, issues]) => issues.length)?.[0];
}

export default function confirmOrderReviewRoutes(app: Application): void {
  app.get(route('intro'), ...journey, async (req: Request, res: Response, next) => {
    const caseReference = caseReferenceOf(req);
    try {
      // Opening the review starts it afresh: whatever was answered before, and its confirmation, go.
      endReview(req);
      // The caseworker's task links to the review of one order, which pcs-api starts, and names the task.
      const orderId = typeof req.query.orderId === 'string' ? req.query.orderId : undefined;
      const taskId = typeof req.query.taskId === 'string' ? req.query.taskId : undefined;
      const started = await ccdCaseService.startCaseEvent(
        req.session.user!.accessToken,
        caseReference,
        CONFIRM_ORDER_REVIEW_EVENT_ID,
        { orderId }
      );
      const payload = started.data.sdkEventPayload;
      if (!payload) {
        // CCD starts the event for anyone who can see the case, but only shows the payload to the
        // caseworkers it lets use the event.
        throw new HTTPError('Not permitted to review an order on this case', 403);
      }
      const start = JSON.parse(payload as string) as OrderStart;
      const review: OrderReviewSession = { ...start, eventToken: started.eventToken, answers: newAnswers(), taskId };
      req.session.orderReviews = { ...req.session.orderReviews, [caseReference]: review };
      res.render('confirm-order-review/intro', {
        ...pageModel(req, review),
        ...orderModel(review),
        continueUrl: pageUrl(caseReference, 'review'),
      });
    } catch (error) {
      refusedOrderEvent(res, next, error);
    }
  });

  app.get(route('cancel'), ...journey, (req: Request, res: Response) => {
    // As in XUI, cancelling keeps nothing the caseworker answered.
    endReview(req);
    res.redirect(manageCaseDetailsUrl(caseReferenceOf(req)));
  });

  app.get(route('review'), ...inJourney, (req: Request, res: Response) => render(req, res, 'review'));

  app.post(route('review'), ...inJourney, async (req: Request, res: Response, next) => {
    const review = reviewOf(req)!;
    const {
      _csrf,
      action,
      orderType,
      orderDocument,
      'send-query': sendQuery,
      'query-to-judge': queryToJudge,
      ...formData
    } = req.body;
    review.answers.sendQuery = ticked(sendQuery);
    review.answers.queryToJudge = text(queryToJudge);
    const type = choice(orderType, MAKE_ORDER_TYPES);
    if (type) {
      // Kept whichever button was pressed, so the page shows the caseworker's changes again.
      postedSnapshot(text(orderDocument));
      review.answers.order = { orderType: type, formData, orderDocumentJson: text(orderDocument) };
    }
    try {
      if (action === 'RETURN_TO_JUDGE') {
        const issues = validateQuery(review.answers);
        if (issues.length) {
          return render(req, res, 'review', issues);
        }
        await submitReview(req, review, 'RETURN_TO_JUDGE');
        return res.redirect(pageUrl(caseReferenceOf(req), 'confirmed'));
      }
      const issues = orderIssues(review);
      if (issues.length) {
        return render(req, res, 'review', issues);
      }
      return res.redirect(pageUrl(caseReferenceOf(req), firstIncompletePage(review, 'review') ?? 'checkYourAnswers'));
    } catch (error) {
      refusedOrderEvent(res, next, error, showRefusal(req, res, 'review'));
    }
  });

  app.get(route('reviewDates'), ...inJourney, (req: Request, res: Response) => render(req, res, 'review-dates'));

  app.post(route('reviewDates'), ...inJourney, (req: Request, res: Response) => {
    const review = reviewOf(req)!;
    const { answers } = review;
    const caseReference = caseReferenceOf(req);
    answers.hasReviewDates = choice(req.body['has-review-dates'], ['yes', 'no'] as const);
    if (answers.hasReviewDates === 'yes') {
      answers.reviewDates = postedReviewDates(req.body, shownReviewDates(answers).length);
    }
    const action = text(req.body.action);
    if (action === 'previous') {
      return res.redirect(pageUrl(caseReference, 'review'));
    }
    if (action === 'add') {
      if (answers.reviewDates.length < MAX_REVIEW_DATES) {
        answers.reviewDates.push(blankReviewDate());
      }
      return res.redirect(`${req.originalUrl}#review-date-${answers.reviewDates.length}`);
    }
    const removing = /^remove-(\d+)$/.exec(action);
    if (removing) {
      answers.reviewDates.splice(Number(removing[1]) - 1, 1);
      return res.redirect(pageUrl(caseReference, 'reviewDates'));
    }
    const issues = validateReviewDates(answers);
    if (issues.length) {
      return render(req, res, 'review-dates', issues);
    }
    return res.redirect(pageUrl(caseReference, firstIncompletePage(review, 'reviewDates') ?? 'checkYourAnswers'));
  });

  app.get(route('proceedToIssue'), ...inJourney, (req: Request, res: Response) => render(req, res, 'proceed-to-issue'));

  app.post(route('proceedToIssue'), ...inJourney, (req: Request, res: Response) => {
    const review = reviewOf(req)!;
    const { answers } = review;
    answers.nextSteps = text(req.body['next-steps']) || undefined;
    answers.finalOrder = choice(req.body['final-order'], ['yes', 'no'] as const);
    answers.serveAllParties = choice(req.body['serve-all-parties'], ['yes', 'no'] as const);
    const parties = new Set(partyChoices(review).map(party => party.value));
    answers.partiesToServe = list(req.body['parties-to-serve']).filter(id => parties.has(id));
    answers.seal = text(req.body.seal) || undefined;
    if (req.body.action === 'previous') {
      return res.redirect(pageUrl(caseReferenceOf(req), 'reviewDates'));
    }
    const issues = validateProceedToIssue(answers);
    if (issues.length) {
      return render(req, res, 'proceed-to-issue', issues);
    }
    return res.redirect(pageUrl(caseReferenceOf(req), 'checkYourAnswers'));
  });

  app.get(route('checkYourAnswers'), ...inJourney, (req: Request, res: Response) => {
    const incomplete = firstIncompletePage(reviewOf(req)!);
    if (incomplete) {
      return res.redirect(pageUrl(caseReferenceOf(req), incomplete));
    }
    render(req, res, 'check-your-answers');
  });

  app.post(route('checkYourAnswers'), ...inJourney, async (req: Request, res: Response, next) => {
    const review = reviewOf(req)!;
    const caseReference = caseReferenceOf(req);
    if (req.body.action === 'previous') {
      return res.redirect(pageUrl(caseReference, 'proceedToIssue'));
    }
    // The answers may have changed since the page showed them, such as in another tab.
    const incomplete = firstIncompletePage(review);
    if (incomplete) {
      return res.redirect(pageUrl(caseReference, incomplete));
    }
    try {
      await submitReview(req, review, 'ISSUE');
      return res.redirect(pageUrl(caseReference, 'confirmed'));
    } catch (error) {
      refusedOrderEvent(res, next, error, showRefusal(req, res, 'check-your-answers'));
    }
  });

  app.get(route('confirmed'), ...journey, (req: Request, res: Response) => {
    const caseReference = caseReferenceOf(req);
    const closeUrl = manageCaseDetailsUrl(caseReference);
    const review = req.session.orderReviews?.[caseReference];
    if (!review?.outcome) {
      // As in XUI, a confirmation with nothing to confirm returns the user to the case.
      return res.redirect(closeUrl);
    }
    res.render('order-confirmation', {
      headerModel: xuiHeaderModel(req),
      footerModel: buildFooterModel(),
      title: review.outcome === 'ISSUED' ? 'Order issued' : 'Referred to Judge',
      ...confirmationHeader(caseReference, review.caseContext),
      closeText: 'Close and return to case summary',
      closeUrl,
    });
  });
}
