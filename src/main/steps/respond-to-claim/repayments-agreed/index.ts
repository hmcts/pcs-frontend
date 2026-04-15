import type { Request } from 'express';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

function mapRepaymentsAgreedToCcdValue(repaymentsAgreed: string | undefined): 'YES' | 'NO' | 'NOT_SURE' {
  if (repaymentsAgreed === 'yes') {
    return 'YES';
  }
  if (repaymentsAgreed === 'no') {
    return 'NO';
  }
  return 'NOT_SURE';
}

function mapCcdRepaymentPlanToFormValue(
  repaymentPlanAgreed: 'YES' | 'NO' | 'NOT_SURE' | null | undefined
): 'yes' | 'no' | 'imNotSure' | undefined {
  if (repaymentPlanAgreed === 'YES') {
    return 'yes';
  }
  if (repaymentPlanAgreed === 'NO') {
    return 'no';
  }
  if (repaymentPlanAgreed === 'NOT_SURE') {
    return 'imNotSure';
  }
  return undefined;
}

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
    const existingRepaymentDetails =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.paymentAgreement
        ?.repaymentAgreedDetails;

    let repaymentAgreedDetails: string | undefined;
    if (repaymentsAgreed === 'yes') {
      repaymentAgreedDetails = repaymentsForm['repaymentsAgreed.repaymentsAgreedDetails'] as string | undefined;
    } else if (existingRepaymentDetails) {
      repaymentAgreedDetails = '';
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        paymentAgreement: {
          repaymentPlanAgreed: mapRepaymentsAgreedToCcdValue(repaymentsAgreed),
          repaymentAgreedDetails,
        },
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    question: 'question',
  },
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data as
      | {
          possessionClaimResponse?: {
            defendantResponses?: {
              paymentAgreement?: {
                repaymentPlanAgreed?: 'YES' | 'NO' | 'NOT_SURE' | null;
                repaymentAgreedDetails?: string;
              };
            };
            paymentAgreement?: {
              repaymentPlanAgreed?: 'YES' | 'NO' | 'NOT_SURE' | null;
              repaymentAgreedDetails?: string;
            };
          };
        }
      | undefined;

    const pcr = caseData?.possessionClaimResponse;
    const paymentAgreement = pcr?.defendantResponses?.paymentAgreement ?? pcr?.paymentAgreement;
    const repaymentPlanAgreed = paymentAgreement?.repaymentPlanAgreed;
    const repaymentAgreedDetails = paymentAgreement?.repaymentAgreedDetails;

    const formValue = mapCcdRepaymentPlanToFormValue(repaymentPlanAgreed);

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
      translationKey: { label: 'question' },
      legendClasses: 'govuk-visually-hidden',
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
              labelClasses: 'govuk-label--s govuk-!-font-weight-bold',
              translationKey: {
                label: 'textAreaLabel',
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
});
