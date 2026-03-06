import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { getClaimantName } from '../../utils';
import { flowConfig } from '../flow.config';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';

export const step: StepDefinition = createFormStep({
  stepName: 'repayments-agreed',
  journeyFolder: 'respondToClaim',
  showCancelButton: false,
  stepDir: __dirname,
  flowConfig,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    question: 'question',
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
            repaymentsAgreedInfo: {
              name: 'repaymentsAgreedDetails',
              type: 'character-count',
              maxLength: 500,
              required: true,
              labelClasses: 'govuk-label--s govuk-!-font-weight-bold',
              translationKey: {
                label: 'textAreaLabel',
              },
              validator: (value: unknown) => {
                const text = (value as string)?.trim();
                const allowedCharsRegex = /^[A-Za-z\s\-']+$/;

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
  extendGetContent: req => ({
    claimantName: getClaimantName(req),
    claimIssueDate: "20th May 2025",
  }),
beforeRedirect: async req => {
    const repaymentsForm = req.session.formData?.['repayments-agreed'];
    if (!repaymentsForm) {
      return;
    }
   const existingRepaymentsDetails =
        req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.repaymentsAgreedDetails

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
      repaymentsAgreed: repaymentsForm.repaymentsAgreed === 'yes'
        ? 'YES'
        : repaymentsForm.repaymentsAgreed === 'no'
          ? 'NO'
          : 'NOT_SURE',
        repaymentsAgreedDetails: repaymentsForm.repaymentsAgreed === 'yes'
                                               ? repaymentsForm['repaymentsAgreedInfo.repaymentsAgreedDetails']
                                               : existingRepaymentsDetails
                                                 ? ''
                                                 : undefined,
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
});

