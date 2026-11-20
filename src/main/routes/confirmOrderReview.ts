import { buildFooterModel } from '@hmcts-cft/cft-ui-component-lib';
import { type DocWeaveSnapshot, describeChanges, parseSnapshot, renderHtml } from '@hmcts-cft/docweave';
import { Application, Request, RequestHandler, Response } from 'express';

import { CallbackRejectedError, HTTPError } from '../HttpError';
import { CONFIRM_ORDER_REVIEW_ROUTE } from '../constants/caseRoutes';
import { makeOrderFeatureMiddleware, oidcMiddleware } from '../middleware';

import { ccdCaseService } from '@services/ccdCaseService';
import {
  applicationsToDecide,
  attendanceParties,
  orderFormModel,
  withoutUnchosenNoticeDates,
} from '@utils/makeOrderForm';
import { APPLY_BY_PASSED, MAKE_ORDER_TYPES, validateMakeOrder } from '@utils/makeOrderValidation';
import {
  COSTS,
  FREQUENCIES,
  MAX_MONEY_JUDGMENTS,
  type MoneyJudgmentAnswer,
  type Sides,
  blankJudgment,
  judgmentSummary,
  moneyJudgmentRows,
  postedJudgments,
  validateMoneyJudgments,
} from '@utils/moneyJudgments';
import {
  type OrderStart,
  caseHeader,
  confirmationHeader,
  decodeOrderDocument,
  manageCaseDetailsUrl,
  postedSnapshot,
  refusalPage,
  refusedOrderEvent,
  xuiHeaderModel,
} from '@utils/orderCase';
import {
  ADJOURNMENT,
  GROUNDS,
  MAX_GROUNDS_DETAILS_LENGTH,
  ORDER_DETAILS_FIELDS,
  ORDER_DOES,
  OUTRIGHT_POSSESSION,
  STRIKE_OUT,
  YES_NO,
  orderDetailsRows,
  validateOrderDetails,
} from '@utils/orderDetails';
import {
  MAX_QUERY_LENGTH,
  MAX_REVIEW_DATES,
  MAX_REVIEW_DESCRIPTION_LENGTH,
  type OrderReviewAnswers,
  type OrderReviewSession,
  REVIEW_REASONS,
  type ReviewDateAnswer,
  SEALS,
  TASKS_OUTSTANDING,
  type ValidationIssue,
  blankReviewDate,
  choice,
  issueSummary,
  issuesFreeForm,
  list,
  newAnswers,
  reviewRequest,
  staffMessage,
  startMoneyJudgments,
  text,
  ticked,
  validateProceedToIssue,
  validateQuery,
  validateReviewDates,
} from '@utils/orderReview';

/*
 * A caseworker's review of a judge's order, reached from their Work Allocation task through XUI. Like the
 * make order page, it is plain Express rather than a citizen steps journey: its pages are a CCD event
 * started as the review opens and submitted with that start's token, and its forms post several buttons.
 * Three pages, each with the order beside it: the review of the judge's order, which embeds the make order
 * form and its editor and can return the order to the judge; what court staff record from the order to
 * issue it; and their answers to check before they issue it.
 */

const CONFIRM_ORDER_REVIEW_EVENT_ID = 'ext:confirmOrderReview';

