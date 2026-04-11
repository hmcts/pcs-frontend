import type { Request } from 'express';

import type { YesNoNotSureValue } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { getDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/populateResponseToClaimPayloadmap';
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
      name: 'landlordRegistered',
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
    const response = getDraftDefendantResponse(req);
    const landlordRegistered: YesNoNotSureValue | undefined = req.body?.landlordRegistered;

    if (landlordRegistered) {
      response.defendantResponses.landlordRegistered = landlordRegistered;
    } else {
      delete response.defendantResponses.landlordRegistered;
    }

    await saveDraftDefendantResponse(req, response);
  },
});
