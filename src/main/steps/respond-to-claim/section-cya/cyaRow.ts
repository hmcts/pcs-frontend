import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import type { RespondToClaimSectionId } from '../sections.config';

import type { CcdCaseModel } from '@services/ccdCaseData.model';

// Shared primitives for every respond-to-claim section-CYA row builder.
// Each builder keeps its own section-specific row logic but imports these
// instead of redefining them — one source of truth, no drift.

export type SummaryListRow = {
  key: { text: string };
  value: { text?: string; html?: string };
  actions: { items: ChangeAction[] };
};

export type ChangeAction = {
  href: string;
  text: string;
  visuallyHiddenText: string;
};

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
 * options.{value} translation lookup, normalising casing first. The backend echoes
 * VerticalYesNo as Pascal 'Yes'/'No' since pcs-api #1678, but the translation keys
 * are YES/NO/NOT_SURE — normalising here keeps every section consistent.
 */
export const makeYesNoNotSure =
  (t: TFunction) =>
  (value: string): string =>
    t(`options.${value.trim().toUpperCase()}`);

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

/**
 * "Yes/No (+ optional free-text detail beneath)" row value — the answer on one line,
 * a blank line, then the escaped detail. When there's no detail, just the answer text.
 * Used by every section-CYA row where a radio answer is captured alongside a free-text
 * follow-up on the same page.
 */
export const answerWithDetail = (
  answer: string,
  detail: string | null | undefined,
  yesNoNotSure: ReturnType<typeof makeYesNoNotSure>
): SummaryListRow['value'] => {
  const trimmed = detail?.trim();
  if (!trimmed) {
    return { text: yesNoNotSure(answer) };
  }
  return { html: `${escapeHtml(yesNoNotSure(answer))}<br><br>${escapeWithLineBreaks(trimmed)}` };
};
