import { parseSnapshot, renderHtml } from '@hmcts-cft/docweave';

import type { OrderFormSubmission } from '@utils/makeOrderForm';
import { parseDate } from '@utils/makeOrderFormat';
import { type MoneyJudgmentsAnswers, judgmentsFromOrder, moneyJudgmentsRequest } from '@utils/moneyJudgments';
import type { FormData, OrderStart } from '@utils/orderCase';
import { type OrderDetailsAnswers, orderDetailsRequest } from '@utils/orderDetails';
import { applicationDecisions, claimOutcome } from '@utils/orderOutcome';

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

export const NEXT_STEPS = [
  { value: 'complete', text: 'There are no other tasks to complete' },
  { value: 'outstanding', text: 'There are still tasks to do' },
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
  /** The order to issue, as the review page last sent it: the judge's form and document with the caseworker's changes. */
  order?: Required<OrderFormSubmission>;
  sendQuery?: boolean;
  /** What a free-form order does, as court staff record it; none in a review started before it was asked. */
  orderDetails?: OrderDetailsAnswers;
  /**
   * The order's costs and money judgments: for an order its form generated, as the judge's answers make them until
   * court staff save the page they are checked on; for a free-form order, as court staff record them.
   */
  moneyJudgments?: MoneyJudgmentsAnswers;
  moneyJudgmentsSaved?: boolean;
  queryToJudge?: string;
  hasReviewDates?: 'yes' | 'no';
  reviewDates: ReviewDateAnswer[];
  nextSteps?: string;
  /** Asked on proceed to issue, but not yet sent to pcs-api: nothing uses it until it says what it applies to. */
  finalOrder?: 'yes' | 'no';
  restitutionPermission?: 'yes' | 'no';
  serveAllParties?: 'yes' | 'no';
  partiesToServe: string[];
  seal?: string;
}

/**
 * A caseworker's review of an order, from the event's start on the introductory page to its submission:
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
  // Orders are served on all parties under the County Court seal, without permission for restitution, unless the
  // caseworker changes it.
  return {
    orderDetails: {},
    reviewDates: [],
    partiesToServe: [],
    restitutionPermission: 'no',
    serveAllParties: 'yes',
    seal: 'COUNTY_COURT',
  };
}

export function blankReviewDate(): ReviewDateAnswer {
  return { day: '', month: '', year: '', reason: '', description: '' };
}

/** Whether the order to issue is free-form, whose wording is the judge's, so court staff record what it does. */
export function issuesFreeForm(answers: OrderReviewAnswers): boolean {
  return answers.order?.orderType === 'FREE_FORM';
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
export function staffMessage(formData: FormData = {}): string | undefined {
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
    return [{ id: 'has-review-dates', message: 'Select if there are any review dates to add' }];
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
  if (!NEXT_STEPS.some(step => step.value === answers.nextSteps)) {
    issues.push({ id: 'next-steps', message: 'Select if all the next steps for court staff have been completed' });
  } else if (answers.nextSteps === 'outstanding') {
    issues.push({ id: 'next-steps', message: TASKS_OUTSTANDING });
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
  return {
    action,
    orderId: order.id,
    version: order.version,
    taskId,
    issue: {
      order: answers.order && issuedOrder(answers.order),
      reviewDates,
      nextStepsComplete: answers.nextSteps === 'complete',
      claimOutcome:
        answers.order &&
        (issuesFreeForm(answers)
          ? orderDetailsRequest(answers.orderDetails)
          : claimOutcome(answers.order.orderType, answers.order.formData)),
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
 * order's from the judge's answers, so a change to them changes these; a free-form order's to record from nothing.
 */
export function startMoneyJudgments(review: OrderReviewSession): void {
  const { answers, caseContext } = review;
  if (answers.moneyJudgmentsSaved || !answers.order) {
    return;
  }
  const sides = {
    claimants: caseContext.claimants.map(party => party.id),
    defendants: caseContext.defendants.map(party => party.id),
  };
  answers.moneyJudgments = issuesFreeForm(answers)
    ? { judgments: [] }
    : judgmentsFromOrder(answers.order.orderType, answers.order.formData, sides);
}

function issuedOrder(order: Required<OrderFormSubmission>): Record<string, unknown> {
  const docweaveSnapshot = order.orderDocumentJson ? parseSnapshot(order.orderDocumentJson) : null;
  return {
    orderType: order.orderType,
    formData: order.formData,
    applicationDecisions: applicationDecisions(order.formData),
    docweaveSnapshot,
    // Its wording exported to HTML, which pcs-api issues as the order's document.
    html: docweaveSnapshot ? renderHtml(docweaveSnapshot) : undefined,
  };
}
