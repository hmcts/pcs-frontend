import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'repayments-made',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  translationKeys: {
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
  extendGetContent: req => ({
    // TODO:Retrieve claimantName/claimIssueDate dynamically from CCD case data and remove hardcoded default value
    claimantName: req.session?.ccdCase?.data?.claimantName || 'Treetops Housing',
    claimIssueDate: req.session?.ccdCase?.data?.claimIssueDate || '16th June 2025',
  }),
  customTemplate: `${__dirname}/repaymentsMade.njk`,
});
