import { type DocWeaveDocument, buildDoc } from '@hmcts-cft/docweave';

import { type OrderData } from '../data';

import { addCosts, caseManCosts, hasCosts, partyLabels, value } from './common';

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

const DECISIONS: Record<string, string> = {
  grant: 'The application is granted.',
  refuse: 'The application is refused.',
  'strike-out': 'The application is struck out.',
};

const LISTINGS: Record<string, string> = {
  'on-notice': 'on notice to the other parties',
  'without-notice': 'without notice',
};

function decisionClause(data: OrderData): string | undefined {
  if (value(data, 'application-decision') === 'list') {
    const notice = LISTINGS[value(data, 'application-list-notice')] ?? LISTINGS['on-notice'];
    return `The application is listed for a hearing ${notice}.`;
  }
  return DECISIONS[value(data, 'application-decision')];
}

/**
 * An order deciding a general application without a hearing: the application, the decision, then costs.
 * The applicant's wording is not generated: the judge adds it to the order as their own, to change freely.
 */
export function buildApplicationOrder(data: OrderData): DocWeaveDocument {
  const application = data.application;
  const { claimant, defendant } = partyLabels(data);
  const costs = caseManCosts(claimant, defendant);
  const clause = decisionClause(data);

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
    if (!clause && !hasCosts(data, costs)) {
      return;
    }
    order.orderedList('application-clauses', list => {
      if (clause) {
        list.item('application-decision', clause);
      }
      if (hasCosts(data, costs)) {
        list.item('application-costs', content => addCosts(content, data, costs));
      }
    });
  });
}
