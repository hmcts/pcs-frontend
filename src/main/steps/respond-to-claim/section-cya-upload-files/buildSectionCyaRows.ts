import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { type SummaryListRow, getValidatedCase, listHtml, makeChange } from '../section-cya/cyaRow';
import type { RespondToClaimSectionId } from '../sections.config';

const SECTION_ID: RespondToClaimSectionId = 'uploadFiles';

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const validatedCase = getValidatedCase(req);
  const caseRef = validatedCase?.id;
  if (!validatedCase || !caseRef) {
    return [];
  }

  const responses = validatedCase.defendantResponses ?? {};
  const change = makeChange(caseRef, SECTION_ID, t);

  const rows: SummaryListRow[] = [];

  // Uploaded documents — upload-document is always shown; support-needs is an
  // interstitial with no input, so it contributes no row.
  const documents = Array.isArray(responses.defendantDocuments) ? responses.defendantDocuments : [];
  const filenames = documents
    .map(item => item.value?.document?.document_filename)
    .filter((name): name is string => Boolean(name && name.trim()));
  rows.push({
    key: { text: t('rows.uploadedDocuments.label') },
    value:
      filenames.length === 0
        ? { text: t('rows.uploadedDocuments.none') }
        : { html: listHtml(filenames.map(name => escapeHtml(name.trim()))) },
    actions: { items: [change('upload-document', 'rows.uploadedDocuments.changeHidden')] },
  });

  return rows;
}
