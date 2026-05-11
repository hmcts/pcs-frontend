import type { Request } from 'express';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { caseNumberFormatter } from '../../utils/caseNumberFormatter';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { YesNoNotSureValue } from '@services/ccdCase.interface';

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
    heading: 'heading',
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
  extendGetContent: req => {
    const caseNumber = caseNumberFormatter(req.res?.locals?.validatedCase?.id as string);
    const t = getTranslationFunction(req, 'landlord-registered', ['common']);

    return {
      caseNumber: t('caseNumber', { caseNumber }),
    };
  },
});
