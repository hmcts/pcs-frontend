import { parseSnapshot, renderHtml } from '@hmcts-cft/docweave';

import { hearingTime, noticeRequestLabel } from '@utils/makeOrderForm';
import { NOTICE_DATE_PREFIXES, formatDate, parseDate } from '@utils/makeOrderFormat';
import { type MoneyJudgmentsAnswers, judgmentsFromOrder, moneyJudgmentsRequest } from '@utils/moneyJudgments';
import type { FormData, OrderStart } from '@utils/orderCase';
import { type OrderDetailsAnswers, orderDetailsRequest } from '@utils/orderDetails';
import { applicationDecisions, claimOutcome, first } from '@utils/orderOutcome';

export const REVIEW_REASONS = [
  { value: 'UNLESS_ORDER', text: 'Unless order' },
  { value: 'STAY_CASE', text: 'Stay a case' },
  { value: 'LIFT_STAY', text: 'Lift a stay' },
  { value: 'DISMISS_CASE', text: 'Dismiss case' },
  { value: 'GENERAL_ORDER', text: 'General order' },
  { value: 'OTHER', text: 'Other' },
] as const;

export const SEALS = [
  { value: 'COUNTY_COURT', text: 'County Court seal' },
  { value: 'HIGH_COURT', text: 'High Court seal' },
] as const;

export interface ReviewDateAnswer {
  day: string;
  month: string;
  year: string;
  reason: string;
  description: string;
}

/** The caseworker's answers so far, as they gave them. */
export interface OrderReviewAnswers {
  /** The submitted DocWeave document with the caseworker's wording edits. */
  orderDocumentJson?: string;
  sendQuery?: boolean;
  /** What a free-form order does, as court staff record it. */
  orderDetails: OrderDetailsAnswers;
  /**
   * The order's costs and money judgments: for an order its form generated, as the judge's answers make them until
   * court staff save the page they are checked on; for a free-form order, as court staff record them.
   */
  moneyJudgments?: MoneyJudgmentsAnswers;
  moneyJudgmentsSaved?: boolean;
  queryToJudge?: string;
  /** Yes once there is a review date; no once court staff confirm the order needs none. */
  hasReviewDates?: 'yes' | 'no';
  reviewDates: ReviewDateAnswer[];
  /** Complete once court staff confirm they have done every next step, which issuing the order needs. */
  nextSteps?: 'complete';
  /** Asked on proceed to issue, but not yet sent to pcs-api: nothing uses it until it says what it applies to. */
  finalOrder?: 'yes' | 'no';
  restitutionPermission?: 'yes' | 'no';
  serveAllParties?: 'yes' | 'no';
  partiesToServe: string[];
  seal?: string;
}

/**
 * A caseworker's review of an order, from the event's start as it opens to its submission:
 * the judge's order and the case it started with, the token to submit it with, and the answers given so far.
 */
export interface OrderReviewSession extends OrderStart {
  eventToken: string;
  answers: OrderReviewAnswers;
  /** The Work Allocation task the caseworker came from, which pcs-api closes as the review ends. */
  taskId?: string;
  /** How the review ended, once submitted: the order issued, or returned to the judge. */
  outcome?: 'ISSUED' | 'RETURNED_TO_JUDGE';
}

export interface ValidationIssue {
  id: string;
  message: string;
}

export const MAX_QUERY_LENGTH = 30000;
export const TASKS_OUTSTANDING =
  'You must complete all outstanding tasks before issuing this order and serving it on the parties';
export const MAX_REVIEW_DATES = 10;
export const MAX_REVIEW_DESCRIPTION_LENGTH = 500;

export function newAnswers(): OrderReviewAnswers {
  // Orders are under the County Court seal, without permission for restitution, unless the caseworker changes it.
  // Who the order is served on has no default: the caseworker chooses.
  return {
    orderDetails: {},
    reviewDates: [],
    partiesToServe: [],
    restitutionPermission: 'no',
    seal: 'COUNTY_COURT',
  };
}

export function blankReviewDate(): ReviewDateAnswer {
  return { day: '', month: '', year: '', reason: '', description: '' };
}

/** Whether the order to issue is free-form, whose wording is the judge's, so court staff record what it does. */
export function issuesFreeForm({ order }: OrderReviewSession): boolean {
  return order.orderType === 'FREE_FORM';
}

// Posted form values, which a browser sends as a string, several strings, or nothing.

export function list(value: unknown): string[] {
  return ([] as unknown[]).concat(value ?? []).map(String);
}

