import type { Request } from 'express';

import { getTranslation, getTranslationFunction } from '../../../modules/steps';
import { fromYesNoEnum, toYesNoEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'non-rent-arrears-dispute',
  stepDir: __dirname,
  customTemplate: `${__dirname}/nonRentArrearsDispute.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
  },
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const disputeOtherParts = req.body?.disputeOtherParts as 'yes' | 'no' | undefined;

    if (disputeOtherParts === 'yes' || disputeOtherParts === 'no') {
      response.defendantResponses.disputeClaim = toYesNoEnum(disputeOtherParts);

      if (disputeOtherParts === 'yes') {
        const disputeDetailsRaw = req.body?.['disputeOtherParts.disputeDetails'] as string | undefined;
        const trimmed = disputeDetailsRaw?.trim();
        if (trimmed) {
          response.defendantResponses.disputeClaimDetails = trimmed;
        }
      } else {
        delete response.defendantResponses.disputeClaimDetails;
      }
    } else {
      delete response.defendantResponses.disputeClaim;
      delete response.defendantResponses.disputeClaimDetails;
    }

    await saveDraftDefendantResponse(
      req,

      response
    );
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

    const t = getTranslationFunction(req);

    const introParagraph = getTranslation(t, 'introParagraph', '',{ caseReference }) ?? '';
    const includesHeading = getTranslation(t, 'includesHeading', '') ?? '';
    const includesBullet1 = getTranslation(t, 'includesBullet1', '', { claimantName }) ?? '';
    const includesBullet2 = getTranslation(t, 'includesBullet2', '', { claimantName }) ?? '';
    const includesBullet3= getTranslation(t, 'includesBullet3', '', { claimantName }) ?? '';

    // Pre-translate content with interpolation (following rent-arrears pattern)
    return {
      heading: t('heading', { claimantName }),
      introParagraph,
      includesHeading,
      includesBullet1,
      includesBullet2,
      includesBullet3,
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
