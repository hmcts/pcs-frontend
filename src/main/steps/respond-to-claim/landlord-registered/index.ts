import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { PossessionClaimResponse, YesNoNotSureValue } from '@services/ccdCaseData.model';

const STEP_NAME = 'landlord-registered';

export const step: StepDefinition = createFormStep({
  stepName: STEP_NAME,
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/landlordRegistered.njk`,
  translationKeys: {
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
