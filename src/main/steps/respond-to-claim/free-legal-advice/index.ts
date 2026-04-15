import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import type { PossessionClaimResponse } from '@interfaces/ccdCaseData.model';
import type { StepDefinition } from '@interfaces/stepFormData.interface';
import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'free-legal-advice',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/freeLegalAdvice.njk`,
  beforeRedirect: async req => {
    const hadLegalAdvice = req.body?.hadLegalAdvice as string | undefined;

    if (!hadLegalAdvice) {
      return;
    }

    const enumMapping: Record<string, string> = {
      yes: 'YES',
      no: 'NO',
      preferNotToSay: 'PREFER_NOT_TO_SAY',
    };

    const ccdValue = enumMapping[hadLegalAdvice];

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        freeLegalAdvice: ccdValue,
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    subHeading1: 'subHeading1',
    paragraph1: 'paragraph1',
    listItem1: 'listItem1',
    listItem2: 'listItem2',
    listItem3: 'listItem3',
    listItem4: 'listItem4',
    paragraph2: 'paragraph2',
    bullet1: 'bullet1',
    bullet2: 'bullet2',
    subHeading2: 'subHeading2',
    paragraph3: 'paragraph3',
    paragraph4: 'paragraph4',
  },
  getInitialFormData: req => {
    const { defendantResponsesFreeLegalAdvice: existingAnswer } = req.res?.locals?.validatedCase ?? {
      defendantResponsesFreeLegalAdvice: undefined,
    };

    // Map CCD enum to frontend value
    const formValue =
      existingAnswer === 'YES'
        ? 'yes'
        : existingAnswer === 'NO'
          ? 'no'
          : existingAnswer === 'PREFER_NOT_TO_SAY'
            ? 'preferNotToSay'
            : undefined;

    return formValue ? { hadLegalAdvice: formValue } : {};
  },
  fields: [
    {
      name: 'hadLegalAdvice',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: {
        label: 'question',
      },
      options: [
        { value: 'yes', translationKey: 'options.yes' },
        { value: 'no', translationKey: 'options.no' },
        { divider: 'options.or' },
        { value: 'preferNotToSay', translationKey: 'options.preferNotToSay' },
      ],
    },
  ],
});
