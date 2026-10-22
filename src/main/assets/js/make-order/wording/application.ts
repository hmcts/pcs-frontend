import { type DocBuilder, type DocWeaveDocument, type OrderedListBuilder, buildDoc } from '@hmcts-cft/docweave';

import { type OrderApplication, type OrderData } from '../data';

import { addCosts, caseManCosts, date, hasCosts, partyLabels } from './common';
import { addListing } from './listing';
import { addPaymentConditions } from './payment-conditions';

const LISTED = 'The application shall be listed for a hearing on notice to all parties';

/** The applications the order decides: those the judge has not left as they are. */
export function decidedApplications(data: OrderData): OrderApplication[] {
  return data.applications.filter(application => application.decision !== 'none');
}

/** "the application of Jane Doe (Defendant 1) dated 3 October 2026 (GA1)". */
export function describeApplication(application: OrderApplication): string {
  const dated = application.submittedOn ? ` dated ${application.submittedOn}` : '';
  return `the application of ${application.applicant}${dated} (${application.reference})`;
}

/**
 * The generated node after which granting the application puts the applicant's wording: the application's lead-in
 * in an order deciding several things, or "IT IS ORDERED THAT:" when the application is the order's whole subject.
 */
export function wordingAnchor(data: OrderData, application: OrderApplication): string {
  return data.boxWork ? 'paragraph:ordered-that' : `paragraph:${application.prefix}-lead`;
}

/** Dismissing an application to suspend the warrant of possession, in the words HHJ Pema gave (20 October 2026). */
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
 * The clauses the decision on an application generates, named from ids. Granting an application that asked for
 * an order generates none: the applicant's wording goes in as the judge's own clauses. Listing it for a hearing
 * says when, as an adjournment does. For an application to suspend the warrant of possession, granting it sets
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
  if (decision === 'grant' && application.warrantSuspension) {
    addPaymentConditions(list, data, `${prefix}-warrant`, 'The warrant of possession is suspended on condition that');
  } else if (decision === 'grant' && !application.wordingHtml) {
    list.item(`${ids}-decision`, 'The application is granted.');
  } else if (decision === 'dismiss' && application.warrantSuspension) {
    addWarrantSuspensionRefused(list, data, ids, prefix);
  } else if (decision === 'dismiss') {
    list.item(`${ids}-decision`, 'The application is dismissed.');
  } else if (decision === 'strike-out') {
    list.item(`${ids}-decision`, 'The application is struck out.');
  } else if (decision === 'list') {
    addListing(list, data, `${prefix}-list`, ids, LISTED);
  }
}

/** Whether the decision generates any clause, so an order knows whether to start a list for it. */
function generatesClauses(application: OrderApplication): boolean {
  const { decision } = application;
  return (
    decision === 'dismiss' ||
    decision === 'strike-out' ||
    decision === 'list' ||
    (decision === 'grant' && (application.warrantSuspension || !application.wordingHtml))
  );
}

/**
 * Each application an order made on the claim decides, after the claim's clauses: a lead-in naming the
 * application, then its clauses. The lead-in is where granting it puts the applicant's wording, so an order
 * deciding several applications keeps each one's wording with it. The clause numbers run on from the claim's.
 */
export function addApplicationDecisions(order: DocBuilder, data: OrderData): void {
  for (const application of decidedApplications(data)) {
    const ids = application.prefix;
    order.paragraph(`${ids}-lead`, `On ${describeApplication(application)}:`);
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
        `UPON ${describeApplication(application)} to ${application.type.toLowerCase()}`
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
