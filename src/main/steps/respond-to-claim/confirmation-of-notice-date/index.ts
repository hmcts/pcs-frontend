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
      caption: 'caption',
      bulletPointLabel: 'bulletPointLabel',
      noticeDateHint1: 'noticeDateHint1',
      noticeDateHint2: 'noticeDateHint2',
      noticeDateLabel: 'noticeDateLabel',
    },
    fields: [
      {
        name: 'noticeDate',
        type: 'date',
        required: false,
        noFutureDate: true,
        legendClasses: 'govuk-fieldset__legend--m',
        translationKey: {
          label: 'noticeDateLabel',
          hint: 'noticeDateHint1',
        },
      },
    ],
    extendGetContent: req => ({
      claimantName: req.session?.ccdCase?.data?.claimantName || 'Treetops Housing',
      noticeDate: req.session?.ccdCase?.data?.noticeDate || '1st January 2025',
    }),
  },
  `${__dirname}/confirmationOfNoticeDate.njk`
);
