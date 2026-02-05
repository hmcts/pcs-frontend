import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'confirmation-of-notice-date-when-not-provided',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/confirmationOfNoticeDateWhenNotProvided.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    subTitle: 'subTitle',
    caption: 'caption',
    noticeDateHint2: 'noticeDateHint',
    noticeDateLabel: 'noticeDateLabel',
    paragraph: 'paragraph',
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
    //TODO need to add logic to check if claimantName name is known from CCD case data
    claimantName: req.session?.ccdCase?.data?.claimantName || 'Treetops Housing',
  }),
});
