import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import type { CcdCaseModel } from '@services/ccdCaseData.model';

const SECTION_ID = 'uploadFiles';

export type SummaryListRow = {
  key: { text: string };
  value: { text?: string; html?: string };
  actions: { items: { href: string; text: string; visuallyHiddenText: string }[] };
};

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const validatedCase = req.res?.locals.validatedCase as CcdCaseModel | undefined;
  const caseRef = validatedCase?.id;
  if (!validatedCase || !caseRef) {
    return [];
  }

  const responses = validatedCase.defendantResponses ?? {};

  const change = (stepSlug: string, hiddenKey: string) => ({
    href: `/case/${caseRef}/respond-to-claim/${stepSlug}?edit=${SECTION_ID}`,
    text: t('change'),
    visuallyHiddenText: t(hiddenKey),
  });

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
        : {
            html: `<ul class="govuk-list">\n${filenames
              .map(name => `<li>${escapeHtml(name.trim())}</li>`)
              .join('\n')}\n</ul>`,
          },
    actions: { items: [change('upload-document', 'rows.uploadedDocuments.changeHidden')] },
  });

  return rows;
}
