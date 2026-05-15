import type { Request } from 'express';

import { getTranslationFunction } from '../../../modules/steps';
import { fromYesNoNotSureEnum, isWalesProperty, toYesNoNotSureEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { isLegalRepresentativeUser } from '../../utils/userRole';
import { createRespondToClaimFormStep } from '../formStep';

import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
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

const TENANCY_TYPE_TO_TEXT: Record<string, string> = {
  ASSURED_TENANCY: 'an assured',
  SECURE_TENANCY: 'a secure',
  INTRODUCTORY_TENANCY: 'an introductory',
  FLEXIBLE_TENANCY: 'a flexible',
  DEMOTED_TENANCY: 'a demoted',
  OTHER: 'other',
};

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: STEP_NAME,
  stepDir: __dirname,
  translationKeys: {
    pageTitle: 'pageTitle',
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
    const existingTenancyTypeConfirmation =
      caseData?.possessionClaimResponse?.defendantResponses?.tenancyTypeConfirmation;
    const existingCorrectedTenancyType = caseData?.possessionClaimResponse?.defendantResponses?.tenancyType;

    const formValue = fromYesNoNotSureEnum(existingTenancyTypeConfirmation);
    if (!formValue) {
      return {};
    }

    const initial: Record<string, unknown> = { tenancyTypeConfirm: formValue };
    if (existingTenancyTypeConfirmation === 'NO' && existingCorrectedTenancyType) {
      initial['tenancyTypeConfirm.correctType'] = existingCorrectedTenancyType;
    }
    return initial;
  },
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const tenancyTypeConfirm = req.body?.tenancyTypeConfirm as string | undefined;
    const enumValue = toYesNoNotSureEnum(tenancyTypeConfirm);

    if (enumValue) {
      response.defendantResponses.tenancyTypeConfirmation = enumValue;

      if (tenancyTypeConfirm === 'no') {
        const correctedType = (
          (req.body?.['tenancyTypeConfirm.correctType'] as string | undefined) ||
          (req.body?.correctType as string | undefined)
        )?.trim();
        if (correctedType) {
          response.defendantResponses.tenancyType = correctedType;
        } else {
          delete response.defendantResponses.tenancyType;
        }
      } else {
        delete response.defendantResponses.tenancyType;
      }
    } else {
      delete response.defendantResponses.tenancyTypeConfirmation;
      delete response.defendantResponses.tenancyType;
    }

    await saveDraftDefendantResponse(req, response);
  },
  extendGetContent: async (req, formContent) => {
    const existingTenancyTypeConfirmation =
      req.res?.locals.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.tenancyTypeConfirmation;
    const existingCorrectedTenancyType = req.res?.locals.validatedCase?.data?.possessionClaimResponse
      ?.defendantResponses?.tenancyType as string;
    const tenancyTypeConfirm =
      (req.body?.tenancyTypeConfirm as string) || fromYesNoNotSureEnum(existingTenancyTypeConfirmation) || '';
    const correctType =
      (req.body?.['tenancyTypeConfirm.correctType'] as string) ||
      (req.body?.correctType as string) ||
      (tenancyTypeConfirm === 'no' ? existingCorrectedTenancyType : '') ||
      '';
    const claimantName = req.res?.locals.validatedCase?.data?.claimantName as string;
    const caseData = req.res?.locals.validatedCase?.data;
    const walesProperty = isWalesProperty(caseData);
    const orgName = caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value as string;
    const tenancyTypeOfTenancyLicence = caseData?.tenancy_TypeOfTenancyLicence as string;
    const occupationLicenceTypeWales = caseData?.occupationLicenceTypeWales;
    // Wales: flat keys from OccupationLicenceDetailsWales.
    const otherTenancyTypeDetails = walesProperty
      ? caseData?.otherLicenceTypeDetails
      : caseData?.tenancy_DetailsOfOtherTypeOfTenancyLicence;
    // England: tenancy_* (TenancyLicenceDetails).
    const tenancyTypeAgreementType = TENANCY_TYPE_TO_TEXT[tenancyTypeOfTenancyLicence];
    const senderName = isLegalRepresentativeUser(req) ? claimantName : orgName;

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
      senderName,
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
