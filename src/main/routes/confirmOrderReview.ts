import { buildFooterModel } from '@hmcts-cft/cft-ui-component-lib';
import { type DocWeaveSnapshot, describeChanges } from '@hmcts-cft/docweave';
import { Application, NextFunction, Request, RequestHandler, Response } from 'express';

import { CallbackRejectedError, HTTPError } from '../HttpError';
import { CONFIRM_ORDER_REVIEW_ROUTE } from '../constants/caseRoutes';
import { makeOrderFeatureMiddleware, oidcMiddleware } from '../middleware';

import { ccdCaseService } from '@services/ccdCaseService';
import {
  type OrderStart,
  caseHeader,
  confirmationHeader,
  manageCaseDetailsUrl,
  refusedByCcd,
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
  newAnswers,
  reviewRequest,
  staffMessage,
  ticked,
  validateProceedToIssue,
  validateQuery,
  validateReviewDates,
} from '@utils/orderReview';

const CONFIRM_ORDER_REVIEW_EVENT_ID = 'ext:confirmOrderReview';

const PAGES = {
  intro: '',
  review: '/review',
  reviewDates: '/review-dates',
  removeReviewDate: '/review-dates/remove/:index',
  proceedToIssue: '/proceed-to-issue',
  checkYourAnswers: '/check-your-answers',
  cancel: '/cancel',
  orderIssued: '/order-issued',
  referredToJudge: '/referred-to-judge',
} as const;

type Page = keyof typeof PAGES;

function route(page: Page): string {
  return `${CONFIRM_ORDER_REVIEW_ROUTE}${PAGES[page]}`;
}

function pageUrl(caseReference: string, page: Page, index?: number): string {
  return route(page)
    .replace(':caseReference', caseReference)
    .replace(':index', String(index ?? ''));
}

/** A page reached from check your answers returns there once the caseworker continues. */
function changing(req: Request): boolean {
  return req.query.change === 'cya';
}

function nextPage(req: Request, caseReference: string, page: Page): string {
  return pageUrl(caseReference, changing(req) ? 'checkYourAnswers' : page);
}

function caseReferenceOf(req: Request): string {
  return req.params.caseReference as string;
}

function reviewOf(req: Request): OrderReviewSession | undefined {
  return req.session.orderReviews?.[caseReferenceOf(req)];
}

function endReview(req: Request): void {
  delete req.session.orderReviews?.[caseReferenceOf(req)];
}

/**
 * The pages after the introduction continue the review the introduction started; without one, such
 * as after a cancel or in a new session, the caseworker starts again from the introduction.
 */
const reviewInProgress: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (!reviewOf(req)) {
    return res.redirect(pageUrl(caseReferenceOf(req), 'intro'));
  }
  next();
};

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
    urls: Object.fromEntries(
      (Object.keys(PAGES) as Page[]).map(page => [page, pageUrl(caseReference, page)])
    ) as Record<Page, string>,
  };
}

/** How the judge changed the order Docweave generated from their answers, as the review pages tell the caseworker. */
function judgeEdits(snapshot: DocWeaveSnapshot | null | undefined) {
  const changes = snapshot ? describeChanges(snapshot) : { inserted: 0, modified: 0, removed: 0 };
  return { added: changes.inserted > 0, changed: changes.modified > 0, deleted: changes.removed > 0 };
}

/** The order as the review pages show it: its document for the preview, and how the judge changed it. */
function orderModel(review: OrderReviewSession) {
  const snapshot = review.order.docweaveSnapshot;
  return {
    freeForm: review.order.orderType === 'FREE_FORM',
    edits: judgeEdits(snapshot),
    staffMessage: staffMessage(review.order.formData),
    // Rendered into a script element, so nothing in the order can close it.
    orderSnapshotJson: JSON.stringify(snapshot ?? null).replace(/</g, '\\u003c'),
  };
}

