import type { Request } from 'express';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { YesNoNotSureValue } from '@services/ccdCase.interface';

const STEP_NAME = 'landlord-registered';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: STEP_NAME,
  stepDir: __dirname,
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
  beforeRedirect: async (req: Request) => {
    const response = buildDraftDefendantResponse(req);
    const landlordRegistered: YesNoNotSureValue | undefined = req.body?.landlordRegistered;

    if (landlordRegistered) {
      response.defendantResponses.landlordRegistered = landlordRegistered;
    } else {
      delete response.defendantResponses.landlordRegistered;
    }

    await saveDraftDefendantResponse(
      req,

      response
    );
  },
  getInitialFormData: async req => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const landlordRegistered = caseData?.possessionClaimResponse?.defendantResponses?.landlordRegistered as
      | string
      | undefined;

    return {
      landlordRegistered,
    };
  },
});
