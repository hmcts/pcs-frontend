import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
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
    question: 'question',
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
    // Read from CCD (fresh data from START callback via res.locals.validatedCase)
    // Same pattern as free-legal-advice - no session dependency
    const caseData = req.res?.locals.validatedCase?.data;
    const claimantName = caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value as string | undefined;
    const noticeDate = caseData?.notice_NoticeHandedOverDateTime ?? '';

    const t = getTranslationFunction(req, 'confirmation-of-notice-date-when-provided', ['common']);

    const bulletPointLabel = t('bulletPointLabel', { returnObjects: true, claimantName });
    const hintText = t('hintText', { returnObjects: true, claimantName });
    const listItem1 = t('listItem1', { returnObjects: true, noticeDate });

    return {
      claimantName,
      noticeDate,
      bulletPointLabel,
      hintText,
      listItem1,
    };
  },
});
