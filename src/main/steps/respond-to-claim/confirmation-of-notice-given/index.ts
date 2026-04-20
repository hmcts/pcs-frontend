import type { Request } from 'express';

import { saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { getClaimantName } from '../../utils/getClaimantName';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData, PossessionClaimResponse, YesNoNotSureValue } from '@services/ccdCase.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'confirmation-of-notice-given',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/confirmationOfNoticeGiven.njk`,
  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
    question: 'question',
    hintText: 'hintText',
  },
  fields: [
    {
      name: 'possessionNoticeReceived',
      type: 'radio',
      required: true,
      translationKey: { label: 'question', hint: 'hintText' },
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
    const caseData: CaseData | undefined = req.res?.locals.validatedCase?.data;
    const possessionNoticeReceived: YesNoNotSureValue | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.possessionNoticeReceived;

    return possessionNoticeReceived ? { possessionNoticeReceived } : {};
  },
  beforeRedirect: async (req: Request) => {
    const possessionNoticeReceived: YesNoNotSureValue | undefined = req.body?.possessionNoticeReceived;

    if (!possessionNoticeReceived) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        possessionNoticeReceived,
      },
    };

    await saveDraftDefendantResponse(req, possessionClaimResponse);
  },
  extendGetContent: req => {
    const claimantName = getClaimantName(req);

    return {
      claimantName,
    };
  },
});