function list(value: unknown): string[] {
  return ([] as unknown[]).concat(value ?? []).map(String);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function choice<T extends string>(value: unknown, choices: readonly T[]): T | undefined {
  return choices.find(option => option === value);
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

function reviewDateLabel(reviewDate: ReviewDateAnswer): string {
  const { day, month, year } = reviewDate;
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

function reasonLabel(reason: string): string {
  return REVIEW_REASONS.find(option => option.value === reason)?.text ?? reason;
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
 * the order changed since. The review then ends, and its confirmation is kept so it survives a
 * refresh, which cannot submit it again.
 */
async function submitReview(req: Request, review: OrderReviewSession, action: 'RETURN_TO_JUDGE' | 'ISSUE') {
  const caseReference = caseReferenceOf(req);
  await ccdCaseService.submitCaseEvent(
    req.session.user!.accessToken,
    caseReference,
    CONFIRM_ORDER_REVIEW_EVENT_ID,
    review.eventToken,
    { sdkEventPayload: JSON.stringify(reviewRequest(review, action)) }
  );
  endReview(req);
  req.session.orderReviewOutcomes = {
    ...req.session.orderReviewOutcomes,
    [caseReference]: {
      outcome: action === 'ISSUE' ? 'ISSUED' : 'RETURNED_TO_JUDGE',
      ...confirmationHeader(caseReference, review.caseContext),
    },
  };
}

function checkYourAnswersContent(req: Request, review: OrderReviewSession): Record<string, unknown> {
  const { answers } = review;
  const change = (page: Page) => `${pageUrl(caseReferenceOf(req), page)}?change=cya`;
  const yesNo = (value?: string) => (value === 'yes' ? 'Yes' : 'No');
  const partyNames = new Map(partyChoices(review).map(party => [party.value, party.text]));
  return {
    reviewDates:
      answers.hasReviewDates === 'yes'
        ? answers.reviewDates.map(reviewDate => ({
            date: reviewDateLabel(reviewDate),
            reason: reasonLabel(reviewDate.reason),
            description: reviewDate.description.trim(),
          }))
        : [],
    rows: {
      hasReviewDates: { value: yesNo(answers.hasReviewDates), href: change('reviewDates') },
      nextSteps: {
        value: NEXT_STEPS.find(option => option.value === answers.nextSteps)?.text,
        href: change('proceedToIssue'),
      },
      finalOrder: { value: yesNo(answers.finalOrder), href: change('proceedToIssue') },
      serveAllParties: { value: yesNo(answers.serveAllParties), href: change('proceedToIssue') },
      partiesToServe:
        answers.serveAllParties === 'no'
          ? { value: answers.partiesToServe.map(id => partyNames.get(id) ?? id), href: change('proceedToIssue') }
          : undefined,
      seal: { value: SEALS.find(option => option.value === answers.seal)?.text, href: change('proceedToIssue') },
    },
  };
}

/** What each question page shows besides the case and any errors. */
const VIEWS = {
  review: (_req: Request, review: OrderReviewSession) => ({
    ...orderModel(review),
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

/** Where a submission pcs-api refused goes: back to the page it came from, with why. */
function handleSubmitError(req: Request, res: Response, view: View, error: unknown): void {
  if (error instanceof CallbackRejectedError) {
    const reasons = error.reasons.map(message => ({ id: 'confirm-order-review-form', message }));
    return render(req, res, view, reasons, error.status);
  }
  if (refusedByCcd(error)) {
    res.status(404).send('Not Found');
    return;
  }
  throw error;
}

/** The first page with a question left unanswered, if any: check your answers only shows a complete review. */
function firstIncompletePage(answers: OrderReviewAnswers): Page | undefined {
  if (validateReviewDates(answers).length) {
    return 'reviewDates';
  }
  return validateProceedToIssue(answers).length ? 'proceedToIssue' : undefined;
}

export default function confirmOrderReviewRoutes(app: Application): void {
  app.get(route('intro'), ...journey, async (req: Request, res: Response, next) => {
    const caseReference = caseReferenceOf(req);
    try {
      // Opening the review starts it afresh: whatever was answered before, and its confirmation, go.
      endReview(req);
      delete req.session.orderReviewOutcomes?.[caseReference];
      // The draft orders tab links to the review of one order, which pcs-api starts.
      const orderId = typeof req.query.orderId === 'string' ? req.query.orderId : undefined;
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
      const review: OrderReviewSession = { ...start, eventToken: started.eventToken, answers: newAnswers() };
      req.session.orderReviews = { ...req.session.orderReviews, [caseReference]: review };
      res.render('confirm-order-review/intro', { ...pageModel(req, review), ...orderModel(review) });
    } catch (error) {
      if (error instanceof CallbackRejectedError) {
        // pcs-api refuses to start the review when the chosen order is not waiting for one.
        return res.render('confirm-order-review/no-order', {
          headerModel: xuiHeaderModel(req),
          footerModel: buildFooterModel(),
          reasons: error.reasons,
          closeUrl: manageCaseDetailsUrl(caseReference),
        });
      }
      if (refusedByCcd(error)) {
        return res.status(404).send('Not Found');
      }
      next(error);
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
    review.answers.sendQuery = ticked(req.body['send-query']);
    review.answers.queryToJudge = text(req.body['query-to-judge']);
    try {
      if (req.body.action === 'RETURN_TO_JUDGE') {
        const issues = validateQuery(review.answers);
        if (issues.length) {
          return render(req, res, 'review', issues);
        }
        await submitReview(req, review, 'RETURN_TO_JUDGE');
        return res.redirect(pageUrl(caseReferenceOf(req), 'referredToJudge'));
      }
      return res.redirect(pageUrl(caseReferenceOf(req), 'reviewDates'));
    } catch (error) {
      try {
        handleSubmitError(req, res, 'review', error);
      } catch (unhandled) {
        next(unhandled);
      }
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
      return res.redirect(`${req.originalUrl.split('#')[0]}#review-date-${answers.reviewDates.length}`);
    }
    const removing = /^remove-(\d+)$/.exec(action);
    if (removing) {
      const removeUrl = pageUrl(caseReference, 'removeReviewDate', Number(removing[1]));
      return res.redirect(changing(req) ? `${removeUrl}?change=cya` : removeUrl);
    }
    const issues = validateReviewDates(answers);
    if (issues.length) {
      return render(req, res, 'review-dates', issues);
    }
    return res.redirect(nextPage(req, caseReference, 'proceedToIssue'));
  });

  app.get(route('removeReviewDate'), ...inJourney, (req: Request, res: Response) => {
    const review = reviewOf(req)!;
    const index = Number(req.params.index);
    const reviewDate = review.answers.reviewDates[index - 1];
    const reviewDatesUrl = `${pageUrl(caseReferenceOf(req), 'reviewDates')}${changing(req) ? '?change=cya' : ''}`;
    if (!reviewDate) {
      return res.redirect(reviewDatesUrl);
    }
    res.render('confirm-order-review/remove-review-date', {
      ...pageModel(req, review),
      number: index,
      reviewDate: { ...reviewDate, reason: reasonLabel(reviewDate.reason), date: reviewDateLabel(reviewDate) },
      reviewDatesUrl,
    });
  });

  app.post(route('removeReviewDate'), ...inJourney, (req: Request, res: Response) => {
    const review = reviewOf(req)!;
    if (req.body.confirm === 'yes') {
      review.answers.reviewDates.splice(Number(req.params.index) - 1, 1);
    }
    res.redirect(`${pageUrl(caseReferenceOf(req), 'reviewDates')}${changing(req) ? '?change=cya' : ''}`);
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
    const incomplete = firstIncompletePage(reviewOf(req)!.answers);
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
    const incomplete = firstIncompletePage(review.answers);
    if (incomplete) {
      return res.redirect(pageUrl(caseReference, incomplete));
    }
    try {
      await submitReview(req, review, 'ISSUE');
      return res.redirect(pageUrl(caseReference, 'orderIssued'));
    } catch (error) {
      try {
        handleSubmitError(req, res, 'check-your-answers', error);
      } catch (unhandled) {
        next(unhandled);
      }
    }
  });

  const confirmation = (outcome: 'ISSUED' | 'RETURNED_TO_JUDGE', title: string) => (req: Request, res: Response) => {
    const caseReference = caseReferenceOf(req);
    const closeUrl = manageCaseDetailsUrl(caseReference);
    const reviewed = req.session.orderReviewOutcomes?.[caseReference];
    if (reviewed?.outcome !== outcome) {
      // As in XUI, a confirmation with nothing to confirm returns the user to the case.
      return res.redirect(closeUrl);
    }
    res.render('order-confirmation', {
      headerModel: xuiHeaderModel(req),
      footerModel: buildFooterModel(),
      title,
      ...reviewed,
      closeText: 'Close and return to case summary',
      closeUrl,
    });
  };

  app.get(route('orderIssued'), ...journey, confirmation('ISSUED', 'Order issued'));
  app.get(route('referredToJudge'), ...journey, confirmation('RETURNED_TO_JUDGE', 'Referred to Judge'));
}
