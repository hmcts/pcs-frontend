import type { DocWeaveClause, DocWeaveDocument } from '@hmcts-cft/docweave';

import { type OrderData } from '../../../../main/assets/js/make-order/data';

type AnswerValue = string | readonly string[];

export function makeOrderData(
  answers: Readonly<Record<string, AnswerValue>>,
  options: {
    claimantCount?: number;
    defendantCount?: number;
    propertyAddress?: string;
    selectedControlIds?: Readonly<Record<string, string>>;
    attendance?: OrderData['attendance'];
  } = {}
): OrderData {
  return {
    answers: Object.fromEntries(
      Object.entries(answers).map(([name, value]) => [name, typeof value === 'string' ? [value] : value])
    ),
    selectedControlIds: options.selectedControlIds ?? {},
    propertyAddress: options.propertyAddress ?? '10 Test Street',
    claimants: Array.from({ length: options.claimantCount ?? 1 }, (_, index) => ({
      id: `claimant-${index + 1}`,
      name: `Claimant ${index + 1}`,
    })),
    defendants: Array.from({ length: options.defendantCount ?? 1 }, (_, index) => ({
      id: `defendant-${index + 1}`,
      name: `Defendant ${index + 1}`,
    })),
    attendance: options.attendance ?? [],
  };
}

export function findNode(document: DocWeaveDocument, id: string): DocWeaveClause {
  const result = document.getClause(id) ?? document.getClause(id.replace(/^[^:]+:/, ''));
  if (!result) {
    throw new Error(`Docweave node not found: ${id}`);
  }
  return result;
}

export function childTexts(node: Pick<DocWeaveDocument, 'children'> | DocWeaveClause): string[] {
  return node.children.map(child => child.textContent);
}
