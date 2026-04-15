import { Request } from 'express';

import { FeeType } from '../../../interfaces/feeService.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

import { getFee } from '@services/feeLookupService';

export const step: StepDefinition = createFormStep({
  stepName: 'do-you-need-help-paying-the-fee',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/doYouNeedHelpPayingTheFee.njk`,
  fields: [
    {
      name: 'helpWithFeesNeeded',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--m',
      errorMessage: 'errors.needHelpPayingFee',
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
    itUsuallyCostsToApply: 'itUsuallyCostsToApply',
    youHaveAlreadyToldTheOtherParty: 'youHaveAlreadyToldTheOtherParty',
    theyDidNotAgreeToIt: 'theyDidNotAgreeToIt',
    youWillSeeTheFinalApplicationFee: 'youWillSeeTheFinalApplicationFee',
    youMayBeAbleToGetHelp: 'youMayBeAbleToGetHelp',
    areOnCertainBenefits: 'areOnCertainBenefits',
    haveLittleOrNoSavings: 'haveLittleOrNoSavings',
    haveLowIncome: 'haveLowIncome',
  },
  extendGetContent: async (_req: Request) => {
    const standardFeePromise = getFee(FeeType.genAppStandardFee);
    const maxFeePromise = getFee(FeeType.genAppMaxFee);
    const [standardFee, maxFee] = await Promise.all([standardFeePromise, maxFeePromise]);
    return {
      standardFee,
      maxFee,
    };
  },
});
