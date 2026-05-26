import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatIsoDate, isTenancyStartDateKnown, normalizeYesNoValue, penceToPounds } from '../../utils';
import { isNoticeDateConfirmedAndNotProvided, isNoticeDateConfirmedAndProvided } from '../flowConditions';
import {
  type BaseRowContext,
  type SummaryListRow,
  createRowContext,
  escapeWithLineBreaks,
  groupQuestionAndDetail,
  pushYesNoRow,
} from '../section-cya/cyaRow';
import type { RespondToClaimSectionId } from '../sections.config';

import type { CcdCounterClaim, CcdDefendantResponses } from '@services/ccdCase.interface';

const SECTION_ID: RespondToClaimSectionId = 'disputeAndTenancy';

interface RowContext extends BaseRowContext {
  responses: CcdDefendantResponses;
  req: Request;
}

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const base = createRowContext(req, SECTION_ID, t);
  if (!base) {
    return [];
  }

  // Trust the Normaliser: every field present here is reachable in the current
  // state — each row helper does a presence check only.
  const ctx: RowContext = {
    ...base,
    responses: base.validatedCase.defendantResponses ?? {},
    req,
  };

  addLandlordRegisteredRow(ctx);
  addLandlordLicensedRow(ctx);
  addWrittenTermsRow(ctx);
  addTenancyTypeRow(ctx);
  addTenancyStartDateRow(ctx);
  addPossessionNoticeReceivedRow(ctx);
  addNoticeReceivedDateRow(ctx);
  addRentArrearsRow(ctx);
  addDisputeClaimRows(ctx);
  addCounterClaimRow(ctx);
  addCounterClaimDetailsRows(ctx);

  return ctx.rows;
}

