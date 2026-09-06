import type { DocWeaveDocument } from '@hmcts-cft/docweave';

import { type OrderData } from '../../../../main/assets/js/make-order/data';

type DocWeaveNode = DocWeaveDocument['node'];
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

export function findNode(document: DocWeaveDocument, id: string): DocWeaveNode {
  let result: DocWeaveNode | undefined;
  document.node.descendants(node => {
    if (node.attrs.id === id) {
      result = node;
      return false;
    }
    return true;
  });
  if (!result) {
    throw new Error(`Docweave node not found: ${id}`);
  }
  return result;
}

export function childTexts(node: DocWeaveNode): string[] {
  const texts: string[] = [];
  node.forEach(child => texts.push(child.textContent));
  return texts;
}
