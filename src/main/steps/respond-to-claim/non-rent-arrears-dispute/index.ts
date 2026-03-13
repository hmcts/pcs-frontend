import type { Request } from 'express';

import type { FormFieldValue } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'non-rent-arrears-dispute',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/nonRentArrearsDispute.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    introParagraph: 'introParagraph',
    includesHeading: 'includesHeading',
    includesBullet1: 'includesBullet1',
    includesBullet2: 'includesBullet2',
    includesBullet3: 'includesBullet3',
  },
  ccdMapping: {
    backendPath: 'possessionClaimResponse.defendantResponses',
    frontendFields: ['disputeOtherParts', 'disputeOtherParts.disputeDetails'],
    valueMapper: (formData: FormFieldValue) => {
      if (typeof formData === 'string' || Array.isArray(formData)) {
        return {};
      }

      const disputeOtherParts = formData.disputeOtherParts as 'yes' | 'no' | undefined;
      const disputeDetailsRaw = formData['disputeOtherParts.disputeDetails'] as string | undefined;

      const result: Record<string, unknown> = {};

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
        result.disputeDetails = null;
      }

      return result;
    },
  },
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const response = caseData?.possessionClaimResponse?.defendantResponses;

    if (!response?.disputeClaim) {
      return {};
    }

    const formData: Record<string, unknown> = {};

    if (response.disputeClaim === 'YES') {
      formData.disputeOtherParts = 'yes';
      if (response.disputeDetails) {
        formData['disputeOtherParts.disputeDetails'] = response.disputeDetails as string;
      }
    } else if (response.disputeClaim === 'NO') {
      formData.disputeOtherParts = 'no';
    }

    return formData;
  },
  extendGetContent: (req: Request) => {
    const caseData = req.res?.locals.validatedCase?.data;
    const caseReference = req.params.caseReference;
    const claimantName = caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value as string | undefined;

    // Use getTranslationFunction to properly set up namespace
    const t = getTranslationFunction(req, 'non-rent-arrears-dispute', ['common']);

    // Interpolate claimantName into translation strings (like dispute-claim-interstitial)
    return {
      claimantName,
      caseReference,
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
