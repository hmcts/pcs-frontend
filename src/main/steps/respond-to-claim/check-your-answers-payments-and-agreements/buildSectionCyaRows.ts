import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatIsoDate, penceToPounds } from '../../utils';
import {
  type BaseRowContext,
  type SummaryListRow,
  createRowContext,
  escapeWithLineBreaks,
  groupQuestionAndDetail,
  isYes,
  pushYesNoRow,
} from '../section-cya/cyaRow';
import type { RespondToClaimSectionId } from '../sections.config';

import type { PaymentAgreement } from '@services/ccdCase.interface';

const SECTION_ID: RespondToClaimSectionId = 'payments';

interface RowContext extends BaseRowContext {
  paymentAgreement: PaymentAgreement;
  claimantName: string;
  claimIssueDate: string;
}

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const base = createRowContext(req, SECTION_ID, t);
  if (!base) {
    return [];
  }

  const { validatedCase } = base;
  const ctx: RowContext = {
    ...base,
    paymentAgreement: validatedCase.defendantResponses?.paymentAgreement ?? {},
    claimantName: validatedCase.claimantName ?? '',
    claimIssueDate: validatedCase.claimIssueDate ? formatIsoDate(validatedCase.claimIssueDate) : '',
  };

  addAnyPaymentsMadeRows(ctx);
  addRepaymentPlanAgreedRows(ctx);
  addRepayArrearsInstalmentsRow(ctx);
  addAffordToPayRow(ctx);

  return ctx.rows;
}

function addAnyPaymentsMadeRows({
  rows,
  paymentAgreement,
  claimantName,
  claimIssueDate,
  t,
  change,
  yesNoNotSure,
}: RowContext): void {
  if (!paymentAgreement.anyPaymentsMade) {
    return;
  }
  const questionRow: SummaryListRow = {
    key: { text: t('rows.anyPaymentsMade.label', { claimantName, claimIssueDate }) },
    value: { text: yesNoNotSure(paymentAgreement.anyPaymentsMade) },
    actions: { items: [change('repayments-made', 'rows.anyPaymentsMade.changeHidden')] },
  };
  rows.push(questionRow);

  const details = paymentAgreement.paymentDetails?.trim();
  if (!isYes(paymentAgreement.anyPaymentsMade) || !details) {
    return;
  }
  const detailRow: SummaryListRow = {
    key: { text: t('rows.paymentDetails.label') },
    value: { html: escapeWithLineBreaks(details) },
    actions: { items: [change('repayments-made', 'rows.paymentDetails.changeHidden')] },
  };
  groupQuestionAndDetail(questionRow, detailRow);
  rows.push(detailRow);
}

function addRepaymentPlanAgreedRows({
  rows,
  paymentAgreement,
  claimantName,
  claimIssueDate,
  t,
  change,
  yesNoNotSure,
}: RowContext): void {
  if (!paymentAgreement.repaymentPlanAgreed) {
    return;
  }
  const questionRow: SummaryListRow = {
    key: { text: t('rows.repaymentPlanAgreed.label', { claimantName, claimIssueDate }) },
    value: { text: yesNoNotSure(paymentAgreement.repaymentPlanAgreed) },
    actions: { items: [change('repayments-agreed', 'rows.repaymentPlanAgreed.changeHidden')] },
  };
  rows.push(questionRow);

  const details = paymentAgreement.repaymentAgreedDetails?.trim();
  if (!isYes(paymentAgreement.repaymentPlanAgreed) || !details) {
    return;
  }
  const detailRow: SummaryListRow = {
    key: { text: t('rows.repaymentAgreedDetails.label') },
    value: { html: escapeWithLineBreaks(details) },
    actions: { items: [change('repayments-agreed', 'rows.repaymentAgreedDetails.changeHidden')] },
  };
  groupQuestionAndDetail(questionRow, detailRow);
  rows.push(detailRow);
}

function addRepayArrearsInstalmentsRow({ rows, paymentAgreement, t, change, yesNoNotSure }: RowContext): void {
  if (!paymentAgreement.repayArrearsInstalments) {
    return;
  }
  pushYesNoRow(
    rows,
    'rows.repayArrearsInstalments',
    paymentAgreement.repayArrearsInstalments,
    'installment-payments',
    t,
    yesNoNotSure,
    change
  );
}

function addAffordToPayRow({ rows, paymentAgreement, t, change }: RowContext): void {
  if (!isYes(paymentAgreement.repayArrearsInstalments) || paymentAgreement.additionalRentContribution === undefined) {
    return;
  }
  const pounds = penceToPounds(paymentAgreement.additionalRentContribution);
  const frequency = paymentAgreement.additionalContributionFrequency;
  const amountText = pounds ? `£${pounds}` : '';
  const frequencyText = frequency ? t(`rows.affordToPay.frequencies.${frequency}`) : '';
  rows.push({
    key: { text: t('rows.affordToPay.label') },
    value: { text: [amountText, frequencyText].filter(Boolean).join(' ') },
    actions: { items: [change('how-much-afford-to-pay', 'rows.affordToPay.changeHidden')] },
  });
}
