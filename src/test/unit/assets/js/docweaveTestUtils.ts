import type { DocWeaveDocument } from '@hmcts-cft/docweave';

type DocWeaveNode = DocWeaveDocument['node'];

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
