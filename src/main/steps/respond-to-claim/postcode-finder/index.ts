import isPostalCode from 'validator/lib/isPostalCode';

import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

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
  stepName: 'postcode-finder',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: 'respond-to-claim/postcode-finder/postcodeFinder.njk',
  translationKeys: {
    pageTitle: 'pageTitle',
  },
  extendGetContent: req => {
    const t = getTranslationFunction(req, 'postcode-finder', ['common']);

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
      correspondenceAddressLine1: req.body?.['correspondenceAddressConfirm.addressLine1'] || '',
      correspondenceAddressLine2: req.body?.['correspondenceAddressConfirm.addressLine2'] || '',
      correspondenceTownOrCity: req.body?.['correspondenceAddressConfirm.townOrCity'] || '',
      correspondenceCounty: req.body?.['correspondenceAddressConfirm.county'] || '',
      correspondencePostcode: req.body?.['correspondenceAddressConfirm.postcode'] || '',
    };
  },
  fields: fieldsConfig,
});
