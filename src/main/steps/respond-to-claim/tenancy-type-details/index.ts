import type { Request } from 'express';

import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { isWalesProperty } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { YesNoNotSureValue } from '@services/ccdCase.interface';
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

const TENANCY_TYPE_CONFIRM_TO_CCD: Record<string, YesNoNotSureValue> = {
  yes: 'YES',
  no: 'NO',
  notSure: 'NOT_SURE',
};

const CCD_TO_TENANCY_TYPE_CONFIRM: Record<Exclude<YesNoNotSureValue, null>, string> = {
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
    tenancyTypeOther: 'tenancyTypeOther',
  },
  customTemplate: 'respond-to-claim/tenancy-type-details/tenancyTypeDetails.njk',
  fields: fieldsConfig,
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const existingTenancyTypeCorrect = caseData?.possessionClaimResponse?.defendantResponses?.tenancyTypeCorrect as
      | YesNoNotSureValue
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
    const response = buildDraftDefendantResponse(req);
    const tenancyTypeConfirm = req.body?.tenancyTypeConfirm as string | undefined;

    if (tenancyTypeConfirm && TENANCY_TYPE_CONFIRM_TO_CCD[tenancyTypeConfirm]) {
      response.defendantResponses.tenancyTypeCorrect = TENANCY_TYPE_CONFIRM_TO_CCD[tenancyTypeConfirm];

      if (tenancyTypeConfirm === 'no') {
        const correctedType = (
          (req.body?.['tenancyTypeConfirm.correctType'] as string | undefined) ||
          (req.body?.correctType as string | undefined)
        )?.trim();
        if (correctedType) {
          response.defendantResponses.tenancyType = correctedType;
        }
      } else {
        delete response.defendantResponses.tenancyType;
      }
    } else {
      delete response.defendantResponses.tenancyTypeCorrect;
      delete response.defendantResponses.tenancyType;
    }

    await saveDraftDefendantResponse(req, response);
  },
  extendGetContent: async (req, formContent) => {
    const existingTenancyTypeCorrect = req.res?.locals.validatedCase?.data?.possessionClaimResponse?.defendantResponses
      ?.tenancyTypeCorrect as YesNoNotSureValue;
    const existingCorrectedTenancyType = req.res?.locals.validatedCase?.data?.possessionClaimResponse
      ?.defendantResponses?.tenancyType as string;
    const tenancyTypeConfirm =
      (req.body?.tenancyTypeConfirm as string) ||
      (existingTenancyTypeCorrect ? CCD_TO_TENANCY_TYPE_CONFIRM[existingTenancyTypeCorrect] : '') ||
      '';
    const correctType =
      (req.body?.['tenancyTypeConfirm.correctType'] as string) ||
      (req.body?.correctType as string) ||
      (tenancyTypeConfirm === 'no' ? existingCorrectedTenancyType : '') ||
      '';

    const caseData = req.res?.locals.validatedCase?.data;
    const walesProperty = isWalesProperty(caseData);
    const orgName = caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value as string;
    const tenancyTypeOfTenancyLicence = caseData?.tenancy_TypeOfTenancyLicence as string;
    const occupationLicenceTypeWales = caseData?.occupationLicenceTypeWales as string | undefined;
    // Wales: flat keys from OccupationLicenceDetailsWales.
    const otherTenancyTypeDetails = walesProperty
      ? (caseData?.otherLicenceTypeDetails as string | undefined)
      : (caseData?.tenancy_DetailsOfOtherTypeOfTenancyLicence as string | undefined);
    // England: tenancy_* (TenancyLicenceDetails).
    const tenancyTypeAgreementType = TENANCY_TYPE_TO_TEXT[tenancyTypeOfTenancyLicence];
    const detailsHeading =
      typeof formContent.detailsHeading === 'string'
        ? `${formContent.detailsHeading}${orgName}${':'}`
        : formContent.detailsHeading;

    const t = getTranslationFunction(req, STEP_NAME, ['common']);
    let tenancyType: unknown;
    if (walesProperty) {
      if (occupationLicenceTypeWales === 'OTHER') {
        tenancyType = t('tenancyTypeOther', { otherTenancyTypeDetails });
      } else if (occupationLicenceTypeWales === 'STANDARD_CONTRACT') {
        tenancyType = t('tenancyTypeWalesStandard');
      } else if (occupationLicenceTypeWales === 'SECURE_CONTRACT') {
        tenancyType = t('tenancyTypeWalesSecure');
      } else {
        tenancyType = formContent.tenancyType;
      }
    } else {
      tenancyType = tenancyTypeOfTenancyLicence === 'OTHER' ? formContent.tenancyTypeOther : formContent.tenancyType;
    }

    return {
      ...formContent,
      detailsHeading,
      tenancyType,
      organisationName: orgName,
      orgname: orgName,
      otherTenancyTypeDetails,
      tenancyTypeAgreementType,
      tenancyTypeConfirm,
      correctType,
    };
  },
});
