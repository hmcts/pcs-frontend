import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'confirmation-of-notice-given',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/confirmationOfNoticeGiven.njk`,
  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
    question: 'question',
    hintText: 'hintText',
  },
  fields: [
    {
      name: 'confirmNoticeGiven',
      type: 'radio',
      required: true,
      translationKey: { label: 'question', hint: 'hintText' },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        { value: 'yes', translationKey: 'options.yes' },
        { value: 'no', translationKey: 'options.no' },
        { divider: 'options.or' },
        { value: 'imNotSure', translationKey: 'options.imNotSure' },
      ],
    },
  ],
  extendGetContent: req => {
    // Read from CCD (fresh data from START callback via res.locals.validatedCase)
    // Same pattern as free-legal-advice - no session dependency
    const caseData = req.res?.locals.validatedCase?.data;
    const claimantName = caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value as string | undefined;

    return {
      claimantName,
    };
  },
});
