import { normalizeYesNoValue } from '../../utils';
import { getClaimantName } from '../../utils/getClaimantName';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { PossessionClaimResponse, YesNoValue } from '@services/ccdCase.interface';

function repayArrearsInstalmentsFromConfirmOffer(value: string | undefined): YesNoValue | undefined {
  if (value === 'yes') {
    return 'YES';
  }
  if (value === 'no') {
    return 'NO';
  }
  return undefined;
}

export const step: StepDefinition = createFormStep({
  stepName: 'installment-payments',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/instalmentOffer.njk`,
  beforeRedirect: async req => {
    const repayArrearsInstalments = repayArrearsInstalmentsFromConfirmOffer(
      req.body?.confirmInstallmentOffer as string | undefined
    );
    if (repayArrearsInstalments === undefined) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        paymentAgreement: { repayArrearsInstalments },
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const caseData = req.res?.locals?.validatedCase?.data as
      | {
          possessionClaimResponse?: {
            defendantResponses?: { paymentAgreement?: { repayArrearsInstalments?: YesNoValue } };
          };
        }
      | undefined;

    const stored = caseData?.possessionClaimResponse?.defendantResponses?.paymentAgreement?.repayArrearsInstalments;
    const normalizedStored = normalizeYesNoValue(stored);

    if (normalizedStored === 'YES') {
      return { confirmInstallmentOffer: 'yes' };
    }
    if (normalizedStored === 'NO') {
      return { confirmInstallmentOffer: 'no' };
    }

    return {};
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    paragraph2: 'paragraph2',
    paragraph3: 'paragraph3',
    paragraph4: 'paragraph4',
    question: 'question',
  },
  fields: [
    {
      name: 'confirmInstallmentOffer',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: 'question' },
      options: [
        { value: 'yes', translationKey: 'options.yes' },
        { value: 'no', translationKey: 'options.no' },
      ],
    },
  ],
  extendGetContent: req => {
    const claimantName = getClaimantName(req);
    const t = getTranslationFunction(req, 'installment-payments', ['common']);

    return {
      paragraph1: t('paragraph1', { claimantName }),
    };
  },
});