export function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function choice<T extends string>(value: unknown, choices: readonly T[]): T | undefined {
  return choices.find(option => option === value);
}

/** Whether a posted checkbox was ticked. */
export function ticked(value: unknown): boolean {
  return list(value).includes('yes');
}

// The judge's staff message, as the make order form holds it.
export function staffMessage(formData: FormData): string | undefined {
  const message = String(formData['staff-message-text'] ?? '').trim();
  return ticked(formData['staff-message']) && message ? message : undefined;
}

export function validateQuery(answers: OrderReviewAnswers): ValidationIssue[] {
  const query = answers.queryToJudge?.trim() ?? '';
  if (!answers.sendQuery) {
    return [{ id: 'send-query', message: "Select 'Send query to Judge' and enter your query to return the order" }];
  }
  if (!query) {
    return [{ id: 'query-to-judge', message: 'Enter your query for the Judge' }];
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return [{ id: 'query-to-judge', message: 'Your query for the Judge must be 30,000 characters or less' }];
  }
  return [];
}

export function validateReviewDates(answers: OrderReviewAnswers): ValidationIssue[] {
  if (!answers.hasReviewDates) {
    return [{ id: 'has-review-dates', message: 'Add the review dates the order needs, or select that it needs none' }];
  }
  if (answers.hasReviewDates === 'no') {
    return [];
  }
  return answers.reviewDates.flatMap((reviewDate, index) => {
    const n = index + 1;
    const prefix = `review-date-${n}`;
    const issues: ValidationIssue[] = [];
    const { day, month, year } = reviewDate;
    if (!day && !month && !year) {
      issues.push({ id: `${prefix}-date-day`, message: `Enter the date of review ${n}` });
    } else if (!/^\d{4}$/.test(year) || !parseDate(day, month, year)) {
      issues.push({ id: `${prefix}-date-day`, message: `Date of review ${n} must be a real date` });
    }
    if (!REVIEW_REASONS.some(reason => reason.value === reviewDate.reason)) {
      issues.push({ id: `${prefix}-reason`, message: `Select the reason for review ${n}` });
    }
    const description = reviewDate.description.trim();
    if (!description) {
      issues.push({ id: `${prefix}-description`, message: `Enter a description of review ${n}` });
    } else if (description.length > MAX_REVIEW_DESCRIPTION_LENGTH) {
      issues.push({
        id: `${prefix}-description`,
        message: `The description of review ${n} must be 500 characters or less`,
      });
    }
    return issues;
  });
}

export function validateProceedToIssue(answers: OrderReviewAnswers): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (answers.nextSteps !== 'complete') {
    issues.push({ id: 'next-steps', message: 'Confirm all the next steps for court staff have been completed' });
  }
  if (!answers.finalOrder) {
    issues.push({ id: 'final-order', message: 'Select if this order finally resolves any part of the case' });
  }
  if (!answers.restitutionPermission) {
    issues.push({
      id: 'restitution-permission',
      message: 'Select if permission has been given to issue a warrant or writ of restitution',
    });
  }
  if (!answers.serveAllParties) {
    issues.push({ id: 'serve-all-parties', message: 'Select if this order should be served on all parties' });
  } else if (answers.serveAllParties === 'no' && !answers.partiesToServe.length) {
    issues.push({ id: 'parties-to-serve', message: 'Select who to serve the order on' });
  }
  if (!SEALS.some(seal => seal.value === answers.seal)) {
    issues.push({ id: 'seal', message: 'Select which seal this order should have' });
  }
  return issues;
}

/**
 * The caseworker's review as pcs-api's confirm order review event takes it. An order returned to the judge
 * goes back as the judge submitted it, without the caseworker's changes. An order issued goes with its
 * wording exported to HTML, which becomes its document.
 */
