import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addCosts, caseManCosts, hasCosts, partyLabels, value } from './common';
import { addListing } from './listing';

const PARAGRAPH_MARKER = /^(?:\(?\d+[.)]|\(?[a-z][.)]|[-•*])\s+/i;

/**
 * The applicant's wording as separate paragraphs, without the numbers they gave them, since the order
 * numbers its own paragraphs. A paragraph starts at a numbered or bulleted line or after a blank one;
 * any other line carries on the paragraph before it, as text wrapped by hand or pasted from a document.
 */
export function requestedParagraphs(wording: string): string[] {
  const paragraphs: string[] = [];
  let carryOn = false;
  for (const raw of wording.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      carryOn = false;
      continue;
    }
    if (carryOn && !PARAGRAPH_MARKER.test(line)) {
      paragraphs[paragraphs.length - 1] += ` ${line}`;
    } else {
      paragraphs.push(line.replace(PARAGRAPH_MARKER, ''));
    }
    carryOn = true;
  }
  return paragraphs;
}

const LISTED = 'The application shall be listed for a hearing on notice to all parties';

const DECISIONS: Record<string, string> = {
  dismiss: 'The application is dismissed.',
  'strike-out': 'The application is struck out.',
};

/**
 * An order deciding a general application without a hearing: the application, the decision, then costs.
 * Using the applicant's wording generates no decision clause: their wording goes in as the judge's own clauses.
 * Listing the application for a hearing says when, as an adjournment does.
 */
export function buildApplicationOrder(data: OrderData): DocWeaveDocument {
  const application = data.application;
  const { claimant, defendant } = partyLabels(data);
  const costs = caseManCosts(claimant, defendant);
  const decision = value(data, 'application-decision');
  const clause = DECISIONS[decision];
  const listed = decision === 'list';

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
    if (!clause && !listed && !hasCosts(data, costs)) {
      return;
    }
    order.orderedList('application-clauses', list => {
      if (clause) {
        list.item('application-decision', clause);
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
