import type { Request } from 'express';
import isPostalCode from 'validator/lib/isPostalCode';

import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';
import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { PossessionClaimResponse } from '@services/ccdCaseData.model';
import { arrayToString } from '@utils/arrayToString';

// Define fields array separately so we can reference it
const fieldsConfig: FormFieldConfig[] = [
  {
    name: 'correspondenceAddressConfirm',
    type: 'radio',
    required: true,
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
  translationKeys: {
    pageTitle: 'pageTitle',
  },
  getInitialFormData: req => {
    const validatedCase = req.res?.locals?.validatedCase;
    const existingAddress = validatedCase?.defendantContactDetailsPartyAddress;

    if (!existingAddress) {
      return {};
    }

    const manualAddressFields = {
      'correspondenceAddressConfirm.addressLine1': existingAddress.AddressLine1 || '',
      'correspondenceAddressConfirm.addressLine2': existingAddress.AddressLine2 || '',
      'correspondenceAddressConfirm.townOrCity': existingAddress.PostTown || '',
      'correspondenceAddressConfirm.county': existingAddress.County || '',
      'correspondenceAddressConfirm.postcode': existingAddress.PostCode || '',
    };

    if (validatedCase?.defendantContactDetailsPartyAddressKnown === 'NO') {
      return {
        correspondenceAddressConfirm: 'no',
        ...manualAddressFields,
      };
    }

    return manualAddressFields;
  },
  beforeRedirect: async req => {
    let possessionClaimResponse: PossessionClaimResponse;

    if (req.body?.['correspondenceAddressConfirm'] === 'yes') {
      const validatedCase = req.res?.locals?.validatedCase;
      const prepopulateAddress = validatedCase?.defendantContactDetailsPartyAddress;

      possessionClaimResponse = {
        defendantContactDetails: {
          party: {
            addressKnown: 'YES',
            address: prepopulateAddress,
          },
        },
      };
    } else {
      const addressLine1 = req.body?.['correspondenceAddressConfirm.addressLine1'] ?? '';
      const addressLine2 = req.body?.['correspondenceAddressConfirm.addressLine2'];
      const townOrCity = req.body?.['correspondenceAddressConfirm.townOrCity'] ?? '';
      const county = req.body?.['correspondenceAddressConfirm.county'];
      const postcode = req.body?.['correspondenceAddressConfirm.postcode'] ?? '';

      //only the details the defendant provides
      possessionClaimResponse = {
        defendantContactDetails: {
          party: {
            addressKnown: 'NO',
            address: {
              AddressLine1: addressLine1,
              ...(addressLine2 !== undefined && addressLine2 !== '' && { AddressLine2: addressLine2 }),
              PostTown: townOrCity,
              ...(county !== undefined && county !== '' && { County: county }),
              PostCode: postcode,
            },
          },
        },
      };
    }

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
  extendGetContent: async (req, formContent) => {
    const t = getTranslationFunction(req, 'correspondence-address', ['common']);
    const getAddressValue = (fieldName: string): string => {
      const formValue = formContent[fieldName];
      if (typeof formValue === 'string') {
        return formValue;
      }

      const bodyValue = req.body?.[fieldName];
      return typeof bodyValue === 'string' ? bodyValue : '';
    };

    const { formattedAddress: formattedAddressStr } = getExistingAddress(req);
    const isAddressKnown = formattedAddressStr !== '?';

    const radio = formContent.fields.find(f => f.componentType === 'radios') as
      | {
          component: {
            label: { text: string };
            fieldset: { legend: { text: string; isPageHeading?: boolean } };
          };
        }
      | undefined;
    if (!radio || !radio.component) {
      return {};
    }

    let prepopulateHeading = '';
    if (isAddressKnown) {
      prepopulateHeading = `${t('legend')}${formattedAddressStr}`;
      radio.component.label.text = prepopulateHeading;
      radio.component.fieldset.legend.text = prepopulateHeading;
      radio.component.fieldset.legend.isPageHeading = true;
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
      prepopulateHeading,
      // subtitle,
      legendNa: t('legendNa'),
      legendhintNa: t('legend.hintNa'),

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
      // Expose nested values for the custom template on GET and POST.
      correspondenceAddressLine1: getAddressValue('correspondenceAddressConfirm.addressLine1'),
      correspondenceAddressLine2: getAddressValue('correspondenceAddressConfirm.addressLine2'),
      correspondenceTownOrCity: getAddressValue('correspondenceAddressConfirm.townOrCity'),
      correspondenceCounty: getAddressValue('correspondenceAddressConfirm.county'),
      correspondencePostcode: getAddressValue('correspondenceAddressConfirm.postcode'),
    };
  },
  fields: fieldsConfig,
});

function getExistingAddress(req: Request): { formattedAddress: string } {
  const { hasDefendantContactDetailsPartyAddress, defendantContactDetailsPartyAddress: address } = req.res?.locals
    ?.validatedCase ?? {
    hasDefendantContactDetailsPartyAddress: false,
    defendantContactDetailsPartyAddress: undefined,
  };

  if (hasDefendantContactDetailsPartyAddress && address) {
    const formattedAddress =
      arrayToString([
        address.AddressLine1,
        address.AddressLine2,
        address.AddressLine3,
        address.PostTown,
        address.County,
        address.PostCode,
        address.Country,
      ]) + '?';

    return { formattedAddress };
  }
  return { formattedAddress: '?' };
}
