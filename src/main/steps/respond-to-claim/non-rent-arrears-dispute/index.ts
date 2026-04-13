import type { Request } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { fromYesNoEnum, toYesNoEnum } from '../../utils';
import { getDraftDefendantResponse } from '../../utils/getDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { ccdCaseService } from '@services/ccdCaseService';

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
    const response = getDraftDefendantResponse(req);
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

    await ccdCaseService.saveDraftDefendantResponse(
      req.session?.user?.accessToken,
      req.res?.locals.validatedCase?.id,
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
