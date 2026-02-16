import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
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
    question: 'question',
    paragraph: 'paragraph',
  },
  fields: [
    {
      name: 'noticeDate',
      type: 'date',
      required: false,
      noFutureDate: true,
      noCurrentDate: false,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: {
        label: 'question',
        hint: 'noticeDateHint',
      },
    },
  ],
  extendGetContent: req => {
    //TODO: get claimantName from CCD case - currently hardcoded
    const claimantName = req.session?.ccdCase?.data?.claimantName || 'Treetops Housing';

    const t = getTranslationFunction(req, 'confirmation-of-notice-date-when-not-provided', ['common']);

    const paragraph = t('paragraph', { returnObjects: true, claimantName });

    return {
      claimantName,
      paragraph,
    };
  },
});
