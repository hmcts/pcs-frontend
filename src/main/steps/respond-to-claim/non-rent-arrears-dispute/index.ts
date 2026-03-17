import type { Request } from 'express';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'non-rent-arrears-dispute',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/nonRentArrearsDispute.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  beforeRedirect: async req => {
    const disputeOtherParts = req.body?.disputeOtherParts as 'yes' | 'no' | undefined;
    const disputeDetailsRaw = req.body?.['disputeOtherParts.disputeDetails'] as string | undefined;

    if (!disputeOtherParts) {
      return;
    }

    const result: Record<string, unknown> = {};

    // Map frontend radio value to backend enum
    if (disputeOtherParts === 'yes') {
      result.disputeClaim = 'YES';
      if (disputeDetailsRaw && typeof disputeDetailsRaw === 'string') {
        const trimmed = disputeDetailsRaw.trim();
        if (trimmed) {
          result.disputeDetails = trimmed;
        }
      }
    } else if (disputeOtherParts === 'no') {
      result.disputeClaim = 'NO';
      result.disputeDetails = '';
    }

    if (Object.keys(result).length === 0) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: result,
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const response = caseData?.possessionClaimResponse?.defendantResponses;

    if (!response?.disputeClaim) {
      return {};
    }

    const formData: Record<string, unknown> = {};

    // Map backend enum to frontend radio value
    if (response.disputeClaim === 'YES') {
      formData.disputeOtherParts = 'yes';
      // Prepopulate the details if they exist, otherwise explicitly set to empty string
      // Use dotted notation for subField, matching defendant-name-confirmation pattern
      if (response.disputeDetails && response.disputeDetails.trim() !== '') {
        formData['disputeOtherParts.disputeDetails'] = response.disputeDetails as string;
      } else {
        formData['disputeOtherParts.disputeDetails'] = '';
      }
    } else if (response.disputeClaim === 'NO') {
      formData.disputeOtherParts = 'no';
      // Explicitly clear the textarea field when NO is selected
      formData['disputeOtherParts.disputeDetails'] = '';
    }

    return formData;
  },
  extendGetContent: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const caseReference = req.params.caseReference;
    const claimantName = caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value as string | undefined;

    const t = getTranslationFunction(req, 'non-rent-arrears-dispute', ['common']);

    // Pre-translate content with interpolation (following rent-arrears pattern)
    return {
      heading: t('heading'),
      introParagraph: t('introParagraph', { caseReference }),
      includesHeading: t('includesHeading'),
      includesBullet1: t('includesBullet1', { claimantName }),
      includesBullet2: t('includesBullet2'),
      includesBullet3: t('includesBullet3'),
    };
  },
  fields: [
    {
      name: 'disputeOtherParts',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'disputeOtherPartsQuestion',
      },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        {
          value: 'yes',
          translationKey: 'disputeOtherPartsOptions.yes',
          subFields: {
            disputeDetails: {
              name: 'disputeDetails',
              type: 'character-count',
              required: true,
              maxLength: 6500,
              errorMessage: 'errors.disputeDetails',
              translationKey: {
                label: 'disputeDetails.label',
                hint: 'disputeDetails.hint',
              },
            },
          },
        },
        {
          value: 'no',
          translationKey: 'disputeOtherPartsOptions.no',
        },
      ],
    },
  ],
});
