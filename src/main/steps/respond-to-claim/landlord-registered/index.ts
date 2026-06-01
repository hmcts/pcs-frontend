import type { Request } from 'express';

import { fromYesNoNotSureEnum, toYesNoNotSureEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

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
    const enumValue = toYesNoNotSureEnum(req.body?.landlordRegistered);

    if (enumValue) {
      response.defendantResponses.landlordRegistered = enumValue;
    } else {
      delete response.defendantResponses.landlordRegistered;
    }

    await saveDraftDefendantResponse(req, response);
  },
  getInitialFormData: async req => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const landlordRegistered = caseData?.possessionClaimResponse?.defendantResponses?.landlordRegistered;

    return {
      landlordRegistered: fromYesNoNotSureEnum(landlordRegistered),
    };
  },
});
