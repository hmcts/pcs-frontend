import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { penceToPounds } from '../../utils';
import {
  type SummaryListRow,
  escapeWithLineBreaks,
  getValidatedCase,
  makeChange,
  makeYesNoNotSure,
} from '../section-cya/cyaRow';
import type { RespondToClaimSectionId } from '../sections.config';

const SECTION_ID: RespondToClaimSectionId = 'payments';

export function buildSectionCyaRows(req: Request, t: TFunction): SummaryListRow[] {
  const validatedCase = getValidatedCase(req);
  const caseRef = validatedCase?.id;
  if (!validatedCase || !caseRef) {
    return [];
  }

  const paymentAgreement = validatedCase.defendantResponses?.paymentAgreement ?? {};
  const change = makeChange(caseRef, SECTION_ID, t);
  const yesNoNotSure = makeYesNoNotSure(t);

  const rows: SummaryListRow[] = [];

  // Repayments made — radio Y/N on its own row; YES adds a second row with the details
  if (paymentAgreement.anyPaymentsMade) {
    rows.push({
      key: { text: t('rows.anyPaymentsMade.label') },
      value: { text: yesNoNotSure(paymentAgreement.anyPaymentsMade) },
      actions: { items: [change('repayments-made', 'rows.anyPaymentsMade.changeHidden')] },
    });
    if (paymentAgreement.anyPaymentsMade === 'YES' && paymentAgreement.paymentDetails?.trim()) {
      rows.push({
        key: { text: t('rows.paymentDetails.label') },
        value: { html: escapeWithLineBreaks(paymentAgreement.paymentDetails.trim()) },
        actions: { items: [change('repayments-made', 'rows.paymentDetails.changeHidden')] },
      });
    }
  }

  // Repayments agreed — radio Y/N/NotSure on its own row; YES adds a second row with the details
  if (paymentAgreement.repaymentPlanAgreed) {
    rows.push({
      key: { text: t('rows.repaymentPlanAgreed.label') },
      value: { text: yesNoNotSure(paymentAgreement.repaymentPlanAgreed) },
      actions: { items: [change('repayments-agreed', 'rows.repaymentPlanAgreed.changeHidden')] },
    });
    if (paymentAgreement.repaymentPlanAgreed === 'YES' && paymentAgreement.repaymentAgreedDetails?.trim()) {
      rows.push({
        key: { text: t('rows.repaymentAgreedDetails.label') },
        value: { html: escapeWithLineBreaks(paymentAgreement.repaymentAgreedDetails.trim()) },
        actions: { items: [change('repayments-agreed', 'rows.repaymentAgreedDetails.changeHidden')] },
      });
    }
  }

  // Instalment offer — Yes/No
  if (paymentAgreement.repayArrearsInstalments) {
    rows.push({
      key: { text: t('rows.repayArrearsInstalments.label') },
      value: { text: yesNoNotSure(paymentAgreement.repayArrearsInstalments) },
      actions: { items: [change('installment-payments', 'rows.repayArrearsInstalments.changeHidden')] },
    });
  }

  // How much can you afford — only shown when instalment offer YES
  if (paymentAgreement.repayArrearsInstalments === 'YES' && paymentAgreement.additionalRentContribution !== undefined) {
    const pounds = penceToPounds(paymentAgreement.additionalRentContribution);
    const frequency = paymentAgreement.additionalContributionFrequency;
    const amountText = pounds ? `£${pounds}` : '';
    const frequencyText = frequency ? t(`rows.affordToPay.frequencies.${frequency}`) : '';
    const valueText = [amountText, frequencyText].filter(Boolean).join(' ');
    rows.push({
      key: { text: t('rows.affordToPay.label') },
      value: { text: valueText },
      actions: { items: [change('how-much-afford-to-pay', 'rows.affordToPay.changeHidden')] },
    });
  }

  return rows;
}
