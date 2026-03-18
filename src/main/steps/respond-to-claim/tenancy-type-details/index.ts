import type { Request } from 'express';

import type { PossessionClaimResponse, TenancyTypeCorrectValue } from '../../../interfaces/ccdCase.interface';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';
// Testing builds
const fieldsConfig: FormFieldConfig[] = [
  {
    name: 'tenancyTypeConfirm',
    type: 'radio',
    required: true,
    legendClasses: 'govuk-fieldset__legend--m govuk-heading-m',
    translationKey: {
      label: 'legend',
    },
    options: [
      {
        value: 'yes',
        translationKey: 'yes',
      },
      {
        value: 'no',
        translationKey: 'no',
        subFields: {
          correctType: {
            name: 'correctType',
            type: 'text',
            required: true,
            errorMessage: 'errors.requiredText',
            classes: 'govuk-input--width-two-thirds',
            labelClasses: 'govuk-label--s govuk-!-font-weight-bold',
            maxLength: 60,
            translationKey: {
              label: 'correctTypeLabel',
            },
          },
        },
      },
      {
        divider: 'or',
      },
      {
        value: 'notSure',
        translationKey: 'notSure',
      },
    ],
  },
];

const STEP_NAME = 'tenancy-type-details';

const TENANCY_TYPE_CONFIRM_TO_CCD: Record<string, TenancyTypeCorrectValue> = {
  yes: 'YES',
  no: 'NO',
  notSure: 'NOT_SURE',
};

const CCD_TO_TENANCY_TYPE_CONFIRM: Record<Exclude<TenancyTypeCorrectValue, null>, string> = {
  YES: 'yes',
  NO: 'no',
  NOT_SURE: 'notSure',
};

const TENANCY_TYPE_TO_TEXT: Record<string, string> = {
  ASSURED_TENANCY: 'an assured',
  SECURE_TENANCY: 'a secure',
  INTRODUCTORY_TENANCY: 'an introductory',
  FLEXIBLE_TENANCY: 'a flexible',
  DEMOTED_TENANCY: 'a demoted',
  OTHER: 'other',
};

export const step: StepDefinition = createFormStep({
  stepName: STEP_NAME,
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    insetText: 'insetText',
    saveAndContinue: 'saveAndContinue',
    saveForLater: 'saveForLater',
    detailsHeading: 'detailsHeading',
    tenancyType: 'tenancyType',
  },
  customTemplate: 'respond-to-claim/tenancy-type-details/tenancyTypeDetails.njk',
  fields: fieldsConfig,
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const existingTenancyTypeCorrect = caseData?.possessionClaimResponse?.defendantResponses?.tenancyTypeCorrect as
      | TenancyTypeCorrectValue
      | undefined;
    const existingCorrectedTenancyType = caseData?.possessionClaimResponse?.defendantResponses?.tenancyType as
      | string
      | undefined;

    if (!existingTenancyTypeCorrect) {
      return {};
    }

    const formValue = CCD_TO_TENANCY_TYPE_CONFIRM[existingTenancyTypeCorrect];
    if (!formValue) {
      return {};
    }

    const initial: Record<string, unknown> = { tenancyTypeConfirm: formValue };
    if (existingTenancyTypeCorrect === 'NO' && existingCorrectedTenancyType) {
      initial['tenancyTypeConfirm.correctType'] = existingCorrectedTenancyType;
    }
    return initial;
  },
  beforeRedirect: async req => {
    const tenancyTypeConfirm = req.body?.tenancyTypeConfirm as string | undefined;
    const tenancyTypeCorrect = tenancyTypeConfirm ? TENANCY_TYPE_CONFIRM_TO_CCD[tenancyTypeConfirm] : undefined;
    const correctedTenancyTypeText = (
      (req.body?.['tenancyTypeConfirm.correctType'] as string | undefined) ||
      (req.body?.correctType as string | undefined)
    )?.trim();
    const existingCorrectedTenancyType =
      req.res?.locals.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.tenancyType;
    const tenancyType =
      tenancyTypeConfirm === 'no'
        ? correctedTenancyTypeText || undefined
        : existingCorrectedTenancyType
          ? ''
          : undefined;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        tenancyTypeCorrect,
        tenancyType,
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
  extendGetContent: async (req, formContent) => {
    const existingTenancyTypeCorrect = req.res?.locals.validatedCase?.data?.possessionClaimResponse?.defendantResponses
      ?.tenancyTypeCorrect as TenancyTypeCorrectValue | undefined;
    const existingCorrectedTenancyType = req.res?.locals.validatedCase?.data?.possessionClaimResponse
      ?.defendantResponses?.tenancyType as string | undefined;
    const tenancyTypeConfirm =
      (req.body?.tenancyTypeConfirm as string | undefined) ||
      (existingTenancyTypeCorrect ? CCD_TO_TENANCY_TYPE_CONFIRM[existingTenancyTypeCorrect] : undefined);
    const correctType =
      (req.body?.['tenancyTypeConfirm.correctType'] as string | undefined) ||
      (req.body?.correctType as string | undefined) ||
      (tenancyTypeConfirm === 'no' ? existingCorrectedTenancyType : undefined);

    const orgName =
      req.res?.locals.validatedCase?.data?.possessionClaimResponse?.claimantOrganisations?.[0]?.value || 'Unknown';
    const tenancyTypeOfTenancyLicence = req.res?.locals.validatedCase?.data?.tenancy_TypeOfTenancyLicence as
      | string
      | undefined;
    const otherTenancyTypeDetails = req.res?.locals.validatedCase?.data?.tenancy_DetailsOfOtherTypeOfTenancyLicence as
      | string
      | undefined;
    const tenancyTypeAgreementType = tenancyTypeOfTenancyLicence
      ? TENANCY_TYPE_TO_TEXT[tenancyTypeOfTenancyLicence] || 'an assured'
      : 'an assured';

    const detailsHeading =
      typeof formContent.detailsHeading === 'string'
        ? `${formContent.detailsHeading}${orgName}${':'}`
        : formContent.detailsHeading;
    const tenancyType =
      tenancyTypeOfTenancyLicence === 'OTHER'
        ? `The claimant provided the following information about your tenancy, occupation contract or licence agreement type: ${
            otherTenancyTypeDetails || ''
          }`
        : formContent.tenancyType;

    return {
      ...formContent,
      detailsHeading,
      tenancyType,
      organisationName: orgName,
      orgname: orgName,
      tenancyTypeAgreementType,
      tenancyTypeConfirm,
      correctType,
    };
  },
});
