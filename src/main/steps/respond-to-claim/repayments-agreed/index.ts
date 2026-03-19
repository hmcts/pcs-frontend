import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'repayments-agreed',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  fields: [
    {
      name: 'confirmRepaymentsAgreed',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-visually-hidden',
      translationKey: {
        label: 'question',
      },
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            repaymentsAgreementInfo: {
              name: 'repaymentsAgreementInfo',
              type: 'character-count',
              maxLength: 500,
              required: true,
              errorMessage: 'errors.repaymentsAgreementInfo',
              characterCountMessageKey: 'textAreaHint',
              labelClasses: 'govuk-label--s govuk-!-font-weight-regular',
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
  extendGetContent: req => {
    const caseData = req.res?.locals?.validatedCase?.data as
      | { claimantName?: string; claimIssueDate?: string }
      | undefined;

    const claimantName = caseData?.claimantName || 'Treetops Housing';
    const claimIssueDate = caseData?.claimIssueDate || '20th May 2025';

    const t = getTranslationFunction(req, 'repayments-agreed', ['common']);

    return {
      claimantName,
      claimIssueDate,
      heading: t('question', { claimantName, claimIssueDate }),
    };
  },
});
