import { type DocBuilder, type OrderedListBuilder } from '@hmcts-cft/docweave';

import { type OrderApplication, type OrderData } from '../data';

import { partyReference, sentenceCase, value } from './common';
import { addListing } from './listing';
import { addPaymentConditions } from './payment-conditions';

/** The applications the order decides: those the judge has not left as they are. */
export function decidedApplications(data: OrderData): OrderApplication[] {
  return data.applications.filter(application => application.decision !== 'none');
}

/**
 * "the First Claimant's application dated 3 October 2026": the
 * party by role, numbered only where the case has more than one of that role, and never the GA reference.
 */
export function describeApplication(data: OrderData, application: OrderApplication): string {
  const dated = ` dated ${application.submittedOn}`;
  const role = /\((Claimant|Defendant)(?: (\d+))?\)\s*$/.exec(application.applicant);
  if (!role) {
    return `the application of ${application.applicant}${dated}`;
  }
  const kind = role[1] === 'Claimant' ? 'claimant' : 'defendant';
  return `${partyReference(data, kind, Number(role[2] ?? 1) - 1)}'s application${dated}`;
}

/** Adjourning the hearing an application to adjourn asks about: to a further hearing, or generally. */
function addHearingAdjournment(list: OrderedListBuilder, data: OrderData, prefix: string): void {
  const adjournment = value(data, `${prefix}-adjourn-type`);
  if (adjournment === 'further-hearing') {
    addListing(list, data, `${prefix}-adjourn`, `${prefix}-adjourn`, 'The hearing is adjourned to');
  } else if (adjournment === 'generally') {
    list.item(
      `${prefix}-adjourn-generally`,
      'The hearing is adjourned generally with liberty to restore by application by any party on notice to all other parties.'
    );
  }
}

/**
 * The clauses the decision on an application generates; none says it is granted, as the order says what it grants.
 * Freeform and applicant-wording decisions are written in the editor. Listing it for a new hearing says when, as an
 * adjournment does, and whether the other parties are given notice; listing it at one of the case's hearings says
 * which. Adjourning an application to adjourn adjourns the hearing as the adjournment tab adjourns the claim.
 * Suspending enforcement sets the suspension's conditions as a suspended possession order does.
 */
function addApplicationClauses(list: OrderedListBuilder, data: OrderData, application: OrderApplication): void {
  const { decision, prefix } = application;
  const suspension = application.enforcementSuspension ? ' to suspend enforcement' : '';
  const described = sentenceCase(describeApplication(data, application)) + suspension;
  if (decision === 'adjourn') {
    addHearingAdjournment(list, data, prefix);
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
    addListing(list, data, `${prefix}-list`, prefix, `${described} shall be listed for a hearing ${notice} on`);
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
