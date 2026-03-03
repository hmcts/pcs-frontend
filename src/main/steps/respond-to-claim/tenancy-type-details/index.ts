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

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        tenancyTypeCorrect,
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse, false);
  },
  extendGetContent: async (req, formContent) => {
    const savedStepData = req.session?.formData?.[STEP_NAME] as Record<string, unknown> | undefined;
    const tenancyTypeConfirm =
      (req.body?.tenancyTypeConfirm as string | undefined) || (savedStepData?.tenancyTypeConfirm as string | undefined);
    const correctType =
      (req.body?.['tenancyTypeConfirm.correctType'] as string | undefined) ||
      (req.body?.correctType as string | undefined) ||
      (savedStepData?.['tenancyTypeConfirm.correctType'] as string | undefined) ||
      (savedStepData?.correctType as string | undefined);
    const orgName =
      req.res?.locals.validatedCase?.data?.possessionClaimResponse?.claimantOrganisations?.[0]?.value || 'Unknown';

    const insetText =
      typeof formContent.insetText === 'string'
        ? formContent.insetText.replace(/Treetops Housing/g, orgName)
        : formContent.insetText;

    const detailsHeading =
      typeof formContent.detailsHeading === 'string'
        ? formContent.detailsHeading.includes('Treetops Housing')
          ? formContent.detailsHeading.replace(/Treetops Housing/g, orgName)
          : `${formContent.detailsHeading}${orgName}${':'}`
        : formContent.detailsHeading;

    return {
      ...formContent,
      insetText,
      detailsHeading,
      organisationName: orgName,
      tenancyTypeConfirm,
      correctType,
    };
  },
});
