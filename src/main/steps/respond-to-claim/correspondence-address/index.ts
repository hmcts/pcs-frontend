import type { Request } from 'express';
import isPostalCode from 'validator/lib/isPostalCode';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getFormData, getTranslationFunction, setFormData } from '../../../modules/steps';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

const STEP_NAME = 'postcode-finder';

// Required is dynamic: when address is shown (__isAddressKnown from session), the radio is required
// Session is set in extendGetContent; validation reads it via allData on POST.
const correspondenceAddressRequired = (_formData: Record<string, unknown>, allData: Record<string, unknown>): boolean =>
  allData.__isAddressKnown === true;

// Define fields array separately so we can reference it
const fieldsConfig: FormFieldConfig[] = [
  {
    name: 'correspondenceAddressConfirm',
    type: 'radio',
    required: correspondenceAddressRequired,
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
  stepName: 'correspondence-address',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: 'respond-to-claim/correspondence-address/correspondenceAddress.njk',
  translationKeys: {
    pageTitle: 'pageTitle',
  },
  beforeRedirect: async req => {
    let possessionClaimResponse: PossessionClaimResponse;
    //prepopulate address is correct
    if (req.body?.['correspondenceAddressConfirm'] === 'yes') {
      // Read fresh CCD data from middleware (available on both GET and POST)
      const caseData = req.res?.locals.validatedCase?.data;
      const prepopulateAddress = caseData?.possessionClaimResponse?.defendantContactDetails?.party?.address;

      possessionClaimResponse = {
        defendantContactDetails: {
          party: {
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

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse, false);
  },
  extendGetContent: async (req, formContent) => {
    const t = getTranslationFunction(req, 'correspondence-address', ['common']);

    const { formattedAddress: formattedAddressStr } = getExistingAddress(req);

    const isAddressKnown = formattedAddressStr !== '?';
    setFormData(req, STEP_NAME, { ...getFormData(req, STEP_NAME), __isAddressKnown: isAddressKnown });

    const radio = formContent.fields.find(f => f.componentType === 'radios') as
      | { component: { label: { text: string }; fieldset: { legend: { text: string } } } }
      | undefined;
    if (!radio || !radio.component) {
      return {};
    }

    let prepopulateHeading = '';
    if (isAddressKnown) {
      prepopulateHeading = `${t('legend')}${formattedAddressStr}`;
      radio.component.label.text = prepopulateHeading;
      radio.component.fieldset.legend.text = prepopulateHeading;
    }

    // Override value used in njk File with our dynamic value.
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

function getExistingAddress(req: Request): { formattedAddress: string } {
  // Read from res.locals.validatedCase (already fetched by caseReference middleware via START callback)
  const caseData = req.res?.locals.validatedCase?.data;
  const defendantContactDetails = caseData?.possessionClaimResponse?.defendantContactDetails?.party;
  const addressKnown = defendantContactDetails?.addressKnown;
  const address = defendantContactDetails?.address;

  // Check addressKnown field from CCD - if "YES" then address exists
  if (addressKnown === 'YES' && address) {
    const formattedAddress =
      [
        address.AddressLine1,
        address.AddressLine2,
        address.AddressLine3,
        address.PostTown,
        address.County,
        address.PostCode,
        address.Country,
      ]
        .map(v => (v ?? '').trim())
        .filter(Boolean)
        .join(', ') + '?';

    return { formattedAddress };
  }
  return { formattedAddress: '?' };
}
