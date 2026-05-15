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

const SECTION_ID: RespondToClaimSectionId = 'disputeAndTenancy';

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const validatedCase = getValidatedCase(req);
  const caseRef = validatedCase?.id;
  if (!validatedCase || !caseRef) {
    return [];
  }

  // Trust the Normaliser: every field present here is reachable in the
  // current state. The CYA enumerates rows with a presence check only.
  const responses = validatedCase.defendantResponses ?? {};
  const change = makeChange(caseRef, SECTION_ID, t);
  const yesNoNotSure = makeYesNoNotSure(t);

  const rows: SummaryListRow[] = [];

  // Wales-only: landlord registered
  if (responses.landlordRegistered) {
    rows.push({
      key: { text: t('rows.landlordRegistered.label') },
      value: { text: yesNoNotSure(responses.landlordRegistered) },
      actions: { items: [change('landlord-registered', 'rows.landlordRegistered.changeHidden')] },
    });
  }

  // Wales-only: landlord licensed
  if (validatedCase.defendantResponsesLandlordLicensed) {
    rows.push({
      key: { text: t('rows.landlordLicensed.label') },
      value: { text: yesNoNotSure(validatedCase.defendantResponsesLandlordLicensed) },
      actions: { items: [change('landlord-licensed', 'rows.landlordLicensed.changeHidden')] },
    });
  }

  // Wales-only: written terms
  if (responses.writtenTerms) {
    rows.push({
      key: { text: t('rows.writtenTerms.label') },
      value: { text: yesNoNotSure(responses.writtenTerms) },
      actions: { items: [change('written-terms', 'rows.writtenTerms.changeHidden')] },
    });
  }

  // Tenancy type — show the corrected type when the user says the claim's type is
  // wrong (the "no" subfield), mirroring the rentArrearsAmountConfirmation row.
  if (responses.tenancyTypeConfirmation) {
    const typeCorrect = normalizeYesNoValue(responses.tenancyTypeConfirmation) === 'YES';
    const value =
      !typeCorrect && responses.tenancyType?.trim()
        ? { html: escapeHtml(`${t('options.NO')} (${responses.tenancyType.trim()})`) }
        : { text: yesNoNotSure(responses.tenancyTypeConfirmation) };
    rows.push({
      key: { text: t('rows.tenancyTypeCorrect.label') },
      value,
      actions: { items: [change('tenancy-type-details', 'rows.tenancyTypeCorrect.changeHidden')] },
    });
  }

  // Tenancy start date — ONE row covers both date-details and date-unknown branches.
  // tenancy-date-details always writes the confirmation answer (plus a date only
  // when the user corrects it); tenancy-date-unknown writes only a date. Show the
  // row when either is present; the change link and value adapt to the branch taken.
  const tenancyDate = validatedCase.defendantResponsesTenancyStartDate;
  const tenancyDateConfirmation = validatedCase.defendantResponsesTenancyStartDateConfirmation;
  if (tenancyDate || tenancyDateConfirmation) {
    const editStep = tenancyDateConfirmation ? 'tenancy-date-details' : 'tenancy-date-unknown';
    rows.push({
      key: { text: t('rows.tenancyStartDate.label') },
      value: { text: tenancyDate ? formatIsoDate(tenancyDate) : yesNoNotSure(tenancyDateConfirmation as string) },
      actions: { items: [change(editStep, 'rows.tenancyStartDate.changeHidden')] },
    });
  }

  // Notice given
  const noticeReceived = validatedCase.defendantResponsesPossessionNoticeReceived;
  if (noticeReceived) {
    rows.push({
      key: { text: t('rows.possessionNoticeReceived.label', { claimantName: validatedCase.claimantName }) },
      value: { text: t(`options.${noticeReceived}`) },
      actions: {
        items: [change('confirmation-of-notice-given', 'rows.possessionNoticeReceived.changeHidden')],
      },
    });
  }

  // Notice received date — same field for both "provided" and "not-provided" branches.
  // The change link routes to whichever step the user took, discriminated on the
  // claim's notice date (the same signal isNoticeDateProvided uses in flow.config).
  if (responses.noticeReceivedDate) {
    const noticeDateEditStep = validatedCase.noticeDate
      ? 'confirmation-of-notice-date-when-provided'
      : 'confirmation-of-notice-date-when-not-provided';
    rows.push({
      key: { text: t('rows.noticeReceivedDate.label', { claimantName: validatedCase.claimantName }) },
      value: { text: formatIsoDate(responses.noticeReceivedDate) },
      actions: {
        items: [change(noticeDateEditStep, 'rows.noticeReceivedDate.changeHidden')],
      },
    });
  }

  // Rent arrears amount confirmation (+ amount when disputing). rentArrearsAmount
  // is stored in pence — convert for display, like the counterclaim rows.
  if (responses.rentArrearsAmountConfirmation) {
    const confirmed = normalizeYesNoValue(responses.rentArrearsAmountConfirmation) === 'YES';
    const disputedAmount = !confirmed ? penceToPounds(responses.rentArrearsAmount) : undefined;
    const value = disputedAmount
      ? { html: escapeHtml(`${t('options.NO')} (£${disputedAmount})`) }
      : { text: yesNoNotSure(responses.rentArrearsAmountConfirmation) };
    rows.push({
      key: { text: t('rows.rentArrearsAmountConfirmation.label') },
      value,
      actions: { items: [change('rent-arrears-dispute', 'rows.rentArrearsAmountConfirmation.changeHidden')] },
    });
  }

  // Non-rent-arrears dispute — radio Y/N on its own row; YES adds a second row with the details
  if (responses.disputeClaim) {
    rows.push({
      key: { text: t('rows.disputeClaim.label') },
      value: { text: yesNoNotSure(responses.disputeClaim) },
      actions: { items: [change('non-rent-arrears-dispute', 'rows.disputeClaim.changeHidden')] },
    });
    if (normalizeYesNoValue(responses.disputeClaim) === 'YES' && responses.disputeClaimDetails?.trim()) {
      rows.push({
        key: { text: t('rows.disputeClaimDetails.label') },
        value: { html: escapeWithLineBreaks(String(responses.disputeClaimDetails).trim()) },
        actions: { items: [change('non-rent-arrears-dispute', 'rows.disputeClaimDetails.changeHidden')] },
      });
    }
  }

  // Counterclaim — Yes/No
  if (responses.makeCounterClaim) {
    rows.push({
      key: { text: t('rows.makeCounterClaim.label') },
      value: { text: yesNoNotSure(responses.makeCounterClaim) },
      actions: { items: [change('counter-claim', 'rows.makeCounterClaim.changeHidden')] },
    });
  }

  // Counterclaim details — only when YES
  if (normalizeYesNoValue(responses.makeCounterClaim) === 'YES' && responses.counterClaim) {
    const cc = responses.counterClaim;

    // What are you counterclaiming for?
    if (cc.claimType) {
      rows.push({
        key: { text: t('rows.counterClaimType.label') },
        value: { text: t(`rows.counterClaimType.options.${cc.claimType}`) },
        actions: {
          items: [change('counter-claim-what-are-you-claiming-for', 'rows.counterClaimType.changeHidden')],
        },
      });
    }

    // Specific sum — only when claiming for money (PAYMENT_OR_COMPENSATION or BOTH)
    const claimsMoney = cc.claimType === 'PAYMENT_OR_COMPENSATION' || cc.claimType === 'BOTH';
    if (claimsMoney && cc.isClaimAmountKnown) {
      const isClaimAmountKnown = normalizeYesNoValue(cc.isClaimAmountKnown);
      let amountText: string;
      if (isClaimAmountKnown === 'YES' && cc.claimAmount !== undefined) {
        const pounds = penceToPounds(cc.claimAmount);
        amountText = pounds ? `£${pounds}` : yesNoNotSure(cc.isClaimAmountKnown);
      } else if (isClaimAmountKnown === 'NO' && cc.estimatedMaxClaimAmount !== undefined) {
        const pounds = penceToPounds(cc.estimatedMaxClaimAmount);
        amountText = pounds
          ? `${t('rows.counterClaimAmount.estimatedMaxPrefix')} £${pounds}`
          : yesNoNotSure(cc.isClaimAmountKnown);
      } else {
        amountText = yesNoNotSure(cc.isClaimAmountKnown);
      }
      rows.push({
        key: { text: t('rows.counterClaimAmount.label') },
        value: { text: amountText },
        actions: { items: [change('counter-claim-specific-sum', 'rows.counterClaimAmount.changeHidden')] },
      });
    }
  }

  return rows;
}
