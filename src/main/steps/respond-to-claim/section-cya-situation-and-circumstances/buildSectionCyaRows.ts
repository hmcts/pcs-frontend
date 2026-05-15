import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatIsoDate } from '../../utils';
import {
  type SummaryListRow,
  answerWithDetail,
  getValidatedCase,
  isYes,
  makeChange,
  makeYesNoNotSure,
} from '../section-cya/cyaRow';
import type { RespondToClaimSectionId } from '../sections.config';

import type { HouseholdCircumstances } from '@services/ccdCase.interface';

const SECTION_ID: RespondToClaimSectionId = 'situationAndCircumstances';

interface RowContext {
  rows: SummaryListRow[];
  hc: HouseholdCircumstances;
  t: TFunction;
  change: ReturnType<typeof makeChange>;
  yesNoNotSure: ReturnType<typeof makeYesNoNotSure>;
}

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const validatedCase = getValidatedCase(req);
  const caseRef = validatedCase?.id;
  if (!validatedCase || !caseRef) {
    return [];
  }

  const ctx: RowContext = {
    rows: [],
    hc: validatedCase.defendantResponses?.householdCircumstances ?? {},
    t,
    change: makeChange(caseRef, SECTION_ID, t),
    yesNoNotSure: makeYesNoNotSure(t),
  };

  // your-household-and-circumstances is an interstitial with no input — no row.
  addDependantChildrenRow(ctx);
  addOtherDependantsRow(ctx);
  addOtherTenantsRow(ctx);
  addAlternativeAccommodationRow(ctx);
  addShareAdditionalCircumstancesRow(ctx);
  addExceptionalHardshipRow(ctx);

  return ctx.rows;
}

function addDependantChildrenRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  if (!hc.dependantChildren) {
    return;
  }
  rows.push({
    key: { text: t('rows.dependantChildren.label') },
    value: answerWithDetail(hc.dependantChildren, hc.dependantChildrenDetails, yesNoNotSure),
    actions: { items: [change('do-you-have-any-dependant-children', 'rows.dependantChildren.changeHidden')] },
  });
}

function addOtherDependantsRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  if (!hc.otherDependants) {
    return;
  }
  rows.push({
    key: { text: t('rows.otherDependants.label') },
    value: answerWithDetail(hc.otherDependants, hc.otherDependantDetails, yesNoNotSure),
    actions: { items: [change('do-you-have-any-other-dependants', 'rows.otherDependants.changeHidden')] },
  });
}

function addOtherTenantsRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  if (!hc.otherTenants) {
    return;
  }
  rows.push({
    key: { text: t('rows.otherTenants.label') },
    value: answerWithDetail(hc.otherTenants, hc.otherTenantsDetails, yesNoNotSure),
    actions: { items: [change('do-any-other-adults-live-in-your-home', 'rows.otherTenants.changeHidden')] },
  });
}

function addAlternativeAccommodationRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  if (!hc.alternativeAccommodation) {
    return;
  }
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

function addShareAdditionalCircumstancesRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  if (!hc.shareAdditionalCircumstances) {
    return;
  }
  rows.push({
    key: { text: t('rows.shareAdditionalCircumstances.label') },
    value: answerWithDetail(hc.shareAdditionalCircumstances, hc.additionalCircumstancesDetails, yesNoNotSure),
    actions: { items: [change('your-circumstances', 'rows.shareAdditionalCircumstances.changeHidden')] },
  });
}

function addExceptionalHardshipRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  if (!hc.exceptionalHardship) {
    return;
  }
  rows.push({
    key: { text: t('rows.exceptionalHardship.label') },
    value: answerWithDetail(hc.exceptionalHardship, hc.exceptionalHardshipDetails, yesNoNotSure),
    actions: { items: [change('exceptional-hardship', 'rows.exceptionalHardship.changeHidden')] },
  });
}
