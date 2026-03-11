import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'repayments-agreed',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'question',
    question: 'question',
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
              labelClasses: 'govuk-label--s govuk-!-font-weight-bold',
              translationKey: {
                label: 'textAreaLabel',
                hint: 'textAreaHint',
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

    return {
      claimantName: caseData?.claimantName || 'Treetops Housing',
      claimIssueDate: caseData?.claimIssueDate || '20th May 2025',
    };
  },
});
