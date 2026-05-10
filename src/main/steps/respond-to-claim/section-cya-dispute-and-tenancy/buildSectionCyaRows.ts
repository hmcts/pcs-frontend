import escapeHtml from 'escape-html';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import type { CcdCaseModel } from '@services/ccdCaseData.model';

const SECTION_ID = 'disputeAndTenancy';

export type SummaryListRow = {
  key: { text: string };
  value: { text?: string; html?: string };
  actions: { items: { href: string; text: string; visuallyHiddenText: string }[] };
};

function formatIsoDate(iso?: string): string {
  if (!iso) {
    return '';
  }
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) {
    return iso;
  }
  return `${parseInt(day, 10)} ${parseInt(month, 10)} ${year}`;
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

  // Non-rent-arrears dispute
  if (responses.disputeClaim) {
    const value = responses.disputeClaimDetails
      ? { html: escapeHtml(String(responses.disputeClaimDetails).trim()) }
      : { text: t(`options.${responses.disputeClaim}`) };
    rows.push({
      key: { text: t('rows.disputeClaim.label') },
      value,
      actions: { items: [change('non-rent-arrears-dispute', 'rows.disputeClaim.changeHidden')] },
    });
  }

  return rows;
}
