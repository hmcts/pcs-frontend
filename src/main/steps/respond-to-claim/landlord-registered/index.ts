import type { Request } from 'express';

import type { PossessionClaimResponse, YesNoNotSureValue } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

const STEP_NAME = 'landlord-registered';

export const step: StepDefinition = createFormStep({
  stepName: STEP_NAME,
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/landlordRegistered.njk`,
  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
    question: 'question',
    publicRegisterLinkText: 'publicRegisterLinkText',
    introText: 'introText',
  },
  fields: [
    {
      name: 'registeredLandlord',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'question',
      },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        { value: 'YES', translationKey: 'options.yes' },
        { value: 'NO', translationKey: 'options.no' },
        { divider: 'options.or' },
        { value: 'NOT_SURE', translationKey: 'options.imNotSure' },
      ],
    },
  ],
  beforeRedirect: async (req: Request) => {
    const registeredLandlord: YesNoNotSureValue | undefined = req.body?.registeredLandlord;

    if (!registeredLandlord) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        registeredLandlord,
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
});
