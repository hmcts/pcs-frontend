import type { PossessionClaimResponse, TenancyTypeCorrectValue } from '../../../interfaces/ccdCase.interface';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

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
const TENANCY_TYPE_TO_TEXT: Record<string, string> = {
  ASSURED_TENANCY: 'an assured',
  SECURE_TENANCY: 'a secure',
  INTRODUCTORY_TENANCY: 'an introductory',
  FLEXIBLE_TENANCY: 'a flexible',
  DEMOTED_TENANCY: 'a demoted',
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
  fields: fieldsConfig,
  beforeRedirect: async req => {
    const tenancyTypeConfirm = req.body?.tenancyTypeConfirm as string | undefined;
    const tenancyTypeCorrect: TenancyTypeCorrectValue =
      tenancyTypeConfirm === 'yes'
        ? 'YES'
        : tenancyTypeConfirm === 'no'
          ? 'NO'
          : tenancyTypeConfirm === 'notSure'
            ? 'NOT_SURE'
            : null;
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
      (existingTenancyTypeCorrect === 'YES'
        ? 'yes'
        : existingTenancyTypeCorrect === 'NO'
          ? 'no'
          : existingTenancyTypeCorrect === 'NOT_SURE'
            ? 'notSure'
            : undefined);
    const correctType =
      (req.body?.['tenancyTypeConfirm.correctType'] as string | undefined) ||
      (req.body?.correctType as string | undefined) ||
      (tenancyTypeConfirm === 'no' ? existingCorrectedTenancyType : undefined);

    const orgName =
      req.res?.locals.validatedCase?.data?.possessionClaimResponse?.claimantOrganisations?.[0]?.value || 'Unknown';
    const tenancyTypeOfTenancyLicence = req.res?.locals.validatedCase?.data?.tenancy_TypeOfTenancyLicence as
      | string
      | undefined;
    const tenancyTypeAgreementType = tenancyTypeOfTenancyLicence
      ? TENANCY_TYPE_TO_TEXT[tenancyTypeOfTenancyLicence] || 'an assured'
      : 'an assured';

    const detailsHeading =
      typeof formContent.detailsHeading === 'string'
        ? `${formContent.detailsHeading}${orgName}${':'}`
        : formContent.detailsHeading;

    return {
      ...formContent,
      captionClasses: 'govuk-caption-xl',
      detailsHeading,
      organisationName: orgName,
      orgname: orgName,
      tenancyTypeAgreementType,
      tenancyTypeConfirm,
      correctType,
    };
  },
});
