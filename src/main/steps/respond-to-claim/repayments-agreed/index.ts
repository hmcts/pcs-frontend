import type { Request } from 'express';

import { fromYesNoNotSureEnum, toYesNoNotSureEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'repayments-agreed',
  isAnswered: req => Boolean(req.res?.locals.validatedCase?.defendantResponses?.paymentAgreement?.repaymentPlanAgreed),
  showCancelButton: false,
  stepDir: __dirname,
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.paymentAgreement = response.defendantResponses.paymentAgreement ?? {};
    const repaymentsAgreed = req.body?.repaymentsAgreed as string | undefined;
    const enumValue = toYesNoNotSureEnum(repaymentsAgreed);

    if (enumValue) {
      response.defendantResponses.paymentAgreement.repaymentPlanAgreed = enumValue;

      if (repaymentsAgreed === 'yes') {
        response.defendantResponses.paymentAgreement.repaymentAgreedDetails = req.body?.[
          'repaymentsAgreed.repaymentsAgreedDetails'
        ] as string | undefined;
      } else {
        delete response.defendantResponses.paymentAgreement.repaymentAgreedDetails;
      }
    } else {
      delete response.defendantResponses.paymentAgreement.repaymentPlanAgreed;
      delete response.defendantResponses.paymentAgreement.repaymentAgreedDetails;
    }

    await saveDraftDefendantResponse(
      req,

      response
    );
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    question: 'question',
  },
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals.validatedCase?.data;
    const pcr = caseData?.possessionClaimResponse as
      | {
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
        }
      | undefined;
    // Defensive read: prefer nested defendantResponses.paymentAgreement (current shape),
    // fall back to flat pcr.paymentAgreement for legacy cases that may pre-date the move.
    const paymentAgreement = pcr?.defendantResponses?.paymentAgreement ?? pcr?.paymentAgreement;
    const repaymentPlanAgreed = paymentAgreement?.repaymentPlanAgreed;
    const repaymentAgreedDetails = paymentAgreement?.repaymentAgreedDetails;

    const formValue = fromYesNoNotSureEnum(repaymentPlanAgreed);

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
    const caseData = req.res?.locals.validatedCase?.data;
    const claimantName = (caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value as string) ?? '';
    const dateIssued = caseData?.dateIssued;

    return {
      claimantName,
      dateIssued,
    };
  },
  fields: [
    {
      name: 'repaymentsAgreed',
      type: 'radio',
      required: true,
      isPageHeading: true,
      translationKey: { label: 'question' },
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
              labelClasses: 'govuk-label--s govuk-!-font-weight-bold',
              translationKey: {
                label: 'textAreaLabel',
              },
            },
          },
        },
        { value: 'no', translationKey: 'options.no' },
        { divider: 'options.or' },
        { value: 'notSure', translationKey: 'options.imNotSure' },
      ],
    },
  ],
  customTemplate: `${__dirname}/repaymentsAgreed.njk`,
});
