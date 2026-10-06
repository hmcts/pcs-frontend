import { type DocWeaveSnapshot, renderHtml } from '@hmcts-cft/docweave';
import { JSDOM } from 'jsdom';

const { document } = new JSDOM().window;

/** The order's wording as Docweave exports it to HTML, which pcs-api issues as the order's document. */
export function orderHtml(snapshot: DocWeaveSnapshot | null): string | undefined {
  return snapshot ? renderHtml(snapshot, { document }) : undefined;
}
