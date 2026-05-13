import { fromYesNoNotSureEnum, toYesNoNotSureEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { caseNumberFormatter } from '../../utils/caseNumberFormatter';
import { createRespondToClaimFormStep } from '../formStep';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'landlord-licensed',
  stepDir: __dirname,
  customTemplate: `${__dirname}/landlordLicensed.njk`,
  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
    question: 'question',
    paragraph: 'paragraph',
    landlordQuestion: 'landlordQuestion',
    heading: 'heading',
  },
  fields: [
    {
      name: 'confirmLandlordLicensed',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        { value: 'yes', translationKey: 'options.yes' },
        { value: 'no', translationKey: 'options.no' },
        { divider: 'options.or' },
        { value: 'notSure', translationKey: 'options.imNotSure' },
      ],
    },
  ],
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const enumValue = toYesNoNotSureEnum(req.body?.confirmLandlordLicensed);

    if (enumValue) {
      response.defendantResponses.landlordLicensed = enumValue;
    } else {
      delete response.defendantResponses.landlordLicensed;
    }

    await saveDraftDefendantResponse(req, response);
  },
  getInitialFormData: async req => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const landlordLicensed = caseData?.possessionClaimResponse?.defendantResponses?.landlordLicensed;

    return {
      confirmLandlordLicensed: fromYesNoNotSureEnum(landlordLicensed),
    };
  },
  extendGetContent: req => {
    const caseNumber = caseNumberFormatter(req.res?.locals?.validatedCase?.id as string);
    const t = getTranslationFunction(req, 'landlord-licensed', ['common']);

    return {
      caseNumber: t('caseNumber', { caseNumber }),
    };
  },
});
