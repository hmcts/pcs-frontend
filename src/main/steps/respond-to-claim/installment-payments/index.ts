import { normalizeYesNoValue } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { getClaimantName } from '../../utils/getClaimantName';
import { createRespondToClaimFormStep } from '../formStep';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { YesNoValue } from '@services/ccdCase.interface';

function repayArrearsInstalmentsFromConfirmOffer(value: string | undefined): YesNoValue | undefined {
  if (value === 'yes') {
    return 'YES';
  }
  if (value === 'no') {
    return 'NO';
  }
  return undefined;
}

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'installment-payments',
  stepDir: __dirname,
  customTemplate: `${__dirname}/instalmentOffer.njk`,
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.paymentAgreement = response.defendantResponses.paymentAgreement ?? {};
    const repayArrearsInstalments = repayArrearsInstalmentsFromConfirmOffer(
      req.body?.confirmInstallmentOffer as string | undefined
    );

    if (repayArrearsInstalments) {
      response.defendantResponses.paymentAgreement.repayArrearsInstalments = repayArrearsInstalments;
    } else {
      delete response.defendantResponses.paymentAgreement.repayArrearsInstalments;
    }

    await saveDraftDefendantResponse(req, response);
  },
  getInitialFormData: req => {
    const stored =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.paymentAgreement
        ?.repayArrearsInstalments;
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
