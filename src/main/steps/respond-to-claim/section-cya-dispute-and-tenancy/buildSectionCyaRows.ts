import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatIsoDate, normalizeYesNoValue, penceToPounds } from '../../utils';
import {
  type SummaryListRow,
  escapeWithLineBreaks,
  getValidatedCase,
  makeChange,
  makeYesNoNotSure,
} from '../section-cya/cyaRow';
import type { RespondToClaimSectionId } from '../sections.config';

import type { CcdCounterClaim, CcdDefendantResponses } from '@services/ccdCase.interface';
import type { CcdCaseModel } from '@services/ccdCaseData.model';

const SECTION_ID: RespondToClaimSectionId = 'disputeAndTenancy';

interface RowContext {
  rows: SummaryListRow[];
  validatedCase: CcdCaseModel;
  responses: CcdDefendantResponses;
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

  // Trust the Normaliser: every field present here is reachable in the current
  // state — each row helper does a presence check only.
  const ctx: RowContext = {
    rows: [],
    validatedCase,
    responses: validatedCase.defendantResponses ?? {},
    t,
    change: makeChange(caseRef, SECTION_ID, t),
    yesNoNotSure: makeYesNoNotSure(t),
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
  rows.push({
    key: { text: t('rows.landlordRegistered.label') },
    value: { text: yesNoNotSure(responses.landlordRegistered) },
    actions: { items: [change('landlord-registered', 'rows.landlordRegistered.changeHidden')] },
  });
}

function addLandlordLicensedRow({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  if (!responses.landlordLicensed) {
    return;
  }
  rows.push({
    key: { text: t('rows.landlordLicensed.label') },
    value: { text: yesNoNotSure(responses.landlordLicensed) },
    actions: { items: [change('landlord-licensed', 'rows.landlordLicensed.changeHidden')] },
  });
}

function addWrittenTermsRow({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  if (!responses.writtenTerms) {
    return;
  }
  rows.push({
    key: { text: t('rows.writtenTerms.label') },
    value: { text: yesNoNotSure(responses.writtenTerms) },
    actions: { items: [change('written-terms', 'rows.writtenTerms.changeHidden')] },
  });
}

function addTenancyTypeRow({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  if (!responses.tenancyTypeConfirmation) {
    return;
  }
  const typeCorrect = normalizeYesNoValue(responses.tenancyTypeConfirmation) === 'YES';
  const correctedType = responses.tenancyType?.trim();
  const value =
    !typeCorrect && correctedType
      ? { html: escapeHtml(`${t('options.no')} (${correctedType})`) }
      : { text: yesNoNotSure(responses.tenancyTypeConfirmation) };
  rows.push({
    key: { text: t('rows.tenancyTypeCorrect.label') },
    value,
    actions: { items: [change('tenancy-type-details', 'rows.tenancyTypeCorrect.changeHidden')] },
  });
}

function addTenancyStartDateRow({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  // tenancy-date-details always writes the confirmation answer (plus a date only when
  // the user corrects it); tenancy-date-unknown writes only a date. Confirmation presence
  // routes the change link back to whichever step the user took.
  const date = responses.tenancyStartDate;
  const confirmation = responses.tenancyStartDateConfirmation;
  if (!date && !confirmation) {
    return;
  }
  const editStep = confirmation ? 'tenancy-date-details' : 'tenancy-date-unknown';
  rows.push({
    key: { text: t('rows.tenancyStartDate.label') },
    value: { text: date ? formatIsoDate(date) : yesNoNotSure(confirmation as string) },
    actions: { items: [change(editStep, 'rows.tenancyStartDate.changeHidden')] },
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

function addNoticeReceivedDateRow({ rows, validatedCase, responses, t, change }: RowContext): void {
  if (!responses.noticeReceivedDate) {
    return;
  }
  // Same field for both notice-date steps; discriminate on the claim's notice date
  // (the same signal isNoticeDateProvided uses in flow.config) so the change link
  // routes back to whichever step the user actually took.
  const editStep = validatedCase.noticeDate
    ? 'confirmation-of-notice-date-when-provided'
    : 'confirmation-of-notice-date-when-not-provided';
  rows.push({
    key: { text: t('rows.noticeReceivedDate.label', { claimantName: validatedCase.claimantName }) },
    value: { text: formatIsoDate(responses.noticeReceivedDate) },
    actions: { items: [change(editStep, 'rows.noticeReceivedDate.changeHidden')] },
  });
}

function addRentArrearsRow({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  if (!responses.rentArrearsAmountConfirmation) {
    return;
  }
  // rentArrearsAmount is stored in pence — penceToPounds returning undefined for
  // missing/invalid values also covers the "not disputing" branch.
  const confirmed = normalizeYesNoValue(responses.rentArrearsAmountConfirmation) === 'YES';
  const disputedAmount = !confirmed ? penceToPounds(responses.rentArrearsAmount) : undefined;
  const value = disputedAmount
    ? { html: escapeHtml(`${t('options.no')} (£${disputedAmount})`) }
    : { text: yesNoNotSure(responses.rentArrearsAmountConfirmation) };
  rows.push({
    key: { text: t('rows.rentArrearsAmountConfirmation.label') },
    value,
    actions: { items: [change('rent-arrears-dispute', 'rows.rentArrearsAmountConfirmation.changeHidden')] },
  });
}

function addDisputeClaimRows({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  if (!responses.disputeClaim) {
    return;
  }
  rows.push({
    key: { text: t('rows.disputeClaim.label') },
    value: { text: yesNoNotSure(responses.disputeClaim) },
    actions: { items: [change('non-rent-arrears-dispute', 'rows.disputeClaim.changeHidden')] },
  });

  if (normalizeYesNoValue(responses.disputeClaim) !== 'YES') {
    return;
  }
  const details = responses.disputeClaimDetails?.trim();
  if (!details) {
    return;
  }
  rows.push({
    key: { text: t('rows.disputeClaimDetails.label') },
    value: { html: escapeWithLineBreaks(details) },
    actions: { items: [change('non-rent-arrears-dispute', 'rows.disputeClaimDetails.changeHidden')] },
  });
}

function addCounterClaimRow({ rows, responses, t, change, yesNoNotSure }: RowContext): void {
  if (!responses.makeCounterClaim) {
    return;
  }
  rows.push({
    key: { text: t('rows.makeCounterClaim.label') },
    value: { text: yesNoNotSure(responses.makeCounterClaim) },
    actions: { items: [change('counter-claim', 'rows.makeCounterClaim.changeHidden')] },
  });
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
  rows.push({
    key: { text: t('rows.counterClaimAmount.label') },
    value: { text: counterClaimAmountText(cc, t, yesNoNotSure) },
    actions: { items: [change('counter-claim-specific-sum', 'rows.counterClaimAmount.changeHidden')] },
  });
}

function counterClaimAmountText(
  cc: CcdCounterClaim,
  t: TFunction,
  yesNoNotSure: ReturnType<typeof makeYesNoNotSure>
): string {
  if (!cc.isClaimAmountKnown) {
    return '';
  }
  const known = normalizeYesNoValue(cc.isClaimAmountKnown);
  if (known === 'YES' && cc.claimAmount !== undefined) {
    const pounds = penceToPounds(cc.claimAmount);
    return pounds ? `£${pounds}` : yesNoNotSure(cc.isClaimAmountKnown);
  }
  if (known === 'NO' && cc.estimatedMaxClaimAmount !== undefined) {
    const pounds = penceToPounds(cc.estimatedMaxClaimAmount);
    return pounds
      ? `${t('rows.counterClaimAmount.estimatedMaxPrefix')} £${pounds}`
      : yesNoNotSure(cc.isClaimAmountKnown);
  }
  return yesNoNotSure(cc.isClaimAmountKnown);
}