export function reviewRequest(
  review: OrderReviewSession,
  action: 'RETURN_TO_JUDGE' | 'ISSUE'
): Record<string, unknown> {
  const { order, answers, taskId } = review;
  if (action === 'RETURN_TO_JUDGE') {
    return { action, orderId: order.id, version: order.version, taskId, queryToJudge: answers.queryToJudge?.trim() };
  }
  const reviewDates =
    answers.hasReviewDates === 'yes'
      ? answers.reviewDates.map(({ day, month, year, reason, description }) => ({
          date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          reason,
          description: description.trim(),
        }))
      : [];
  const serveAllParties = answers.serveAllParties === 'yes';
  const { orderType, formData } = order;
  const docweaveSnapshot = answers.orderDocumentJson ? parseSnapshot(answers.orderDocumentJson) : null;
  return {
    action,
    orderId: order.id,
    version: order.version,
    taskId,
    issue: {
      order: docweaveSnapshot && {
        orderType,
        formData,
        applicationDecisions: applicationDecisions(formData),
        docweaveSnapshot,
        html: renderHtml(docweaveSnapshot),
      },
      reviewDates,
      nextStepsComplete: answers.nextSteps === 'complete',
      claimOutcome:
        orderType &&
        (issuesFreeForm(review) ? orderDetailsRequest(answers.orderDetails) : claimOutcome(orderType, formData)),
      serveAllParties,
      partiesToServe: serveAllParties ? [] : answers.partiesToServe,
      seal: answers.seal,
      restitutionPermitted: answers.restitutionPermission === 'yes',
      ...moneyJudgmentsRequest(answers.moneyJudgments),
    },
  };
}

/**
 * The costs and money judgments as the order to issue makes them, until court staff save their own: a generated
 * order's from the judge's answers; a free-form order's to record from nothing.
 */
export function startMoneyJudgments(review: OrderReviewSession): void {
  const { answers, caseContext, order } = review;
  if (answers.moneyJudgmentsSaved || !order.orderType) {
    return;
  }
  const sides = {
    claimants: caseContext.claimants.map(party => party.id),
    defendants: caseContext.defendants.map(party => party.id),
  };
  answers.moneyJudgments = issuesFreeForm(review)
    ? { judgments: [] }
    : judgmentsFromOrder(order.orderType, order.formData, sides);
}

// The make order form's choice of statement, as the judge's form words it.
const NOTICE_STATEMENTS: Record<string, string> = {
  'own-initiative': "Order on court's own initiative",
  'without-notice': 'Order without notice',
  none: 'Neither',
};

// The make order form's decision on an application, as the judge's form words it.
const DECISION_LABELS: Record<string, string> = {
  adjourn: 'Adjourned',
  suspend: 'Enforcement suspended on conditions',
  dismiss: 'Dismissed',
  'strike-out': 'Struck out',
  list: 'Listed for a hearing',
  freeform: 'Freeform',
};

function statementSelected(formData: FormData): string {
  return NOTICE_STATEMENTS[first(formData['order-notice'])] ?? 'Not recorded';
}

/** The apply-by date the form gives, for a statement that has one. */
function applyByEntered(formData: FormData): string | undefined {
  const prefix = NOTICE_DATE_PREFIXES[first(formData['order-notice'])];
  if (!prefix) {
    return undefined;
  }
  const [day, month, year] = ['day', 'month', 'year'].map(part => first(formData[`${prefix}-${part}`]));
  if (!day && !month && !year) {
    return 'Not entered';
  }
  const date = /^\d{4}$/.test(year) ? parseDate(day, month, year) : undefined;
  return date ? formatDate(date) : [day, month, year].join('/');
}

/**
 * What court staff check before choosing who the order is served on: the judge's answers about where it
 * was made, the statement and apply-by date, the applications it decides and the message for staff.
 */
export function issueSummary(review: OrderReviewSession): { key: string; lines: string[] }[] {
  const { formData } = review.order;
  const rows: { key: string; lines: string[] }[] = [
    {
      key: 'Order made',
      lines: [
        review.hearing ? `At the hearing on ${hearingTime(review.hearing.date)}` : 'Without a hearing (box work)',
      ],
    },
  ];
  rows.push({ key: 'Statement selected', lines: [statementSelected(formData)] });
  const applyBy = applyByEntered(formData);
  if (applyBy) {
    rows.push({ key: 'Apply-by date entered', lines: [applyBy] });
  }

  const applications = new Map(review.caseContext.applications.map(application => [application.id, application]));
  const decided = applicationDecisions(formData).flatMap(({ genAppId }) => {
    const application = applications.get(genAppId);
    return application
      ? [
          `${application.reference}: ${application.type} – ` +
            `${DECISION_LABELS[first(formData[`app-${genAppId}-decision`])]} – ` +
            noticeRequestLabel(application.withoutNotice),
        ]
      : [];
  });
  if (decided.length) {
    rows.push({ key: 'Applications this order decides', lines: decided });
  }

  const message = staffMessage(formData);
  if (message) {
    rows.push({ key: 'Message from the Judge', lines: [message] });
  }
  return rows;
}
