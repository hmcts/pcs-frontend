import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatIsoDate } from '../../utils';
import {
  type BaseRowContext,
  type SummaryListRow,
  createRowContext,
  groupQuestionAndDetail,
  isYes,
  pushDetailRow,
  pushYesNoRow,
} from '../section-cya/cyaRow';
import type { RespondToClaimSectionId } from '../sections.config';

import type { HouseholdCircumstances } from '@services/ccdCase.interface';

const SECTION_ID: RespondToClaimSectionId = 'situationAndCircumstances';

interface RowContext extends BaseRowContext {
  hc: HouseholdCircumstances;
}

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const base = createRowContext(req, SECTION_ID, t);
  if (!base) {
    return [];
  }

  const ctx: RowContext = {
    ...base,
    hc: base.validatedCase.defendantResponses?.householdCircumstances ?? {},
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
  const questionRow = pushYesNoRow(
    rows,
    'rows.dependantChildren',
    hc.dependantChildren,
    'do-you-have-any-dependant-children',
    t,
    yesNoNotSure,
    change
  );
  const detail = hc.dependantChildrenDetails?.trim();
  if (isYes(hc.dependantChildren) && detail) {
    pushDetailRow(
      rows,
      questionRow,
      'rows.dependantChildrenDetails',
      detail,
      'do-you-have-any-dependant-children',
      t,
      change
    );
  }
}

function addOtherDependantsRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  if (!hc.otherDependants) {
    return;
  }
  const questionRow = pushYesNoRow(
    rows,
    'rows.otherDependants',
    hc.otherDependants,
    'do-you-have-any-other-dependants',
    t,
    yesNoNotSure,
    change
  );
  const detail = hc.otherDependantDetails?.trim();
  if (isYes(hc.otherDependants) && detail) {
    pushDetailRow(
      rows,
      questionRow,
      'rows.otherDependantsDetails',
      detail,
      'do-you-have-any-other-dependants',
      t,
      change
    );
  }
}

function addOtherTenantsRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  if (!hc.otherTenants) {
    return;
  }
  const questionRow = pushYesNoRow(
    rows,
    'rows.otherTenants',
    hc.otherTenants,
    'do-any-other-adults-live-in-your-home',
    t,
    yesNoNotSure,
    change
  );
  const detail = hc.otherTenantsDetails?.trim();
  if (isYes(hc.otherTenants) && detail) {
    pushDetailRow(
      rows,
      questionRow,
      'rows.otherTenantsDetails',
      detail,
      'do-any-other-adults-live-in-your-home',
      t,
      change
    );
  }
}

function addAlternativeAccommodationRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  if (!hc.alternativeAccommodation) {
    return;
  }
  const questionRow = pushYesNoRow(
    rows,
    'rows.alternativeAccommodation',
    hc.alternativeAccommodation,
    'would-you-have-somewhere-else-to-live-if-you-had-to-leave-your-home',
    t,
    yesNoNotSure,
    change
  );
  // Optional move-in date — render whenever alternativeAccommodation is YES.
  const date = hc.alternativeAccommodationTransferDate;
  if (isYes(hc.alternativeAccommodation)) {
    const detailRow: SummaryListRow = {
      key: { text: t('rows.alternativeAccommodationDate.label') },
      value: { text: date ? formatIsoDate(date) : t('noAnswerProvided') },
      actions: {
        items: [change('would-you-have-somewhere-else-to-live-if-you-had-to-leave-your-home')],
      },
    };
    groupQuestionAndDetail(questionRow, detailRow);
    rows.push(detailRow);
  }
}

function addShareAdditionalCircumstancesRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  if (!hc.shareAdditionalCircumstances) {
    return;
  }
  const questionRow = pushYesNoRow(
    rows,
    'rows.shareAdditionalCircumstances',
    hc.shareAdditionalCircumstances,
    'your-circumstances',
    t,
    yesNoNotSure,
    change
  );
  const detail = hc.additionalCircumstancesDetails?.trim();
  if (isYes(hc.shareAdditionalCircumstances) && detail) {
    pushDetailRow(
      rows,
      questionRow,
      'rows.shareAdditionalCircumstancesDetails',
      detail,
      'your-circumstances',
      t,
      change
    );
  }
}

function addExceptionalHardshipRow({ rows, hc, t, change, yesNoNotSure }: RowContext): void {
  if (!hc.exceptionalHardship) {
    return;
  }
  const questionRow = pushYesNoRow(
    rows,
    'rows.exceptionalHardship',
    hc.exceptionalHardship,
    'exceptional-hardship',
    t,
    yesNoNotSure,
    change
  );
  const detail = hc.exceptionalHardshipDetails?.trim();
  if (isYes(hc.exceptionalHardship) && detail) {
    pushDetailRow(rows, questionRow, 'rows.exceptionalHardshipDetails', detail, 'exceptional-hardship', t, change);
  }
}
