import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep(
  {
    stepName: 'confirmation-of-notice-date',
    journeyFolder: 'respondToClaim',
    stepDir: __dirname,
    flowConfig,
    translationKeys: {
      pageTitle: 'pageTitle',
      subTitle: 'subTitle',
      hintText: 'hintText',
      listItem1: 'listItem1',
      noticeDateHint: 'noticeDateHint',
      noticeDateLabel: 'noticeDateLabel',
    },
    fields: [
      {
        name: 'noticeDate',
        type: 'date',
        required: true,
        noFutureDate: true,
        legendClasses: 'govuk-fieldset__legend--m govuk-!-margin-bottom-9',
      },
    ],
    extendGetContent: req => ({
      claimantName: req.session?.ccdCase?.data?.claimantName || 'Treetops Housing',
      noticeDate: req.session?.ccdCase?.data?.noticeDate || '1st January 2025',
    }),
  },
  `${__dirname}/confirmationOfNoticeDate.njk`
);
