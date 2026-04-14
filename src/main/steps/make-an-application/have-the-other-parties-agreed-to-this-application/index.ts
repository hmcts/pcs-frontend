import { Request } from 'express';

import { FeeType } from '../../../interfaces/feeService.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

import { getFee } from '@services/feeLookupService';

export const step: StepDefinition = createFormStep({
  stepName: 'have-the-other-parties-agreed-to-this-application',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/haveTheOtherPartiesAgreedToThisApplication.njk`,
  fields: [
    {
      name: 'otherPartiesAgreed',
      type: 'radio',
      required: true,
      translationKey: { label: 'question', hint: 'hint' },
      errorMessage: 'errors.confirmWhetherOtherPartiesHaveAgreed',
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
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
    theOtherPartyIsTheOtherSide: 'theOtherPartyIsTheOtherSide',
    everyOtherPartyWillNeedToAgree: 'everyOtherPartyWillNeedToAgree',
    ifTheOtherPartiesDoNotAgree: 'ifTheOtherPartiesDoNotAgree',
    feeWillIncreaseIf: 'feeWillIncreaseIf',
    youHaveAlreadyToldTheOtherParty: 'youHaveAlreadyToldTheOtherParty',
    theyDidNotAgreeToIt: 'theyDidNotAgreeToIt',
    youWillSeeTheFinalApplicationFee: 'youWillSeeTheFinalApplicationFee',
    whatYouNeedToDo: 'whatYouNeedToDo',
    youWillNeedToUploadEvidence: 'youWillNeedToUploadEvidence',
    youHaveToldTheOtherParties: 'youHaveToldTheOtherParties',
    theyAgreedToIt: 'theyAgreedToIt',
    forExampleACopyOfALetter: 'forExampleACopyOfALetter',
    ifYouAreNotAbleToContactOtherParties: 'ifYouAreNotAbleToContactOtherParties',
  },
  extendGetContent: async (_req: Request) => {
    const maxFee = await getFee(FeeType.genAppMaxFee);
    return {
      maxFee,
    };
  },
});
