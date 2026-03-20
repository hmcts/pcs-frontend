import type { Request } from 'express';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { fromYesNoEnum, toYesNoEnum } from '../../utils';
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

    const result: Record<string, unknown> = {
      disputeClaim: toYesNoEnum(disputeOtherParts),
    };

    // Add dispute details if user selected 'yes' and provided details
    if (disputeOtherParts === 'yes' && disputeDetailsRaw) {
      const trimmed = disputeDetailsRaw.trim();
      if (trimmed) {
        result.disputeClaimDetails = trimmed;
      }
    } else if (disputeOtherParts === 'no') {
      result.disputeClaimDetails = '';
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: result,
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const response = caseData?.possessionClaimResponse?.defendantResponses;

    console.log('[non-rent-arrears-dispute] getInitialFormData called');
    console.log('[non-rent-arrears-dispute] caseData:', JSON.stringify(caseData?.possessionClaimResponse, null, 2));
    console.log('[non-rent-arrears-dispute] response:', JSON.stringify(response, null, 2));
    console.log('[non-rent-arrears-dispute] disputeClaim:', response?.disputeClaim);
    console.log('[non-rent-arrears-dispute] disputeClaimDetails:', response?.disputeClaimDetails);

    if (!response?.disputeClaim) {
      console.log('[non-rent-arrears-dispute] No disputeClaim found, returning empty');
      return {};
    }

    // Map backend enum to frontend radio value using utility
    const formValue = fromYesNoEnum(response.disputeClaim as string);
    console.log('[non-rent-arrears-dispute] formValue from fromYesNoEnum:', formValue);

    if (!formValue) {
      console.log('[non-rent-arrears-dispute] formValue is falsy, returning empty');
      return {};
    }

    const initialValues: Record<string, unknown> = {
      disputeOtherParts: formValue,
    };

    // Prepopulate dispute details if user previously selected 'yes'
    // Use dotted notation for subField, matching defendant-name-confirmation pattern
    if (formValue === 'yes' && response.disputeClaimDetails) {
      const trimmed = (response.disputeClaimDetails as string).trim();
      initialValues['disputeOtherParts.disputeDetails'] = trimmed || '';
      console.log('[non-rent-arrears-dispute] Added disputeDetails:', trimmed);
    } else {
      initialValues['disputeOtherParts.disputeDetails'] = '';
      console.log('[non-rent-arrears-dispute] Set disputeDetails to empty string');
    }

    console.log('[non-rent-arrears-dispute] Returning initialValues:', JSON.stringify(initialValues, null, 2));
    return initialValues;
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
