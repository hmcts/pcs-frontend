import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'postcode-finder',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  basePath: '/respond-to-claim',
  flowConfig,
  customTemplate: 'respond-to-claim/postcode-finder/postcodeFinder.njk',
  translationKeys: {
    pageTitle: 'title',
  },
  extendGetContent: req => {
    const t = getTranslationFunction(req, 'postcode-finder', ['common']);
    return {
      title: t('title'),
      subtitle: t('subtitle'),
      legend: t('legend'),
      labels: {
        yes: t('labels.yes'),
        no: t('labels.no'),
        enterAddress: t('labels.enterAddress'),
        enterPostcode: t('labels.enterPostcode'),
        enterManually: t('labels.enterManually'),
        enterManuallySubText: t('labels.enterManuallySubText'),
        selectAddress: t('labels.selectAddress'),
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
      errors: {
        postcodeNotFound: t('errors.postcodeNotFound'),
      },
      // Extract nested field values for easy template access (only on POST with errors)
      correspondenceAddressLine1: req.body?.['correspondenceAddressConfirm.addressLine1'] || '',
      correspondenceTownOrCity: req.body?.['correspondenceAddressConfirm.townOrCity'] || '',
      correspondencePostcode: req.body?.['correspondenceAddressConfirm.postcode'] || '',
    };
  },
  fields: [
    {
      name: 'correspondenceAddressConfirm',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'legend',
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
              errorMessage: 'errors.correspondenceAddressConfirm.addressLine1',
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
              errorMessage: 'errors.correspondenceAddressConfirm.townOrCity',
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
            },
          },
        },
      ],
    },
  ],
});