const PAGES = {
  intro: '',
  review: '/review',
  record: '/record',
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

/** The review in progress on the case, if opening it started one that has not ended. */
function reviewOf(req: Request): OrderReviewSession | undefined {
  const review = req.session.orderReviews?.[caseReferenceOf(req)];
  return review && !review.outcome ? review : undefined;
}

/**
 * The pages continue the review opening it started; without one, such as after a cancel, a submission or in
 * a new session, the caseworker opens it again, which starts it afresh.
 */
const reviewInProgress: RequestHandler = (req, res, next) =>
  reviewOf(req) ? next() : res.redirect(pageUrl(caseReferenceOf(req), 'intro'));

export const ANOTHER_REVIEW_OPENED =
  'You opened the review of another order on this case after this page. Open this order again from its task';

/**
 * The review is kept for the case, so a page left open in another tab is for whichever order was opened last:
 * a page posted for another order is refused, rather than its answers going to the order now open.
 */
const sameOrder: RequestHandler = (req, res, next) =>
  req.method !== 'POST' || req.body.reviewOrderId === reviewOf(req)!.order.id
    ? next()
    : refusalPage(req, res)(new CallbackRejectedError([ANOTHER_REVIEW_OPENED], 409));

const journey = [oidcMiddleware, makeOrderFeatureMiddleware];
const inJourney = [...journey, reviewInProgress, sameOrder];

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
    reviewOrderId: review.order.id,
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

function sidesOf(review: OrderReviewSession): Sides {
  return {
    claimants: review.caseContext.claimants.map(party => party.id),
    defendants: review.caseContext.defendants.map(party => party.id),
  };
}

/**
 * Why the money judgments are not done: an answer missing, or judgments made from the judge's answers that court
 * staff have not yet checked.
 */
function moneyJudgmentIssues(answers: OrderReviewAnswers): ValidationIssue[] {
  const issues = validateMoneyJudgments(answers.moneyJudgments);
  return issues.length || answers.moneyJudgmentsSaved || answers.moneyJudgments?.hasMoneyJudgments !== 'yes'
    ? issues
    : [{ id: 'has-money-judgments', message: 'Check the money judgments' }];
}

function partyChoices(review: OrderReviewSession) {
  const { claimants, defendants } = review.caseContext;
  // In claim order: the claimants, then the defendants in the order they were added to the claim.
  return [
    ...claimants.map((party, index) => ({ value: party.id, text: `Claimant ${index + 1}: ${party.name}` })),
    ...defendants.map((party, index) => ({ value: party.id, text: `Defendant ${index + 1}: ${party.name}` })),
  ];
}

function partyNamesOf(review: OrderReviewSession): (id: string) => string {
  const names = new Map(partyChoices(review).map(party => [party.value, party.text]));
  return id => names.get(id) ?? id;
}

/**
 * Submits the caseworker's review with the token its start gave; pcs-api refuses it if the order changed
 * since. The review then ends with its outcome, which its confirmation shows and which survives a refresh,
 * which cannot submit it again.
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

/** Where each section of the record page starts, which check your answers changes it at. */
const SECTIONS = {
  orderDetails: 'order-details',
  moneyJudgments: 'money-judgments',
  reviewDates: 'review-dates',
  service: 'service',
} as const;

/** The caseworker's answers in the order asked, in a section for each part of the record page. */
function checkYourAnswersContent(req: Request, review: OrderReviewSession): Record<string, unknown> {
  const { answers } = review;
  const label = (options: readonly { value: string; text: string }[], value?: string) =>
    options.find(option => option.value === value)?.text ?? value ?? '';
  const yesNo = (value?: string) => (value === 'yes' ? 'Yes' : 'No');
  const row = (key: string, hiddenText: string, ...lines: string[]) => ({ key, hiddenText, lines });
  const reviewDates = answers.hasReviewDates === 'yes' ? answers.reviewDates : [];
  const partyName = partyNamesOf(review);
  const change = (section: string) => `${pageUrl(caseReferenceOf(req), 'record')}#${section}`;
  return {
    issueSummary: issueSummary(review),
    sections: [
      ...(issuesFreeForm(answers)
        ? [
            {
              heading: 'What the order does',
              id: 'order-details-answers',
              href: change(SECTIONS.orderDetails),
              rows: orderDetailsRows(answers.orderDetails).map(([key, value]) => row(key, key, value)),
            },
          ]
        : []),
      {
        heading: 'Money judgments and costs',
        id: 'money-judgments-answers',
        href: change(SECTIONS.moneyJudgments),
        rows: moneyJudgmentRows(answers.moneyJudgments, partyName).map(([key, lines]) => row(key, key, ...lines)),
      },
      {
        heading: 'Review dates',
        id: 'review-dates-answers',
        href: change(SECTIONS.reviewDates),
        rows: reviewDates.length
          ? reviewDates.map(({ day, month, year, reason, description }, index) =>
              row(
                `Review date ${index + 1}`,
                `review date ${index + 1}`,
                `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`,
                label(REVIEW_REASONS, reason),
                description.trim()
              )
            )
          : [row('Review dates', 'review dates', 'None')],
      },
      {
        heading: 'Service and seal',
        id: 'issue-answers',
        href: change(SECTIONS.service),
        rows: [
          row('Next steps for court staff completed', 'next steps', answers.nextSteps === 'complete' ? 'Yes' : 'No'),
          row(
            'Does this order finally resolve any part of the case?',
            'whether this order finally resolves any part of the case',
            yesNo(answers.finalOrder)
          ),
          row(
            'Has permission been given to issue a warrant/writ of restitution?',
            'whether permission has been given to issue restitution',
            yesNo(answers.restitutionPermission)
          ),
          row(
            'Should this order be served on all parties?',
            'whether to serve all parties',
            yesNo(answers.serveAllParties)
          ),
          ...(answers.serveAllParties === 'no'
            ? [row('Who should the order be served on?', 'who to serve', ...answers.partiesToServe.map(partyName))]
            : []),
          row('Which seal should this order have?', 'the seal', label(SEALS, answers.seal)),
        ],
      },
    ],
  };
}

/** The order as it will be issued, with any changes court staff made. */
function issuingHtml(review: OrderReviewSession): string | undefined {
  return review.answers.order?.orderDocumentJson
    ? renderHtml(parseSnapshot(review.answers.order.orderDocumentJson))
    : undefined;
}

/** A money judgment as its row of the record page shows it: summed up, with its answers as typed. */
function judgmentModel(review: OrderReviewSession, judgment: MoneyJudgmentAnswer, n: number, issues: ValidationIssue[]) {
  const prefix = `judgment-${n}`;
  const blank = !judgment.arrears && !judgment.otherAmount && !judgment.costs;
  return {
    ...judgment,
    summary: judgmentSummary(judgment, partyNamesOf(review)),
    // Shut once it is summed up, unless it is still to fill in or has an answer to put right.
    open: blank || issues.some(issue => issue.id.startsWith(`${prefix}-`)),
  };
}

/** What each page shows besides the case and any errors. */
const VIEWS = {
  review: (_req: Request, review: OrderReviewSession) => ({
    ...orderModel(review),
    // The judge's form, which the caseworker may change: as they last sent it, or else as the judge did.
    ...orderFormModel(review, review.answers.order),
    answers: review.answers,
    maxQueryLength: MAX_QUERY_LENGTH,
  }),
  record: (_req: Request, review: OrderReviewSession, issues: ValidationIssue[]) => {
    const { answers } = review;
    const judgments = answers.moneyJudgments?.judgments ?? [];
    return {
      staffMessage: staffMessage(review.order.formData),
      // The order as it will be issued, with any changes court staff made, to record from.
      issuingHtml: issuingHtml(review),
      sections: SECTIONS,
      freeForm: issuesFreeForm(answers),
      orderDetails: answers.orderDetails ?? {},
      orderDoes: ORDER_DOES,
      outrightPossession: OUTRIGHT_POSSESSION,
      grounds: GROUNDS,
      adjournment: ADJOURNMENT,
      strikeOut: STRIKE_OUT,
      yesNo: YES_NO,
      maxGroundsDetailsLength: MAX_GROUNDS_DETAILS_LENGTH,
      moneyAnswers: answers.moneyJudgments ?? { judgments: [] },
      judgments: judgments.map((judgment, index) => judgmentModel(review, judgment, index + 1, issues)),
      costsOptions: COSTS,
      frequencies: FREQUENCIES,
      canAddJudgment: judgments.length < MAX_MONEY_JUDGMENTS,
      maxJudgments: MAX_MONEY_JUDGMENTS,
      answers,
      reviewDates: answers.reviewDates,
      reasons: REVIEW_REASONS,
      canAddReviewDate: answers.reviewDates.length < MAX_REVIEW_DATES,
      maxReviewDates: MAX_REVIEW_DATES,
      maxDescriptionLength: MAX_REVIEW_DESCRIPTION_LENGTH,
      tasksOutstanding: TASKS_OUTSTANDING,
      seals: SEALS,
      parties: partyChoices(review),
      issueSummary: issueSummary(review),
    };
  },
  'check-your-answers': (req: Request, review: OrderReviewSession) => ({
    ...checkYourAnswersContent(req, review),
    staffMessage: staffMessage(review.order.formData),
    issuingHtml: issuingHtml(review),
  }),
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
    ...VIEWS[view](req, review, issues),
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

const APPLY_BY_PASSED_REVIEW =
  'If the date needs to change, you can send a query to the Judge to return the order to them';

/** What stops the order being issued as the review page last sent it, by the rules the judge's order met. */
export const NO_WORDING = "The order's wording did not load. Reload the page and review the order again";

function orderIssues(review: OrderReviewSession): ValidationIssue[] {
  const { order } = review.answers;
  if (!order) {
    return [{ id: 'order-type', message: 'Select the type of order' }];
  }
  // The page's script builds the wording to issue; without it, as when the script did not load, there is none.
  if (!order.orderDocumentJson) {
    return [{ id: 'make-order-form', message: NO_WORDING }];
  }
  return validateMakeOrder(
    order.orderType,
    order.formData,
    review.hearing ? attendanceParties(review) : [],
    !review.hearing,
    applicationsToDecide(review)
  ).map(issue =>
    // Court staff may not know what date the Judge would give instead, which they can ask with a query.
    issue.message === APPLY_BY_PASSED ? { ...issue, message: `${APPLY_BY_PASSED}. ${APPLY_BY_PASSED_REVIEW}` } : issue
  );
}

/** What stops the order being issued from the record page's answers, in the order the page asks them. */
function recordIssues(review: OrderReviewSession): ValidationIssue[] {
  const { answers } = review;
  return [
    ...(issuesFreeForm(answers) ? validateOrderDetails(answers.orderDetails) : []),
    ...moneyJudgmentIssues(answers),
    ...validateReviewDates(answers),
    ...validateProceedToIssue(answers),
  ];
}

/**
 * The first page after the given one with a question left unanswered, if any. Continuing from a page goes
 * there, or else to check your answers, which only shows a complete review: so a page reached from check
 * your answers, to change an answer, returns there.
 */
function firstIncompletePage(review: OrderReviewSession, after?: Page): Page | undefined {
  const pages: [Page, ValidationIssue[]][] = [
    ['review', orderIssues(review)],
    ['record', recordIssues(review)],
  ];
  const remaining = pages.slice(pages.findIndex(([page]) => page === after) + 1);
  return remaining.find(([, issues]) => issues.length)?.[0];
}

/** Takes the record page's answers, every section's, as it posted them. */
function takeRecordAnswers(review: OrderReviewSession, body: Record<string, unknown>): void {
  const { answers } = review;
  if (issuesFreeForm(answers)) {
    answers.orderDetails = Object.fromEntries(ORDER_DETAILS_FIELDS.map(field => [field, text(body[field])]));
  }

  const judgments = answers.moneyJudgments!;
  const before = JSON.stringify(judgments);
  const parties = new Set(partyChoices(review).map(party => party.value));
  judgments.costs = text(body.costs) || undefined;
  judgments.judgments = postedJudgments(body, judgments.judgments.length, parties);
  judgments.hasMoneyJudgments = judgments.judgments.length
    ? 'yes'
    : list(body['has-money-judgments']).includes('no')
      ? 'no'
      : undefined;
  // Once court staff change or confirm them, they are theirs: a change to the judge's answers no longer changes them.
  if (body.action !== 'previous' || JSON.stringify(judgments) !== before) {
    answers.moneyJudgmentsSaved = true;
  }

  answers.reviewDates = postedReviewDates(body, answers.reviewDates.length);
  answers.hasReviewDates = answers.reviewDates.length
    ? 'yes'
    : list(body['has-review-dates']).includes('no')
      ? 'no'
      : undefined;

  answers.nextSteps = list(body['next-steps']).includes('complete') ? 'complete' : undefined;
  answers.finalOrder = choice(body['final-order'], ['yes', 'no'] as const);
  answers.restitutionPermission = choice(body['restitution-permission'], ['yes', 'no'] as const);
  answers.serveAllParties = choice(body['serve-all-parties'], ['yes', 'no'] as const);
  answers.partiesToServe = list(body['parties-to-serve']).filter(id => parties.has(id));
  answers.seal = text(body.seal) || undefined;
}

/**
 * Adds or removes a money judgment or review date as the record page's button asked, returning where the page
 * should open again, or nothing for another button.
 */
function changeList(review: OrderReviewSession, action: string): string | undefined {
  const { answers } = review;
  const judgments = answers.moneyJudgments!;
  if (action === 'add-judgment') {
    if (judgments.judgments.length < MAX_MONEY_JUDGMENTS) {
      judgments.judgments.push(blankJudgment(sidesOf(review)));
      judgments.hasMoneyJudgments = 'yes';
    }
    return `judgment-${judgments.judgments.length}`;
  }
  if (action === 'add-review-date') {
    if (answers.reviewDates.length < MAX_REVIEW_DATES) {
      answers.reviewDates.push(blankReviewDate());
      answers.hasReviewDates = 'yes';
    }
    return `review-date-${answers.reviewDates.length}`;
  }
  const removing = /^remove-(judgment|review-date)-(\d+)$/.exec(action);
  if (!removing) {
    return undefined;
  }
  const rows = removing[1] === 'judgment' ? judgments.judgments : answers.reviewDates;
  rows.splice(Number(removing[2]) - 1, 1);
  // With none left, court staff say again whether the order has any.
  if (removing[1] === 'judgment' && !rows.length) {
    judgments.hasMoneyJudgments = undefined;
  } else if (!rows.length) {
    answers.hasReviewDates = undefined;
  }
  return removing[1] === 'judgment' ? SECTIONS.moneyJudgments : SECTIONS.reviewDates;
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
      // The review page, which a refresh shows again rather than starting the review afresh.
      res.redirect(pageUrl(caseReference, 'review'));
    } catch (error) {
      refusedOrderEvent(res, next, error, refusalPage(req, res));
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
      orderDocument: encodedDocument,
      'send-query': sendQuery,
      'query-to-judge': queryToJudge,
      reviewOrderId: _reviewOrderId,
      ...formData
    } = req.body;
    const orderDocument = decodeOrderDocument(encodedDocument);
    review.answers.sendQuery = ticked(sendQuery);
    review.answers.queryToJudge = text(queryToJudge);
    const type = choice(orderType, MAKE_ORDER_TYPES);
    if (type) {
      // Kept whichever button was pressed, so the page shows the caseworker's changes again.
      postedSnapshot(text(orderDocument));
      review.answers.order = {
        orderType: type,
        formData: withoutUnchosenNoticeDates(formData),
        orderDocumentJson: text(orderDocument),
      };
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
      startMoneyJudgments(review);
      return res.redirect(pageUrl(caseReferenceOf(req), firstIncompletePage(review, 'review') ?? 'checkYourAnswers'));
    } catch (error) {
      refusedOrderEvent(res, next, error, showRefusal(req, res, 'review'));
    }
  });

  app.get(route('record'), ...inJourney, (req: Request, res: Response) =>
    reviewOf(req)!.answers.moneyJudgments
      ? render(req, res, 'record')
      : res.redirect(pageUrl(caseReferenceOf(req), 'review'))
  );

  app.post(route('record'), ...inJourney, (req: Request, res: Response) => {
    const review = reviewOf(req)!;
    const caseReference = caseReferenceOf(req);
    if (!review.answers.moneyJudgments) {
      return res.redirect(pageUrl(caseReference, 'review'));
    }
    takeRecordAnswers(review, req.body);
    const action = text(req.body.action);
    if (action === 'previous') {
      return res.redirect(pageUrl(caseReference, 'review'));
    }
    const changed = changeList(review, action);
    if (changed) {
      return res.redirect(`${pageUrl(caseReference, 'record')}#${changed}`);
    }
    const issues = recordIssues(review);
    if (issues.length) {
      return render(req, res, 'record', issues);
    }
    return res.redirect(pageUrl(caseReference, 'checkYourAnswers'));
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
      return res.redirect(pageUrl(caseReference, 'record'));
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
