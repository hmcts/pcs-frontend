import { type DocWeaveSnapshot, renderHtml } from '@hmcts-cft/docweave';

/**
 * Shows the judge's order where a page asks for its read-only preview, with the changes they made to the
 * wording Docweave generated shown as tracked changes.
 */
export function initOrderPreview(): void {
  const preview = document.querySelector<HTMLElement>('[data-order-preview]');
  const source = document.getElementById('order-preview-document');
  if (!preview || !source) {
    return;
  }
  const snapshot = JSON.parse(source.textContent || 'null') as DocWeaveSnapshot | null;
  preview.innerHTML = snapshot
    ? renderHtml(snapshot, { changes: true })
    : '<p class="govuk-body">The Judge did not write in the order preview.</p>';
}
