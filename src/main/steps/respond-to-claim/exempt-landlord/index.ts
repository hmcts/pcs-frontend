import type { Request } from 'express';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { YesNoNotSureValue } from '@services/ccdCase.interface';

const STEP_NAME = 'exempt-landlord';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: STEP_NAME,
  isAnswered: req => Boolean(req.res?.locals.validatedCase?.defendantResponses?.exemptLandlord),
  stepDir: __dirname,
  getInitialFormData: async (req: Request) => {
    // Pre-populate from the saved draft (CCD + draft merge). Option values are the
    // backend enum (YES/NO/NOT_SURE), so the stored value maps to the radio directly.
    const exemptLandlord = req.res?.locals.validatedCase?.defendantResponses?.exemptLandlord;
    return exemptLandlord ? { exemptLandlord } : {};
  },
  customTemplate: `${__dirname}/exemptLandlord.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    question: 'question',
    introParagraph1: 'introParagraph1',
    introParagraph2: 'introParagraph2',
    publicRegisterLinkText: 'publicRegisterLinkText',
  },
  fields: [
    {
      name: 'exemptLandlord',
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
    const exemptLandlord: YesNoNotSureValue | undefined = req.body?.exemptLandlord;

    if (exemptLandlord) {
      response.defendantResponses.exemptLandlord = exemptLandlord;
    } else {
      delete response.defendantResponses.exemptLandlord;
    }

    delete response.defendantResponses.landlordLicensed;

    await saveDraftDefendantResponse(req, response);
  },
});
