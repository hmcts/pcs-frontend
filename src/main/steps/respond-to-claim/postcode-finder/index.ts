import { Logger } from '@hmcts/nodejs-logging';
import isPostalCode from 'validator/lib/isPostalCode';

import type { Address, CcdCase, PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getFormData, getTranslationFunction, setFormData } from '../../../modules/steps';
import { ccdCaseService } from '../../../services/ccdCaseService';
import { flowConfig } from '../flow.config';

const logger = Logger.getLogger('postcode-finder');
const STEP_NAME = 'postcode-finder';

let prepopulateAddress: Address | undefined;

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
  stepName: 'postcode-finder',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: 'respond-to-claim/postcode-finder/postcodeFinder.njk',
  translationKeys: {
    pageTitle: 'pageTitle',
  },
  beforeRedirect: req => {
    let possessionClaimResponse: PossessionClaimResponse;
    //prepopulate address is correct
    if (req.body?.['correspondenceAddressConfirm'] === 'yes') {
      possessionClaimResponse = {
        party: {
          address: prepopulateAddress,
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
        party: {
          address: {
            AddressLine1: addressLine1,
            ...(addressLine2 !== undefined && addressLine2 !== '' && { AddressLine2: addressLine2 }),
            PostTown: townOrCity,
            ...(county !== undefined && county !== '' && { County: county }),
            PostCode: postcode,
          },
        },
      };
    }

    //wrap in ccd case object so ccd can validate
    const ccdCase: CcdCase = {
      id: req.session?.ccdCase?.id ?? req.params.caseReference ?? '',
      data: {
        possessionClaimResponse,
        submitDraftAnswers: 'No',
      },
    };

    ccdCaseService.submitResponseToClaim(req.session.user?.accessToken, ccdCase);
  },
  extendGetContent: async (req, formContent) => {
    const t = getTranslationFunction(req, 'postcode-finder', ['common']);

    const formattedAddressStr = await getExistingAddress(
      req.session.user?.accessToken || '',
      req.params.caseReference || ''
    );

    const isAddressKnown = formattedAddressStr !== '';
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

async function getExistingAddress(accessToken: string, caseReference: string): Promise<string> {
  // Pull data from API
  const response = await ccdCaseService.getExistingCaseData(accessToken, caseReference);
  prepopulateAddress = response.case_details.case_data.possessionClaimResponse?.party?.address;

  if (prepopulateAddress) {
    const formattedAddress =
      [
        prepopulateAddress.AddressLine1,
        prepopulateAddress.AddressLine2,
        prepopulateAddress.AddressLine3,
        prepopulateAddress.PostTown,
        prepopulateAddress.County,
        prepopulateAddress.PostCode,
        prepopulateAddress.Country,
      ]
        .map(v => (v ?? '').trim())
        .filter(Boolean)
        .join(', ') + '?';

    return formattedAddress;
  } else {
    return '';
  }
}
