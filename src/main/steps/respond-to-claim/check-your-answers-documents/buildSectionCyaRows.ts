import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { type BaseRowContext, type SummaryListRow, createRowContext, listHtml } from '../section-cya/cyaRow';
import type { RespondToClaimSectionId } from '../sections.config';

import type { CcdDefendantResponses } from '@services/ccdCase.interface';

const SECTION_ID: RespondToClaimSectionId = 'uploadFiles';

interface RowContext extends BaseRowContext {
  responses: CcdDefendantResponses;
}

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const base = createRowContext(req, SECTION_ID, t);
  if (!base) {
    return [];
  }

  const ctx: RowContext = {
    ...base,
    responses: base.validatedCase.defendantResponses ?? {},
  };

  addUploadedDocumentsRow(ctx);

  return ctx.rows;
}

function addUploadedDocumentsRow({ rows, responses, t, change }: RowContext): void {
  const filenames = uploadedFilenames(responses);
  rows.push({
    key: { text: t('rows.uploadedDocuments.label') },
    value:
      filenames.length === 0
        ? { text: t('rows.uploadedDocuments.none') }
        : { html: listHtml(filenames.map(escapeHtml)) },
    actions: { items: [change('upload-document', 'rows.uploadedDocuments.changeHidden')] },
  });
}

function uploadedFilenames(responses: CcdDefendantResponses): string[] {
  const documents = Array.isArray(responses.defendantDocuments) ? responses.defendantDocuments : [];
  return documents
    .map(item => item.value?.document?.document_filename?.trim())
    .filter((name): name is string => Boolean(name));
}
