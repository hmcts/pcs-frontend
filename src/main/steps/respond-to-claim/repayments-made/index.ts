import { getClaimantName } from '../../utils/getClaimantName';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

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
      isPageHeading: true,
      legendClasses: 'govuk-fieldset__legend--l',
      translationKey: {
        label: 'question',
      },
      options: [
        {
          value: 'yes',
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
        { value: 'no', translationKey: 'options.no' },
      ],
    },
  ],
  getInitialFormData: () => {
    // Repayments answers are not currently exposed via validatedCase model getters.
    return {};
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
