import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatIsoDate, penceToPounds } from '../../utils';

import type { CcdCaseModel } from '@services/ccdCaseData.model';

const SECTION_ID = 'disputeAndTenancy';

export type SummaryListRow = {
  key: { text: string };
  value: { text?: string; html?: string };
  actions: { items: { href: string; text: string; visuallyHiddenText: string }[] };
};

// GDS pattern (matches make-an-application/check-your-answers): preserve newlines
// in user-entered free text by converting \n to <br> after HTML-escaping.
function escapeWithLineBreaks(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const validatedCase = req.res?.locals.validatedCase as CcdCaseModel | undefined;
  const caseRef = validatedCase?.id;
  if (!validatedCase || !caseRef) {
    return [];
  }

  // Trust the Normaliser: every field present here is reachable in the
  // current state. The CYA enumerates rows with a presence check only.
  const responses = validatedCase.defendantResponses ?? {};

  const change = (stepSlug: string, hiddenKey: string) => ({
    href: `/case/${caseRef}/respond-to-claim/${stepSlug}?edit=${SECTION_ID}`,
    text: t('change'),
    visuallyHiddenText: t(hiddenKey),
  });

  const yesNoNotSure = (value: string): string => t(`options.${value}`);

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

  // Tenancy type
  if (responses.tenancyTypeCorrect) {
    rows.push({
      key: { text: t('rows.tenancyTypeCorrect.label') },
      value: { text: yesNoNotSure(responses.tenancyTypeCorrect) },
      actions: { items: [change('tenancy-type-details', 'rows.tenancyTypeCorrect.changeHidden')] },
    });
  }

  // Tenancy start date — ONE row covers both date-details and date-unknown branches.
  // Change link points to whichever the user took (inferred from the data shape).
  const tenancyDate = validatedCase.defendantResponsesTenancyStartDate;
  if (tenancyDate) {
    const dateKnown = !!validatedCase.defendantResponsesTenancyStartDateCorrect;
    const editStep = dateKnown ? 'tenancy-date-details' : 'tenancy-date-unknown';
    rows.push({
      key: { text: t('rows.tenancyStartDate.label') },
      value: { text: formatIsoDate(tenancyDate) },
      actions: { items: [change(editStep, 'rows.tenancyStartDate.changeHidden')] },
    });
  }

  // Notice given
  const noticeReceived = validatedCase.defendantResponsesPossessionNoticeReceived;
  if (noticeReceived) {
    rows.push({
      key: { text: t('rows.possessionNoticeReceived.label') },
      value: { text: t(`options.${noticeReceived}`) },
      actions: {
        items: [change('confirmation-of-notice-given', 'rows.possessionNoticeReceived.changeHidden')],
      },
    });
  }

  // Notice received date — same field for both "provided" and "not-provided" branches.
  // Change link defaults to the "provided" page (most common); the "not-provided"
  // page reads the same field anyway.
  if (responses.noticeReceivedDate) {
    rows.push({
      key: { text: t('rows.noticeReceivedDate.label') },
      value: { text: formatIsoDate(responses.noticeReceivedDate) },
      actions: {
        items: [change('confirmation-of-notice-date-when-provided', 'rows.noticeReceivedDate.changeHidden')],
      },
    });
  }

  // Rent arrears amount confirmation (+ amount when disputing)
  if (responses.rentArrearsAmountConfirmation) {
    const confirmed = responses.rentArrearsAmountConfirmation === 'YES';
    const value =
      !confirmed && responses.rentArrearsAmount
        ? { html: escapeHtml(`${t('options.NO')} (${responses.rentArrearsAmount})`) }
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
      value: { text: t(`options.${responses.disputeClaim}`) },
      actions: { items: [change('non-rent-arrears-dispute', 'rows.disputeClaim.changeHidden')] },
    });
    if (responses.disputeClaim === 'YES' && responses.disputeClaimDetails?.trim()) {
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
  if (responses.makeCounterClaim === 'YES' && responses.counterClaim) {
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
      let amountText: string;
      if (cc.isClaimAmountKnown === 'YES' && cc.claimAmount !== undefined) {
        const pounds = penceToPounds(cc.claimAmount);
        amountText = pounds ? `£${pounds}` : yesNoNotSure(cc.isClaimAmountKnown);
      } else if (cc.isClaimAmountKnown === 'NO' && cc.estimatedMaxClaimAmount !== undefined) {
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
