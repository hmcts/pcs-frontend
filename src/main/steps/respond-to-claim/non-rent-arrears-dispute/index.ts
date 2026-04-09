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

    const disputeClaimDetails =
      disputeOtherParts === 'yes' ? (disputeDetailsRaw?.trim() || null) : null;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        disputeClaim: toYesNoEnum(disputeOtherParts),
        disputeClaimDetails,
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const response = caseData?.possessionClaimResponse?.defendantResponses;

    if (!response?.disputeClaim) {
      return {};
    }

    // Map backend enum to frontend radio value using utility
    const formValue = fromYesNoEnum(response.disputeClaim as string);

    if (!formValue) {
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
    } else {
      initialValues['disputeOtherParts.disputeDetails'] = '';
    }

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
