import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatIsoDate } from '../../utils';
import {
  type SummaryListRow,
  escapeWithLineBreaks,
  getValidatedCase,
  isYes,
  makeChange,
  makeYesNoNotSure,
} from '../section-cya/cyaRow';
import type { RespondToClaimSectionId } from '../sections.config';

const SECTION_ID: RespondToClaimSectionId = 'situationAndCircumstances';

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const validatedCase = getValidatedCase(req);
  const caseRef = validatedCase?.id;
  if (!validatedCase || !caseRef) {
    return [];
  }

  // Every section-5 step writes to householdCircumstances and is unconditional, so
  // the CYA enumerates rows with a presence check only.
  const hc = validatedCase.defendantResponses?.householdCircumstances ?? {};
  const change = makeChange(caseRef, SECTION_ID, t);
  const yesNoNotSure = makeYesNoNotSure(t);

  // A radio answer plus an optional free-text detail captured on the same page:
  // one row, one change link — the answer, then the detail beneath it when present.
  const answerWithDetail = (answer: string, detail?: string): { text?: string; html?: string } => {
    const trimmed = detail?.trim();
    if (!trimmed) {
      return { text: yesNoNotSure(answer) };
    }
    return { html: `${escapeHtml(yesNoNotSure(answer))}<br><br>${escapeWithLineBreaks(trimmed)}` };
  };

  const rows: SummaryListRow[] = [];

  // your-household-and-circumstances is an interstitial with no input — no row.

  // Dependant children
  if (hc.dependantChildren) {
    rows.push({
      key: { text: t('rows.dependantChildren.label') },
      value: answerWithDetail(hc.dependantChildren, hc.dependantChildrenDetails),
      actions: { items: [change('do-you-have-any-dependant-children', 'rows.dependantChildren.changeHidden')] },
    });
  }

  // Other dependants
  if (hc.otherDependants) {
    rows.push({
      key: { text: t('rows.otherDependants.label') },
      value: answerWithDetail(hc.otherDependants, hc.otherDependantDetails),
      actions: { items: [change('do-you-have-any-other-dependants', 'rows.otherDependants.changeHidden')] },
    });
  }

  // Other adults living in the home
  if (hc.otherTenants) {
    rows.push({
      key: { text: t('rows.otherTenants.label') },
      value: answerWithDetail(hc.otherTenants, hc.otherTenantsDetails),
      actions: { items: [change('do-any-other-adults-live-in-your-home', 'rows.otherTenants.changeHidden')] },
    });
  }

  // Somewhere else to live — Yes/No/Not sure, with a transfer date when Yes
  if (hc.alternativeAccommodation) {
    const date = hc.alternativeAccommodationTransferDate;
    const value =
      isYes(hc.alternativeAccommodation) && date
        ? { text: `${yesNoNotSure(hc.alternativeAccommodation)} (${formatIsoDate(date)})` }
        : { text: yesNoNotSure(hc.alternativeAccommodation) };
    rows.push({
      key: { text: t('rows.alternativeAccommodation.label') },
      value,
      actions: {
        items: [
          change(
            'would-you-have-somewhere-else-to-live-if-you-had-to-leave-your-home',
            'rows.alternativeAccommodation.changeHidden'
          ),
        ],
      },
    });
  }

  // Additional circumstances to share
  if (hc.shareAdditionalCircumstances) {
    rows.push({
      key: { text: t('rows.shareAdditionalCircumstances.label') },
      value: answerWithDetail(hc.shareAdditionalCircumstances, hc.additionalCircumstancesDetails),
      actions: { items: [change('your-circumstances', 'rows.shareAdditionalCircumstances.changeHidden')] },
    });
  }

  // Exceptional hardship
  if (hc.exceptionalHardship) {
    rows.push({
      key: { text: t('rows.exceptionalHardship.label') },
      value: answerWithDetail(hc.exceptionalHardship, hc.exceptionalHardshipDetails),
      actions: { items: [change('exceptional-hardship', 'rows.exceptionalHardship.changeHidden')] },
    });
  }

  return rows;
}
