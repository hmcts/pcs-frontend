import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import type { RespondToClaimSectionId } from '../sections.config';

import type { CcdCaseModel } from '@services/ccdCaseData.model';

// Shared primitives for every respond-to-claim section-CYA row builder.
// Each builder keeps its own section-specific row logic but imports these
// instead of redefining them — one source of truth, no drift.

export type SummaryListRow = {
  classes?: string;
  key: { text: string; classes?: string };
  value: { text?: string; html?: string };
  actions: { items: ChangeAction[] };
};

export type ChangeAction = {
  href: string;
  text: string;
  visuallyHiddenText: string;
};

/** Group a question row with its revealed detail: no divider, regular-weight detail key. */
export function groupQuestionAndDetail(questionRow: SummaryListRow, detailRow: SummaryListRow): void {
  questionRow.classes = 'govuk-summary-list__row--no-border';
  detailRow.key.classes = 'govuk-!-font-weight-regular';
}

/** The typed read of the validated case off the request — one cast, in one place. */
export const getValidatedCase = (req: Request): CcdCaseModel | undefined =>
  req.res?.locals.validatedCase as CcdCaseModel | undefined;

/** Escape user-entered free text and preserve newlines as <br> (GDS pattern). */
export const escapeWithLineBreaks = (value: string): string => escapeHtml(value).replace(/\n/g, '<br>');

/** Case-insensitive yes check — the backend can echo 'Yes'/'YES'. */
export const isYes = (value?: string | null): boolean => (value ?? '').trim().toUpperCase() === 'YES';

/** Render a list of (already HTML-safe) items as a govuk-list. */
export const listHtml = (items: string[]): string =>
  `<ul class="govuk-list">\n${items.map(item => `<li>${item}</li>`).join('\n')}\n</ul>`;

/**
 * Map a CCD yes/no/not-sure value (any casing the backend echoes — 'YES', 'Yes',
 * 'NO_SURE', etc.) to the lowercase translation key in `common.json` (`options.yes`,
 * `options.no`, `options.imNotSure`). Unknown values fall through lowercased so
 * mistakes surface as a missing-key, not as a silent miscast.
 */
export const toOptionKey = (value: string): string => {
  const upper = value.trim().toUpperCase();
  if (upper === 'YES') {
    return 'yes';
  }
  if (upper === 'NO') {
    return 'no';
  }
  if (upper === 'NOT_SURE') {
    return 'imNotSure';
  }
  return value.trim().toLowerCase();
};

export const makeYesNoNotSure =
  (t: TFunction) =>
  (value: string): string =>
    t(`options.${toOptionKey(value)}`);

/**
 * Section-scoped "Change" link factory. `stepSlug` is the edit-target step;
 * `hiddenKey` is the translation key for the visually-hidden link text.
 */
export const makeChange =
  (caseRef: string, sectionId: RespondToClaimSectionId, t: TFunction) =>
  (stepSlug: string, hiddenKey: string): ChangeAction => ({
    href: `/case/${caseRef}/respond-to-claim/${stepSlug}?edit=${sectionId}`,
    text: t('change'),
    visuallyHiddenText: t(hiddenKey),
  });
