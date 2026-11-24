import { type DocBuilder, type OrderedListBuilder } from '@hmcts-cft/docweave';

import { type DraftClause, type OrderApplication, type OrderData } from '../data';

import { sentenceCase } from './common';
import { addListing } from './listing';
import { addPaymentConditions } from './payment-conditions';

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

/** The applications the order decides: those the judge has not left as they are. */
export function decidedApplications(data: OrderData): OrderApplication[] {
  return data.applications.filter(application => application.decision !== 'none');
}

/**
 * "the first claimant's application dated 3 October 2026": the
 * party by role, numbered only where the case has more than one of that role, and never the GA reference.
 */
export function describeApplication(data: OrderData, application: OrderApplication): string {
  const dated = ` dated ${application.submittedOn}`;
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

/** The applicant's draft order as numbered clauses, any list in one of them nested under it. */
function addDraftClauses(list: OrderedListBuilder, id: string, clauses: readonly DraftClause[]): void {
  clauses.forEach(({ text, children }, index) => {
    const itemId = `${id}-${index + 1}`;
    list.item(
      itemId,
      text,
      children.length
        ? item => item.orderedList(`${itemId}-list`, nested => addDraftClauses(nested, itemId, children))
        : undefined
    );
  });
}

/**
 * The clauses the decision on an application generates; none says it is granted, as the order says what it grants.
 * Taking the applicant's wording makes their draft order the application's clauses, which the judge edits as any
 * other; a freeform decision generates none, for the judge's own wording. Listing it for a new hearing says when, as an adjournment does, and
 * whether the other parties are given notice; listing it at one of the case's hearings says which. Suspending
 * enforcement sets the suspension's conditions as a suspended possession order does.
 */
function addApplicationClauses(list: OrderedListBuilder, data: OrderData, application: OrderApplication): void {
  const { decision, prefix } = application;
  const suspension = application.enforcementSuspension ? ' to suspend enforcement' : '';
  const described = sentenceCase(describeApplication(data, application)) + suspension;
  if (decision === 'applicant-wording') {
    addDraftClauses(list, `${prefix}-draft`, application.draftOrder);
  } else if (decision === 'suspend') {
    addPaymentConditions(
      list,
      data,
      `${prefix}-suspension`,
      'Enforcement of the possession order is suspended on condition that'
    );
  } else if (decision === 'dismiss') {
    list.item(`${prefix}-decision`, `${described} is dismissed.`);
  } else if (decision === 'strike-out') {
    list.item(`${prefix}-decision`, `${described} is struck out.`);
  } else if (decision === 'list' && application.listedAt) {
    list.item(`${prefix}-listing`, content => {
      content
        .text(`${described} shall be heard at the hearing on `)
        .fact(`${prefix}-hearing-date`, application.listedAt!, { sourceId: `${prefix}-list-at` })
        .text('.');
    });
  } else if (decision === 'list') {
    const notice = application.listWithoutNotice ? 'without notice to the other parties' : 'on notice to all parties';
    addListing(list, data, `${prefix}-list`, prefix, `${described} shall be listed for a hearing ${notice}`);
  }
}

/**
 * Each application the order decides, after the claim's clauses: its clauses name the application, so no lead-in.
 * The clause numbers run on from the claim's.
 */
export function addApplicationDecisions(order: DocBuilder, data: OrderData): void {
  for (const application of decidedApplications(data)) {
    order.orderedList(`${application.prefix}-clauses`, list => addApplicationClauses(list, data, application));
  }
}
