import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { PossessionClaimResponse, YesNoNotSureValue } from '@services/ccdCaseData.model';
import { caseNumberFormatter } from '../../utils/caseNumberFormatter';

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
    heading: 'heading'
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
    extendGetContent: req => {
    const caseNumber = caseNumberFormatter(req.res?.locals?.validatedCase?.id as string);
    const t = getTranslationFunction(req, 'landlord-registered', ['common']);

    return {
      caseNumber: t('caseNumber', { caseNumber }),
    };
  },
});
