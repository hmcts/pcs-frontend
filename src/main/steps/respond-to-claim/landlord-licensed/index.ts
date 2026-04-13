import type { YesNoNotSureValue } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import { ccdCaseService } from '@services/ccdCaseService';

export const step: StepDefinition = createFormStep({
  stepName: 'landlord-licensed',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/landlordLicensed.njk`,
  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
    question: 'question',
    paragraph: 'paragraph',
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
        { value: 'imNotSure', translationKey: 'options.imNotSure' },
      ],
    },
  ],
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const confirmValue = req.body?.confirmLandlordLicensed as string | undefined;
    const enumMapping: Record<string, YesNoNotSureValue> = { yes: 'YES', no: 'NO', imNotSure: 'NOT_SURE' };

    if (confirmValue && enumMapping[confirmValue]) {
      response.defendantResponses.landlordLicensed = enumMapping[confirmValue];
    } else {
      delete response.defendantResponses.landlordLicensed;
    }

    await ccdCaseService.saveDraftDefendantResponse(
      req.session?.user?.accessToken,
      req.res?.locals.validatedCase?.id,
      response
    );
  },
  getInitialFormData: async req => {
    const caseData = req.res?.locals?.validatedCase?.data;

    const landlordLicensed = caseData?.possessionClaimResponse?.defendantResponses?.landlordLicensed as
      | string
      | undefined;

    const mapping: Record<string, string> = {
      YES: 'yes',
      NO: 'no',
      NOT_SURE: 'imNotSure',
    };

    return {
      confirmLandlordLicensed: landlordLicensed ? mapping[landlordLicensed] : undefined,
    };
  },
});
