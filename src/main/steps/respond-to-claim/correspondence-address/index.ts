import type { Request } from 'express';
import isPostalCode from 'validator/lib/isPostalCode';

import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep, getFormData, getTranslationFunction, setFormData } from '@modules/steps';
import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCaseAddress } from '@services/ccdCase.interface';
import type { PossessionClaimResponse } from '@services/ccdCaseData.model';
import { arrayToString } from '@utils/arrayToString';

const STEP_NAME = 'correspondence-address';

// Required is dynamic: when address is shown (__isAddressKnown from session), the radio is required
// Session is set in extendGetContent; validation reads it via allData on POST.

// Define fields array separately so we can reference it
const fieldsConfig: FormFieldConfig[] = [
  {
    name: 'correspondenceAddressConfirm',
    type: 'radio',
    required: true,
    isPageHeading: true,
    translationKey: {
      label: 'legend',
      hint: 'legend.hint',
    },
    options: [
      {
        value: 'yes',
        translationKey: 'labels.yes',
      },
      {
        value: 'no',
        translationKey: 'labels.no',
        subFields: {
          addressLine1: {
            name: 'addressLine1',
            type: 'text',
            required: true,
            errorMessage: 'errors.correspondenceAddressConfirm.addressLine1',
            translationKey: {
              label: 'labels.addressLine1',
            },
            attributes: {
              autocomplete: 'address-line1',
            },
          },
          addressLine2: {
            name: 'addressLine2',
            type: 'text',
            required: false,
            translationKey: {
              label: 'labels.addressLine2',
            },
            attributes: {
              autocomplete: 'address-line2',
            },
          },
          townOrCity: {
            name: 'townOrCity',
            type: 'text',
            required: true,
            errorMessage: 'errors.correspondenceAddressConfirm.townOrCity',
            translationKey: {
              label: 'labels.townOrCity',
            },
            attributes: {
              autocomplete: 'address-level2',
            },
          },
          county: {
            name: 'county',
            type: 'text',
            required: false,
            translationKey: {
              label: 'labels.county',
            },
          },
          postcode: {
            name: 'postcode',
            type: 'text',
            required: true,
            translationKey: {
              label: 'labels.postcode',
            },
            errorMessage: 'errors.correspondenceAddressConfirm.postcode',
            classes: 'govuk-input--width-10',
            attributes: {
              autocomplete: 'postal-code',
            },
            validator: (value): boolean => {
              if (typeof value === 'string' && value.trim()) {
                return isPostalCode(value.trim(), 'GB');
              }
              return true;
            },
          },
        },
      },
    ],
  },
];

