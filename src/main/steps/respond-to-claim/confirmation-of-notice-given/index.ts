import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import type { PossessionClaimResponse } from '@interfaces/ccdCase.interface';
import type { StepDefinition } from '@interfaces/stepFormData.interface';
import { createFormStep } from '@modules/steps';

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
  beforeRedirect: async req => {
    const confirmNoticeGiven = req.body?.confirmNoticeGiven as string | undefined;

    if (!confirmNoticeGiven) {
      return;
    }

    const enumMapping: Record<string, string> = {
      yes: 'YES',
      no: 'NO',
      imNotSure: 'NOT_SURE',
    };

    const ccdValue = enumMapping[confirmNoticeGiven];
    if (!ccdValue) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        confirmNoticeGiven: ccdValue,
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const existingAnswer = req.res?.locals?.validatedCase?.defendantResponsesConfirmNoticeGiven as string | undefined;

    return existingAnswer ? { confirmNoticeGiven: existingAnswer } : {};
  },
  fields: [
    {
      name: 'confirmNoticeGiven',
      type: 'radio',
      required: true,
      translationKey: { label: 'question', hint: 'hintText' },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        { value: 'yes', translationKey: 'options.yes' },
        { value: 'no', translationKey: 'options.no' },
        { divider: 'options.or' },
        { value: 'imNotSure', translationKey: 'options.imNotSure' },
      ],
    },
  ],
  extendGetContent: req => {
    const { claimantName } = req.res?.locals?.validatedCase ?? { claimantName: 'Treetops Housing' };
    return {
      claimantName,
    };
  },
});
