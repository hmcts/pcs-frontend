import type { Request } from 'express';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { emptyPaymentAgreement } from '../../utils/ccdObjectTemplates';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'repayments-agreed',
  journeyFolder: 'respondToClaim',
  showCancelButton: false,
  stepDir: __dirname,
  flowConfig,
  beforeRedirect: async req => {
    const repaymentsForm = req.body as Record<string, unknown>;
    const repaymentsAgreed = repaymentsForm.repaymentsAgreed as string | undefined;

    if (!repaymentsForm) {
      return;
    }

    const repaymentAgreedDetails =
      repaymentsAgreed === 'yes'
        ? ((repaymentsForm['repaymentsAgreed.repaymentsAgreedDetails'] as string | undefined) ?? null)
        : null;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        paymentAgreement: {
          ...emptyPaymentAgreement,
          repaymentPlanAgreed: repaymentsAgreed === 'yes' ? 'YES' : repaymentsAgreed === 'no' ? 'NO' : 'NOT_SURE',
          repaymentAgreedDetails,
        },
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const paymentAgreement = caseData?.possessionClaimResponse?.defendantResponses?.paymentAgreement;
    const repaymentPlanAgreed = paymentAgreement?.repaymentPlanAgreed;
    const repaymentAgreedDetails = paymentAgreement?.repaymentAgreedDetails;

    const formValue =
      repaymentPlanAgreed === 'YES'
        ? 'yes'
        : repaymentPlanAgreed === 'NO'
          ? 'no'
          : repaymentPlanAgreed === 'NOT_SURE'
            ? 'imNotSure'
            : undefined;

    if (formValue === undefined) {
      return {};
    }

    const initial: Record<string, unknown> = { repaymentsAgreed: formValue };

    if (formValue === 'yes' && repaymentAgreedDetails) {
      initial['repaymentsAgreed.repaymentsAgreedDetails'] = repaymentAgreedDetails;
    }

    return initial;
  },
  extendGetContent: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const claimantName = (caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value as string) ?? '';
    const claimIssueDate = '20th May 2025';

    return {
      claimantName,
      claimIssueDate,
    };
  },
  fields: [
    {
      name: 'repaymentsAgreed',
      type: 'radio',
      required: true,
      isPageHeading: true,
      translationKey: { label: 'heading' },
      legendClasses: 'govuk-fieldset__legend--l',
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            repaymentsAgreedDetails: {
              name: 'repaymentsAgreedDetails',
              type: 'character-count',
              maxLength: 500,
              required: true,
              isPageHeading: false,
              labelClasses: 'govuk-label--s govuk-!-font-weight-bold',
              translationKey: {
                label: 'textAreaLabel',
              },
              validator: (value: unknown) => {
                const text = (value as string)?.trim();
                const allowedCharsRegex = /^[^\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u;

                if (allowedCharsRegex.test(text)) {
                  return true;
                }
                return 'errors.repaymentsAgreed.repaymentsAgreedDetails.invalid';
              },
            },
          },
        },
        { value: 'no', translationKey: 'options.no' },
        { divider: 'options.or' },
        { value: 'imNotSure', translationKey: 'options.imNotSure' },
      ],
    },
  ],
  customTemplate: `${__dirname}/repaymentsAgreed.njk`,
});