export const step: StepDefinition = createFormStep({
  stepName: 'correspondence-address',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: 'respond-to-claim/correspondence-address/correspondenceAddress.njk',
  beforeRedirect: async req => {
    const stepData = getFormData(req, STEP_NAME) || {};

    const { addressConfirmedRadioSelection, addressLine1, addressLine2, townOrCity, county, postcode } = getAddressData(
      req,
      stepData
    );

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        correspondenceAddressConfirmation: addressConfirmedRadioSelection
          ? addressConfirmedRadioSelection.toUpperCase()
          : '',
      },
      ...(addressConfirmedRadioSelection === 'no' && {
        defendantContactDetails: {
          party: {
            address: {
              AddressLine1: addressLine1,
              ...(addressLine2 && { AddressLine2: addressLine2 }),
              PostTown: townOrCity,
              ...(county && { County: county }),
              PostCode: postcode,
            },
          },
        },
      }),
    };
    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: (req: Request) => {
    const stepData = getFormData(req, STEP_NAME);
    const possessionClaimResponse = req.res?.locals.validatedCase?.data?.possessionClaimResponse;
    const correspondenceAddressConfirmed =
      possessionClaimResponse?.defendantResponses?.correspondenceAddressConfirmation;
    const partyAddress = possessionClaimResponse?.defendantContactDetails?.party?.address;

    const { addressConfirmedRadioSelection, addressLine1, addressLine2, townOrCity, county, postcode } = getAddressData(
      req,
      stepData,
      partyAddress,
      correspondenceAddressConfirmed ?? undefined
    );

    const result: Record<string, unknown> = {};
    if (addressConfirmedRadioSelection) {
      result['correspondenceAddressConfirm'] = addressConfirmedRadioSelection;
      if (addressConfirmedRadioSelection === 'no') {
        result['correspondenceAddressConfirm.addressLine1'] = addressLine1;
        result['correspondenceAddressConfirm.addressLine2'] = addressLine2;
        result['correspondenceAddressConfirm.townOrCity'] = townOrCity;
        result['correspondenceAddressConfirm.county'] = county;
        result['correspondenceAddressConfirm.postcode'] = postcode;
      }
    }
    return result;
  },

  extendGetContent: async (req, formContent) => {
    const stepData = getFormData(req, STEP_NAME);
    const t = getTranslationFunction(req, 'correspondence-address', ['common']);
    const possessionClaimResponse = req.res?.locals.validatedCase?.data?.possessionClaimResponse;
    const partyAddress = possessionClaimResponse?.defendantContactDetails?.party?.address;
    const { formattedAddress: formattedAddressStr } = getExistingAddress(req);
    const isAddressKnown = formattedAddressStr !== '?';

    setFormData(req, STEP_NAME, { ...stepData, __isAddressKnown: isAddressKnown });

    const correspondenceAddressConfirmed =
      possessionClaimResponse?.defendantResponses?.correspondenceAddressConfirmation;

    const { addressConfirmedRadioSelection, addressLine1, addressLine2, townOrCity, county, postcode } = getAddressData(
      req,
      stepData,
      partyAddress,
      correspondenceAddressConfirmed ?? undefined
    );

    const radioField = formContent.fields.find(f => f.name === 'correspondenceAddressConfirm');

    if (radioField) {
      radioField.value = addressConfirmedRadioSelection;
    }

    // TODO: Refactor to avoid mutating module-scoped `fieldsConfig` per request.
    // Use the same pattern as `rent-arrears-dispute` (static validator returning a translation key).
    // Dynamically inject validator with translation function
    const postcodeField = fieldsConfig[0].options?.[1]?.subFields?.postcode;
    if (postcodeField) {
      postcodeField.validator = (value: unknown): boolean | string => {
        if (typeof value === 'string' && value.trim()) {
          const isValid = isPostalCode(value.trim(), 'GB');
          if (!isValid) {
            return t('errors.correspondenceAddressConfirm.postcode');
          }
        }
        return true;
      };
    }

    return {
      ...formContent,
      isAddressKnown,
      formattedAddressStr,
      partyAddress,
      isManualOpen: addressConfirmedRadioSelection === 'no',
      legendNa: t('legendNa'),
      legendhintNa: t('legend.hintNa'),
      caption: t('caption'),
      labels: {
        yes: t('labels.yes'),
        no: t('labels.no'),
        enterAddress: t('labels.enterAddress'),
        enterPostcode: t('labels.enterPostcode'),
        enterManually: t('labels.enterManually'),
        enterManuallySubText: t('labels.enterManuallySubText'),
        selectAddress: t('labels.selectAddress'),
        selectAddressLabel: t('labels.selectAddressLabel'),
        addressHeading: t('labels.addressHeading'),
        addressLine1: t('labels.addressLine1'),
        addressLine2: t('labels.addressLine2'),
        townOrCity: t('labels.townOrCity'),
        county: t('labels.county'),
        postcode: t('labels.postcode'),
      },
      buttons: {
        findAddress: t('buttons.findAddress'),
        saveAndContinue: t('buttons.saveAndContinue'),
        saveForLater: t('buttons.saveForLater'),
      },
      clientErrors: {
        lookupPostcode: t('errors.lookupPostcode'),
        postcodeNotFound: t('errors.postcodeNotFound'),
        selectAddress: t('errors.selectAddress'),
      },
      // Extract nested field values for easy template access (only on POST with errors)
      correspondenceAddressLine1: addressLine1,
      correspondenceAddressLine2: addressLine2,
      correspondenceTownOrCity: townOrCity,
      correspondenceCounty: county,
      correspondencePostcode: postcode,
    };
  },

  translationKeys: { pageTitle: 'pageTitle' },
  fields: fieldsConfig,
});

function getAddressData(
  req: Request,
  stepData: Record<string, unknown>,
  partyAddress?: CcdCaseAddress,
  correspondenceAddressConfirmed?: string
) {
  const addressConfirmedRadioSelection =
    req.body?.correspondenceAddressConfirm !== undefined
      ? req.body.correspondenceAddressConfirm
      : stepData?.correspondenceAddressConfirm !== undefined
        ? stepData.correspondenceAddressConfirm
        : correspondenceAddressConfirmed === 'YES'
          ? 'yes'
          : correspondenceAddressConfirmed === 'NO'
            ? 'no'
            : undefined;

  const fieldMap: Record<string, keyof CcdCaseAddress> = {
    addressLine1: 'AddressLine1',
    addressLine2: 'AddressLine2',
    townOrCity: 'PostTown',
    county: 'County',
    postcode: 'PostCode',
  };

  const getField = (field: keyof typeof fieldMap) => {
    if (addressConfirmedRadioSelection && addressConfirmedRadioSelection !== 'no') {
      return '';
    }

    const key = fieldMap[field];

    return (
      req.body?.[`correspondenceAddressConfirm.${field}`] ||
      stepData?.[`correspondenceAddressConfirm.${field}`] ||
      partyAddress?.[key] ||
      ''
    );
  };

  return {
    addressConfirmedRadioSelection,
    addressLine1: getField('addressLine1'),
    addressLine2: getField('addressLine2'),
    townOrCity: getField('townOrCity'),
    county: getField('county'),
    postcode: getField('postcode'),
  };
}

function getExistingAddress(req: Request): { formattedAddress: string } {
  const caseData = req.res?.locals.validatedCase?.data;
  const defendantDetails = caseData?.possessionClaimResponse?.claimantEnteredDefendantDetails;
  const originalAddress = defendantDetails?.address;

  if (originalAddress?.AddressLine1) {
    const formattedAddress =
      arrayToString([
        originalAddress.AddressLine1,
        originalAddress.AddressLine2,
        originalAddress.AddressLine3,
        originalAddress.PostTown,
        originalAddress.County,
        originalAddress.PostCode,
        originalAddress.Country,
      ]) + '?';
    return { formattedAddress };
  }
  return { formattedAddress: '?' };
}
