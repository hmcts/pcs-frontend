import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import type { PossessionClaimResponse, YesNoNotSureValue } from '@interfaces/ccdCaseData.model';
import type { StepDefinition } from '@interfaces/stepFormData.interface';
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
  getInitialFormData: req => {
    const landlordRegistered = req.res?.locals?.validatedCase?.defendantResponses?.landlordRegistered;
    if (landlordRegistered === 'YES' || landlordRegistered === 'NO' || landlordRegistered === 'NOT_SURE') {
      return { landlordRegistered };
    }

    return {};
  },
  beforeRedirect: async req => {
    const landlordRegistered: YesNoNotSureValue | undefined = req.body?.landlordRegistered;

    if (!landlordRegistered) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        landlordRegistered,
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
});
