import { type DocBuilder, type DocWeaveDocument, type OrderedListBuilder, buildDoc } from '@hmcts-cft/docweave';

import { type OrderApplication, type OrderData } from '../data';

import { addCosts, caseManCosts, date, hasCosts, partyLabels } from './common';
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

function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The generated node after which the "Insert applicant's wording" button puts the applicant's wording: the last
 * clause the decision generated, or "IT IS ORDERED THAT:" when the application is the order's whole subject.
 */
export function wordingAnchors(data: OrderData, application: OrderApplication): string[] {
  const ids = data.boxWork ? 'application' : application.prefix;
  return [
    `item:${ids}-decision`,
    `item:${ids}-listing`,
    `item:${ids}-warrant-execution`,
    ...(data.boxWork ? ['paragraph:ordered-that'] : []),
  ];
}

/** Dismissing an application to suspend the warrant of possession, in the words the judges gave (20 October 2026). */
function addWarrantSuspensionRefused(list: OrderedListBuilder, data: OrderData, ids: string, prefix: string): void {
  list.item(
    `${ids}-warrant-suspension-dismissed`,
    'The application to suspend the execution of the warrant of possession is dismissed.'
  );
  list.item(`${ids}-warrant-execution`, content => {
    content
      .text(
        'For the avoidance of doubt subject to any further order of the court, the execution of the warrant of possession on '
      )
      .fact(`${ids}-eviction-date`, date(data, `${prefix}-eviction-date`), { sourceId: `${prefix}-eviction-date` })
      .text(' may take place.');
  });
}

/**
 * The clauses the decision on an application generates, named from ids, each naming the application. The
 * applicant's wording is never generated: the judge inserts it with a button if they want it (judicial feedback,
 * 22 October 2026). Listing it for a hearing says when, as an adjournment does. For an application to suspend the warrant of possession, granting it sets
 * the suspension's conditions as a suspended possession order does, and dismissing it says when the eviction may
 * go ahead.
 */
export function addApplicationClauses(
  list: OrderedListBuilder,
  data: OrderData,
  application: OrderApplication,
  ids: string
): void {
  const { decision, prefix } = application;
  const described = sentence(describeApplication(data, application));
  if (decision === 'grant' && application.warrantSuspension) {
    addPaymentConditions(list, data, `${prefix}-warrant`, 'The warrant of possession is suspended on condition that');
  } else if (decision === 'grant') {
    list.item(`${ids}-decision`, `${described} is granted.`);
  } else if (decision === 'dismiss' && application.warrantSuspension) {
    addWarrantSuspensionRefused(list, data, ids, prefix);
  } else if (decision === 'dismiss') {
    list.item(`${ids}-decision`, `${described} is dismissed.`);
  } else if (decision === 'strike-out') {
    list.item(`${ids}-decision`, `${described} is struck out.`);
  } else if (decision === 'list') {
    addListing(list, data, `${prefix}-list`, ids, `${described} shall be listed for a hearing on notice to all parties`);
  }
}

/** Whether the decision generates any clause, so an order knows whether to start a list for it. */
function generatesClauses(application: OrderApplication): boolean {
  const { decision } = application;
  return decision === 'dismiss' || decision === 'strike-out' || decision === 'list' || decision === 'grant';
}

/**
 * Each application an order made on the claim decides, after the claim's clauses: its clauses name the
 * application, so no lead-in (judicial feedback, 22 October 2026). The clause numbers run on from the claim's.
 */
export function addApplicationDecisions(order: DocBuilder, data: OrderData): void {
  for (const application of decidedApplications(data)) {
    const ids = application.prefix;
    if (generatesClauses(application)) {
      order.orderedList(`${ids}-clauses`, list => addApplicationClauses(list, data, application, ids));
    }
  }
}

/**
 * An order made on one application without a hearing, as box work: the application, the decision, then costs.
 * Its clauses keep the ids orders made before the form asked per application gave them.
 */
export function buildApplicationOrder(data: OrderData): DocWeaveDocument {
  const application = data.applications[0];
  const { claimant, defendant } = partyLabels(data);
  const costs = caseManCosts(claimant, defendant);

  return buildDoc(order => {
    if (application) {
      order.paragraph(
        'application-upon',
        `UPON ${describeApplication(data, application)} to ${application.type.toLowerCase()}`
      );
      order.paragraph('application-considered', 'AND UPON the Court considering the application without a hearing');
    }
    order.paragraph('ordered-that', 'IT IS ORDERED THAT:');
    if (!application || (!generatesClauses(application) && !hasCosts(data, costs))) {
      return;
    }
    order.orderedList('application-clauses', list => {
      addApplicationClauses(list, data, application, 'application');
      if (hasCosts(data, costs)) {
        list.item('application-costs', content => addCosts(content, data, costs));
      }
    });
  });
}
