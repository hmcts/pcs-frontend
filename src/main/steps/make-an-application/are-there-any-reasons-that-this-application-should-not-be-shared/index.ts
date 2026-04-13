import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'are-there-any-reasons-that-this-application-should-not-be-shared',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/anyReasonsApplicationShouldNotBeShared.njk`,
  fields: [
    {
      name: 'reasonsAppShouldNotBeShared',
      type: 'radio',
      required: true,
      translationKey: { label: 'mainQuestion' },
      errorMessage: 'errors.confirmIfThereIsAReason',
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            reasonForNotSharing: {
              name: 'reasonForNotSharing',
              type: 'character-count',
              required: true,
              maxLength: 6800,
              labelClasses: 'govuk-!-font-weight-bold',
              translationKey: {
                label: 'reasonForNotSharingQuestion',
              },
              errorMessage: 'errors.provideAReason',
            },
          },
        },
        {
          value: 'no',
          translationKey: 'options.no',
        },
      ],
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    warningHiddenText: 'warningHiddenText',
    weUsuallySendACopyOfYourApplication: 'weUsuallySendACopyOfYourApplication',
    inSomeExceptionalCircumstances: 'inSomeExceptionalCircumstances',
    forExampleIf: 'forExampleIf',
    itIsUrgent: 'itIsUrgent',
    couldUndermineTheOrder: 'couldUndermineTheOrder',
    youBelieveYouAreAtRisk: 'youBelieveYouAreAtRisk',
    weWillAskYouToProvideTheReason: 'weWillAskYouToProvideTheReason',
  },
});
