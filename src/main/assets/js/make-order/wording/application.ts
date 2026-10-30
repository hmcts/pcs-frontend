import { type DocBuilder, type OrderedListBuilder } from '@hmcts-cft/docweave';

import { type OrderApplication, type OrderData } from '../data';

import { date, sentenceCase } from './common';
import { addListing } from './listing';
import { addPaymentConditions } from './payment-conditions';

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

/** The applications the order decides: those the judge has not left as they are. */
export function decidedApplications(data: OrderData): OrderApplication[] {
  return data.applications.filter(application => application.decision !== 'none');
}

/**
 * "the first claimant's application dated 3 October 2026", as the judges write it (22 October 2026): the
 * party by role, numbered only where the case has more than one of that role, and never the GA reference.
 */
export function describeApplication(data: OrderData, application: OrderApplication): string {
  const dated = application.submittedOn ? ` dated ${application.submittedOn}` : '';
  const role = /\((Claimant|Defendant)(?: (\d+))?\)\s*$/.exec(application.applicant);
  if (!role) {
    return `the application of ${application.applicant}${dated}`;
  }
  const kind = role[1].toLowerCase();
  const rank = Number(role[2] ?? 1);
  const several = (kind === 'claimant' ? data.claimants : data.defendants).length > 1;
  const ordinal = several ? `${ORDINALS[rank - 1] ?? `${rank}th`} ` : '';
  return `the ${ordinal}${kind}'s application${dated}`;
}

/** The generated clauses after which the "Insert applicant's wording" button puts the applicant's wording. */
export function wordingAnchors({ prefix }: OrderApplication): string[] {
  return [`item:${prefix}-decision`, `item:${prefix}-listing`, `item:${prefix}-warrant-execution`];
}

/** Dismissing an application to suspend the warrant of possession, in the words the judges gave (20 October 2026). */
function addWarrantSuspensionRefused(list: OrderedListBuilder, data: OrderData, prefix: string): void {
  list.item(
    `${prefix}-warrant-suspension-dismissed`,
    'The application to suspend the execution of the warrant of possession is dismissed.'
  );
  list.item(`${prefix}-warrant-execution`, content => {
    content
      .text(
        'For the avoidance of doubt subject to any further order of the court, the execution of the warrant of possession on '
      )
      .fact(`${prefix}-eviction-date`, date(data, `${prefix}-eviction-date`), { sourceId: `${prefix}-eviction-date` })
      .text(' may take place.');
  });
}

/**
 * The clauses the decision on an application generates, each naming the application. The
 * applicant's wording is never generated: the judge inserts it with a button if they want it (judicial feedback,
 * 22 October 2026). Listing it for a hearing says when, as an adjournment does. For an application to suspend the warrant of possession, granting it sets
 * the suspension's conditions as a suspended possession order does, and dismissing it says when the eviction may
 * go ahead.
 */
function addApplicationClauses(list: OrderedListBuilder, data: OrderData, application: OrderApplication): void {
  const { decision, prefix } = application;
  const described = sentenceCase(describeApplication(data, application));
  if (decision === 'grant' && application.warrantSuspension) {
    addPaymentConditions(list, data, `${prefix}-warrant`, 'The warrant of possession is suspended on condition that');
  } else if (decision === 'grant') {
    list.item(`${prefix}-decision`, `${described} is granted.`);
  } else if (decision === 'dismiss' && application.warrantSuspension) {
    addWarrantSuspensionRefused(list, data, prefix);
  } else if (decision === 'dismiss') {
    list.item(`${prefix}-decision`, `${described} is dismissed.`);
  } else if (decision === 'strike-out') {
    list.item(`${prefix}-decision`, `${described} is struck out.`);
  } else if (decision === 'list') {
    addListing(
      list,
      data,
      `${prefix}-list`,
      prefix,
      `${described} shall be listed for a hearing on notice to all parties`
    );
  }
}

/**
 * Each application the order decides, after the claim's clauses: its clauses name the application, so no lead-in
 * (judicial feedback, 22 October 2026). The clause numbers run on from the claim's.
 */
export function addApplicationDecisions(order: DocBuilder, data: OrderData): void {
  for (const application of decidedApplications(data)) {
    order.orderedList(`${application.prefix}-clauses`, list => addApplicationClauses(list, data, application));
  }
}
