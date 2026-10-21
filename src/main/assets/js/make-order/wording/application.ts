import { type DocWeaveDocument, type OrderedListBuilder, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addCosts, caseManCosts, date, hasCosts, partyLabels, value } from './common';
import { addListing } from './listing';
import { addPaymentConditions } from './payment-conditions';

const LISTED = 'The application shall be listed for a hearing on notice to all parties';

const DECISIONS: Record<string, string> = {
  dismiss: 'The application is dismissed.',
  'strike-out': 'The application is struck out.',
};

/** Dismissing an application to suspend the warrant of possession, in the words HHJ Pema gave (20 October 2026). */
function addWarrantSuspensionRefused(list: OrderedListBuilder, data: OrderData): void {
  list.item(
    'warrant-suspension-dismissed',
    'The application to suspend the execution of the warrant of possession is dismissed.'
  );
  list.item('warrant-execution', content => {
    content
      .text(
        'For the avoidance of doubt subject to any further order of the court, the execution of the warrant of possession on '
      )
      .fact('warrant-eviction-date', date(data, 'warrant-eviction-date'), { sourceId: 'warrant-eviction-date' })
      .text(' may take place.');
  });
}

/**
 * An order deciding a general application without a hearing: the application, the decision, then costs.
 * Using the applicant's wording generates no decision clause: their wording goes in as the judge's own clauses.
 * Listing the application for a hearing says when, as an adjournment does. Suspending the warrant of possession
 * sets its conditions as a suspended possession order does; refusing to says when the eviction may go ahead.
 */
export function buildApplicationOrder(data: OrderData): DocWeaveDocument {
  const application = data.application;
  const { claimant, defendant } = partyLabels(data);
  const costs = caseManCosts(claimant, defendant);
  const decision = value(data, 'application-decision');
  const clause = DECISIONS[decision];
  const listed = decision === 'list';
  const warrant = decision === 'suspend-warrant' || decision === 'refuse-warrant-suspension';

  return buildDoc(order => {
    if (application) {
      const dated = application.submittedOn ? ` dated ${application.submittedOn}` : '';
      order.paragraph(
        'application-upon',
        `UPON the application of ${application.applicant}${dated} (${application.reference}) to ${application.type.toLowerCase()}`
      );
      order.paragraph('application-considered', 'AND UPON the Court considering the application without a hearing');
    }
    order.paragraph('ordered-that', 'IT IS ORDERED THAT:');
    if (!clause && !listed && !warrant && !hasCosts(data, costs)) {
      return;
    }
    order.orderedList('application-clauses', list => {
      if (clause) {
        list.item('application-decision', clause);
      }
      if (decision === 'suspend-warrant') {
        addPaymentConditions(list, data, 'warrant', 'The warrant of possession is suspended on condition that');
      }
      if (decision === 'refuse-warrant-suspension') {
        addWarrantSuspensionRefused(list, data);
      }
      if (listed) {
        addListing(list, data, 'list', 'application', LISTED);
      }
      if (hasCosts(data, costs)) {
        list.item('application-costs', content => addCosts(content, data, costs));
      }
    });
  });
}
