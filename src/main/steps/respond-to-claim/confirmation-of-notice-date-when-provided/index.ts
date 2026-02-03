import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'confirmation-of-notice-date-when-provided',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/confirmationOfNoticeDateWhenProvided.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    subTitle: 'subTitle',
    hintText: 'hintText',
    listItem1: 'listItem1',
    caption: 'caption',
    bulletPointLabel: 'bulletPointLabel',
    noticeDateHint: 'noticeDateHint',
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
        hint: 'noticeDateHint',
      },
    },
  ],
  extendGetContent: req => ({
    claimantName: req.session?.ccdCase?.data?.claimantName || 'Treetops Housing',

    //TODO: get noticeDate from CCD case - currently served from LaunchDarkly flag
    noticeDate: req.session.noticeDate ?? '',
  }),
});
