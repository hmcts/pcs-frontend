import type {
  CaseData,
  PaymentAgreement,
  PossessionClaimResponse,
  YesNoValue,
} from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { getClaimantName } from '../../utils/getClaimantName';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'repayments-made',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  fields: [
    {
      name: 'confirmRepaymentsMade',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--l',
      translationKey: {
        label: 'question',
      },
      options: [
        {
          value: 'Yes',
          translationKey: 'options.yes',
          subFields: {
            repaymentsInfo: {
              name: 'repaymentsInfo',
              type: 'character-count',
              maxLength: 500,
              required: true,
              errorMessage: 'errors.repaymentsInfo',
              labelClasses: 'govuk-label--s govuk-!-font-weight-bold',
              translationKey: {
                label: 'textAreaLabel',
              },
            },
          },
        },
        { value: 'No', translationKey: 'options.no' },
      ],
    },
  ],
  beforeRedirect: async req => {
    const confirmRepaymentsMade: YesNoValue | undefined = req.body?.confirmRepaymentsMade;
    if (!confirmRepaymentsMade) {
      return;
    }

    const paymentDetails: string | undefined =
      confirmRepaymentsMade === 'Yes' ? req.body?.['confirmRepaymentsMade.repaymentsInfo'] : undefined;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        paymentAgreement: {
          anyPaymentsMade: confirmRepaymentsMade,
          paymentDetails: paymentDetails ?? '',
        },
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const caseData: CaseData | undefined = req.res?.locals.validatedCase?.data;
    const paymentAgreement: PaymentAgreement | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.paymentAgreement;
    const confirmRepaymentsMade: YesNoValue | undefined = paymentAgreement?.anyPaymentsMade;
    if (!confirmRepaymentsMade) {
      return {};
    }

    if (confirmRepaymentsMade === 'Yes') {
      const repaymentsInfo: string | undefined = paymentAgreement?.paymentDetails;
      return {
        confirmRepaymentsMade: 'Yes',
        'confirmRepaymentsMade.repaymentsInfo': repaymentsInfo ?? '',
      };
    }
    return {
      confirmRepaymentsMade: 'No',
    };
  },
  extendGetContent: req => {
    const validatedCase = req.res?.locals?.validatedCase;
    const claimantName = getClaimantName(req);
    const claimIssueDate = validatedCase?.claimIssueDate || '16th June 2025';

    return {
      claimantName,
      claimIssueDate,
    };
  },
  customTemplate: `${__dirname}/repaymentsMade.njk`,
});
