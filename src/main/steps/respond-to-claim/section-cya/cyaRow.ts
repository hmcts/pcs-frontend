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
  actions?: { items: ChangeAction[] };
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
const toOptionKey = (value: string): string => {
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

export interface BaseRowContext {
  rows: SummaryListRow[];
  validatedCase: CcdCaseModel;
  t: TFunction;
  change: ReturnType<typeof makeChange>;
  yesNoNotSure: ReturnType<typeof makeYesNoNotSure>;
}

/** Bootstrap shared by every section-CYA builder — validates the case and wires the
 *  change-link + yes/no helpers. Returns undefined when there is no validated case. */
export function createRowContext(
  req: Request,
  sectionId: RespondToClaimSectionId,
  t: TFunction
): BaseRowContext | undefined {
  const validatedCase = getValidatedCase(req);
  const caseRef = validatedCase?.id;
  if (!validatedCase || !caseRef) {
    return undefined;
  }
  return { rows: [], validatedCase, t, change: makeChange(caseRef, sectionId, t), yesNoNotSure: makeYesNoNotSure(t) };
}

/** Push a yes/no/not-sure summary row, deriving `.label`/`.changeHidden` from `labelKey`. */
export function pushYesNoRow(
  rows: SummaryListRow[],
  labelKey: string,
  answer: string,
  step: string,
  t: TFunction,
  yesNoNotSure: ReturnType<typeof makeYesNoNotSure>,
  change: ReturnType<typeof makeChange>
): SummaryListRow {
  const row: SummaryListRow = {
    key: { text: t(`${labelKey}.label`) },
    value: { text: yesNoNotSure(answer) },
    actions: { items: [change(step, `${labelKey}.changeHidden`)] },
  };
  rows.push(row);
  return row;
}

/** Push a revealed free-text detail row grouped under its question row. */
export function pushDetailRow(
  rows: SummaryListRow[],
  questionRow: SummaryListRow,
  labelKey: string,
  detail: string,
  step: string,
  t: TFunction,
  change: ReturnType<typeof makeChange>
): void {
  const detailRow: SummaryListRow = {
    key: { text: t(`${labelKey}.label`) },
    value: { html: escapeWithLineBreaks(detail) },
    actions: { items: [change(step, `${labelKey}.changeHidden`)] },
  };
  groupQuestionAndDetail(questionRow, detailRow);
  rows.push(detailRow);
}

// GDS multi-select pattern: a single value renders as text; many values render as a
// govuk-list. Items in `userSuppliedItems` are HTML-escaped (the rest are translation
// strings that are safe to render verbatim).
export function multiSelectValue(items: string[], userSuppliedItems: Set<string> = new Set()): SummaryListRow['value'] {
  if (items.length === 0) {
    return { text: '' };
  }
  if (items.length === 1) {
    const item = items[0];
    return userSuppliedItems.has(item) ? { html: escapeHtml(item) } : { text: item };
  }
  const lis = items.map(item => `<li>${userSuppliedItems.has(item) ? escapeHtml(item) : item}</li>`).join('\n');
  return { html: `<ul class="govuk-list">\n${lis}\n</ul>` };
}