function addLandlordRegisteredRow({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  if (!responses.landlordRegistered) {
    return;
  }
  pushYesNoRow(
    rows,
    'rows.landlordRegistered',
    responses.landlordRegistered,
    'landlord-registered',
    t,
    yesNoNotSure,
    change
  );
}

function addLandlordLicensedRow({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  if (!responses.landlordLicensed) {
    return;
  }
  pushYesNoRow(rows, 'rows.landlordLicensed', responses.landlordLicensed, 'landlord-licensed', t, yesNoNotSure, change);
}

function addWrittenTermsRow({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  if (!responses.writtenTerms) {
    return;
  }
  pushYesNoRow(rows, 'rows.writtenTerms', responses.writtenTerms, 'written-terms', t, yesNoNotSure, change);
}

function addTenancyTypeRow({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  if (!responses.tenancyTypeConfirmation) {
    return;
  }
  const questionRow = pushYesNoRow(
    rows,
    'rows.tenancyTypeCorrect',
    responses.tenancyTypeConfirmation,
    'tenancy-type-details',
    t,
    yesNoNotSure,
    change
  );

  if (normalizeYesNoValue(responses.tenancyTypeConfirmation) !== 'NO') {
    return;
  }
  const correctedType = responses.tenancyType?.trim();
  if (!correctedType) {
    return;
  }
  const detailRow: SummaryListRow = {
    key: { text: t('rows.tenancyTypeDetails.label') },
    value: { text: correctedType },
    actions: { items: [change('tenancy-type-details', 'rows.tenancyTypeDetails.changeHidden')] },
  };
  groupQuestionAndDetail(questionRow, detailRow);
  rows.push(detailRow);
}

function addTenancyStartDateRow({ rows, responses, req, t, change, yesNoNotSure }: RowContext): void {
  const date = responses.tenancyStartDate;
  const confirmation = responses.tenancyStartDateConfirmation;

  if (isTenancyStartDateKnown(req)) {
    // tenancy-date-details branch — the confirmation answer is mandatory; a date is written
    // only when the citizen corrects it. Drop the row only if the step is unreached.
    if (!date && !confirmation) {
      return;
    }
    rows.push({
      key: { text: t('rows.tenancyStartDate.label') },
      value: { text: date ? formatIsoDate(date) : yesNoNotSure(confirmation as string) },
      actions: { items: [change('tenancy-date-details', 'rows.tenancyStartDate.changeHidden')] },
    });
    return;
  }

  // tenancy-date-unknown branch — the start date is optional. Always render the row;
  // "No answer provided" when blank.
  rows.push({
    key: { text: t('rows.tenancyStartDate.label') },
    value: { text: date ? formatIsoDate(date) : t('noAnswerProvided') },
    actions: { items: [change('tenancy-date-unknown', 'rows.tenancyStartDate.changeHidden')] },
  });
}

function addPossessionNoticeReceivedRow({ rows, validatedCase, t, change }: RowContext): void {
  const value = validatedCase.defendantResponsesPossessionNoticeReceived;
  if (!value) {
    return;
  }
  rows.push({
    key: { text: t('rows.possessionNoticeReceived.label', { claimantName: validatedCase.claimantName }) },
    value: { text: t(`options.${value}`) },
    actions: { items: [change('confirmation-of-notice-given', 'rows.possessionNoticeReceived.changeHidden')] },
  });
}

function addNoticeReceivedDateRow({ rows, validatedCase, responses, req, t, change }: RowContext): void {
  // The notice-received date is optional and asked on one of the two notice-date pages.
  // Render the row when the citizen is on either branch; "No answer provided" when blank.
  if (!isNoticeDateConfirmedAndProvided(req) && !isNoticeDateConfirmedAndNotProvided(req)) {
    return;
  }
  // Same field for both notice-date steps; discriminate on the claim's notice date so the
  // change link routes back to whichever step the user actually took.
  const editStep = validatedCase.noticeDate
    ? 'confirmation-of-notice-date-when-provided'
    : 'confirmation-of-notice-date-when-not-provided';
  rows.push({
    key: { text: t('rows.noticeReceivedDate.label', { claimantName: validatedCase.claimantName }) },
    value: {
      text: responses.noticeReceivedDate ? formatIsoDate(responses.noticeReceivedDate) : t('noAnswerProvided'),
    },
    actions: { items: [change(editStep, 'rows.noticeReceivedDate.changeHidden')] },
  });
}

function addRentArrearsRow({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  if (!responses.rentArrearsAmountConfirmation) {
    return;
  }
  const questionRow = pushYesNoRow(
    rows,
    'rows.rentArrearsAmountConfirmation',
    responses.rentArrearsAmountConfirmation,
    'rent-arrears-dispute',
    t,
    yesNoNotSure,
    change
  );

  if (normalizeYesNoValue(responses.rentArrearsAmountConfirmation) !== 'NO') {
    return;
  }
  // rentArrearsAmount is stored in pence.
  const disputedAmount = penceToPounds(responses.rentArrearsAmount);
  if (!disputedAmount) {
    return;
  }
  const detailRow: SummaryListRow = {
    key: { text: t('rows.rentArrearsAmountDetails.label') },
    value: { text: `£${disputedAmount}` },
    actions: { items: [change('rent-arrears-dispute', 'rows.rentArrearsAmountDetails.changeHidden')] },
  };
  groupQuestionAndDetail(questionRow, detailRow);
  rows.push(detailRow);
}

function addDisputeClaimRows({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  if (!responses.disputeClaim) {
    return;
  }
  const questionRow = pushYesNoRow(
    rows,
    'rows.disputeClaim',
    responses.disputeClaim,
    'non-rent-arrears-dispute',
    t,
    yesNoNotSure,
    change
  );

  if (normalizeYesNoValue(responses.disputeClaim) !== 'YES') {
    return;
  }
  const details = responses.disputeClaimDetails?.trim();
  if (!details) {
    return;
  }
  const detailRow: SummaryListRow = {
    key: { text: t('rows.disputeClaimDetails.label') },
    value: { html: escapeWithLineBreaks(details) },
    actions: { items: [change('non-rent-arrears-dispute', 'rows.disputeClaimDetails.changeHidden')] },
  };
  groupQuestionAndDetail(questionRow, detailRow);
  rows.push(detailRow);
}

function addCounterClaimRow({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  if (!responses.makeCounterClaim) {
    return;
  }
  pushYesNoRow(rows, 'rows.makeCounterClaim', responses.makeCounterClaim, 'counter-claim', t, yesNoNotSure, change);
}

function addCounterClaimDetailsRows(ctx: RowContext): void {
  if (normalizeYesNoValue(ctx.responses.makeCounterClaim) !== 'YES' || !ctx.responses.counterClaim) {
    return;
  }
  const cc = ctx.responses.counterClaim;
  addCounterClaimTypeRow(ctx, cc);
  addCounterClaimAmountRow(ctx, cc);
  addCounterClaimNeedHelpWithFeesRow(ctx, cc);
}

function addCounterClaimNeedHelpWithFeesRow({ rows, t, change }: RowContext, cc: CcdCounterClaim): void {
  if (!cc.needHelpWithFees) {
    return;
  }
  rows.push({
    key: { text: t('rows.counterClaimNeedHelpWithFees.label') },
    value: { text: t(`rows.counterClaimNeedHelpWithFees.options.${cc.needHelpWithFees}`) },
    actions: { items: [change('counter-claim-fee', 'rows.counterClaimNeedHelpWithFees.changeHidden')] },
  });
}

function addCounterClaimTypeRow({ rows, t, change }: RowContext, cc: CcdCounterClaim): void {
  if (!cc.claimType) {
    return;
  }
  rows.push({
    key: { text: t('rows.counterClaimType.label') },
    value: { text: t(`rows.counterClaimType.options.${cc.claimType}`) },
    actions: { items: [change('counter-claim-what-are-you-claiming-for', 'rows.counterClaimType.changeHidden')] },
  });
}

function addCounterClaimAmountRow({ rows, t, change, yesNoNotSure }: RowContext, cc: CcdCounterClaim): void {
  const claimsMoney = cc.claimType === 'PAYMENT_OR_COMPENSATION' || cc.claimType === 'BOTH';
  if (!claimsMoney || !cc.isClaimAmountKnown) {
    return;
  }
  // Y/N row mirrors the step page's heading "Are you claiming for a specific sum of money?"
  const questionRow = pushYesNoRow(
    rows,
    'rows.isClaimAmountKnown',
    cc.isClaimAmountKnown,
    'counter-claim-specific-sum',
    t,
    yesNoNotSure,
    change
  );

  // Amount follow-up: matches the step page's sub-question per branch.
  const known = normalizeYesNoValue(cc.isClaimAmountKnown);
  if (known === 'YES' && cc.claimAmount !== undefined) {
    const pounds = penceToPounds(cc.claimAmount);
    if (pounds) {
      const detailRow: SummaryListRow = {
        key: { text: t('rows.claimAmount.label') },
        value: { text: `£${pounds}` },
        actions: { items: [change('counter-claim-specific-sum', 'rows.claimAmount.changeHidden')] },
      };
      groupQuestionAndDetail(questionRow, detailRow);
      rows.push(detailRow);
    }
  } else if (known === 'NO' && cc.estimatedMaxClaimAmount !== undefined) {
    const pounds = penceToPounds(cc.estimatedMaxClaimAmount);
    if (pounds) {
      const detailRow: SummaryListRow = {
        key: { text: t('rows.estimatedMaxClaimAmount.label') },
        value: { text: `£${pounds}` },
        actions: { items: [change('counter-claim-specific-sum', 'rows.estimatedMaxClaimAmount.changeHidden')] },
      };
      groupQuestionAndDetail(questionRow, detailRow);
      rows.push(detailRow);
    }
  }
}
