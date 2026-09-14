import type { Request } from 'express';

import { getTranslationFunction } from '../../../modules/steps';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { buildCcdAddressFromFormParts, formatCcdAddress } from '../../utils/ccdAddress';
import { getClaimantName } from '../../utils/getClaimantName';
import { createRespondToClaimFormStep } from '../formStep';

import type {
  BuiltFormContent,
  FormFieldConfig,
  RadioFormField,
} from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

// Full UK postcode, outward + inward code; an outward code alone ("W5") is not an address.
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function isFullUkPostcode(value: string): boolean {
  return UK_POSTCODE_REGEX.test(value.trim());
}

const ADDRESS_FIELD_NAMES = {
  addressLine1: 'correspondenceAddressConfirm.addressLine1',
  addressLine2: 'correspondenceAddressConfirm.addressLine2',
  townOrCity: 'correspondenceAddressConfirm.townOrCity',
  county: 'correspondenceAddressConfirm.county',
  postcode: 'correspondenceAddressConfirm.postcode',
} as const;

// Manual address input values from the form builder's content: the posted body on a POST, getFormData on a
// GET. A posted empty string stays empty; the saved address only fills fields that were not posted.
export function buildAddressFieldValues(
  req: Pick<Request, 'method'>,
  formContent: Record<string, unknown>,
  savedAddress:
    { AddressLine1?: string; AddressLine2?: string; PostTown?: string; County?: string; PostCode?: string } | undefined
): {
  correspondenceAddressLine1: string;
  correspondenceAddressLine2: string;
  correspondenceTownOrCity: string;
  correspondenceCounty: string;
  correspondencePostcode: string;
} {
  const isPost = req.method === 'POST';
  const value = (fieldName: string, saved: string | undefined): string => {
    const formValue = formContent[fieldName];
    if (formValue !== undefined && formValue !== null) {
      return String(formValue);
    }
    return isPost ? '' : (saved ?? '');
  };
  return {
    correspondenceAddressLine1: value(ADDRESS_FIELD_NAMES.addressLine1, savedAddress?.AddressLine1),
    correspondenceAddressLine2: value(ADDRESS_FIELD_NAMES.addressLine2, savedAddress?.AddressLine2),
    correspondenceTownOrCity: value(ADDRESS_FIELD_NAMES.townOrCity, savedAddress?.PostTown),
    correspondenceCounty: value(ADDRESS_FIELD_NAMES.county, savedAddress?.County),
    correspondencePostcode: value(ADDRESS_FIELD_NAMES.postcode, savedAddress?.PostCode),
  };
}

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
            validator: (value): boolean | string => {
              if (typeof value === 'string' && value.trim() && !isFullUkPostcode(value)) {
                return 'errors.correspondenceAddressConfirm.postcode';
              }
              return true;
            },
          },
        },
      },
    ],
  },
];

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'correspondence-address',
  // Answeredness is the citizen's own confirmation only. The party address is pre-populated
  // from the claim (addressKnown=YES), so reading it here wrongly marks the step answered
  // before the citizen acts, flipping personalDetails to In progress instead of Available.
  // Both modes set correspondenceAddressConfirmation on submit (the address-not-known mode
  // posts a hidden correspondenceAddressConfirm="no").
  isAnswered: req =>
    Boolean(req.res?.locals.validatedCase?.defendantResponses?.correspondenceAddressConfirmation) ||
    Boolean(req.res?.locals.validatedCase?.defendantResponses?.propertyAddressConfirmation),
  stepDir: __dirname,
  customTemplate: 'respond-to-claim/correspondence-address/correspondenceAddress.njk',
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const addressKnown = req.res?.locals.validatedCase?.claimantEnteredDefendantDetailsAddressKnown;
    const propertyAddress = req.res?.locals.validatedCase?.data?.propertyAddress;
    const wasPropertyFallback = addressKnown !== 'YES';

    const radioValue = req.body?.['correspondenceAddressConfirm'] as string | undefined;

    const enteredAddress = buildCcdAddressFromFormParts({
      addressLine1: req.body?.['correspondenceAddressConfirm.addressLine1'] ?? '',
      addressLine2: req.body?.['correspondenceAddressConfirm.addressLine2'],
      townOrCity: req.body?.['correspondenceAddressConfirm.townOrCity'] ?? '',
      county: req.body?.['correspondenceAddressConfirm.county'],
      postcode: req.body?.['correspondenceAddressConfirm.postcode'] ?? '',
    });

    if (wasPropertyFallback) {
      if (radioValue === 'yes') {
        response.defendantResponses.propertyAddressConfirmation = 'YES';
        response.defendantContactDetails.party.address = propertyAddress;
      } else if (radioValue === 'no') {
        response.defendantResponses.propertyAddressConfirmation = 'NO';
        response.defendantContactDetails.party.address = enteredAddress;
      }
      delete response.defendantResponses.correspondenceAddressConfirmation;
    } else {
      if (radioValue === 'yes') {
        response.defendantResponses.correspondenceAddressConfirmation = 'YES';
        delete response.defendantContactDetails.party.address;
      } else if (radioValue === 'no') {
        response.defendantResponses.correspondenceAddressConfirmation = 'NO';
        response.defendantContactDetails.party.address = enteredAddress;
      }
      delete response.defendantResponses.propertyAddressConfirmation;
    }

    await saveDraftDefendantResponse(req, response);
  },
  getInitialFormData: (req: Request) => {
    const possessionClaimResponse = req.res?.locals.validatedCase?.possessionClaimResponse;
    const partyAddress = possessionClaimResponse?.defendantContactDetails?.party?.address;
    const addressKnown = req.res?.locals.validatedCase?.claimantEnteredDefendantDetailsAddressKnown;
    const wasPropertyFallback = addressKnown !== 'YES';

    const result: Record<string, unknown> = {};

    if (wasPropertyFallback) {
      const draftAnswer = possessionClaimResponse?.defendantResponses?.propertyAddressConfirmation;
      const radioValueToSelect = draftAnswer === 'YES' ? 'yes' : draftAnswer === 'NO' ? 'no' : undefined;
      if (radioValueToSelect) {
        result['correspondenceAddressConfirm'] = radioValueToSelect;
        if (radioValueToSelect === 'no') {
          result['correspondenceAddressConfirm.addressLine1'] = partyAddress?.AddressLine1 || '';
          result['correspondenceAddressConfirm.addressLine2'] = partyAddress?.AddressLine2 || '';
          result['correspondenceAddressConfirm.townOrCity'] = partyAddress?.PostTown || '';
          result['correspondenceAddressConfirm.county'] = partyAddress?.County || '';
          result['correspondenceAddressConfirm.postcode'] = partyAddress?.PostCode || '';
        }
      }
    } else {
      const draftAnswer = possessionClaimResponse?.defendantResponses?.correspondenceAddressConfirmation;
      const radioValueToSelect = draftAnswer === 'YES' ? 'yes' : draftAnswer === 'NO' ? 'no' : undefined;
      if (radioValueToSelect) {
        result['correspondenceAddressConfirm'] = radioValueToSelect;
        if (radioValueToSelect === 'no') {
          result['correspondenceAddressConfirm.addressLine1'] = partyAddress?.AddressLine1 || '';
          result['correspondenceAddressConfirm.addressLine2'] = partyAddress?.AddressLine2 || '';
          result['correspondenceAddressConfirm.townOrCity'] = partyAddress?.PostTown || '';
          result['correspondenceAddressConfirm.county'] = partyAddress?.County || '';
          result['correspondenceAddressConfirm.postcode'] = partyAddress?.PostCode || '';
        }
      }
    }

    return result;
  },
  extendGetContent: async (req, formContent: BuiltFormContent) => {
    const t = getTranslationFunction(req);
    const possessionClaimResponse = req.res?.locals?.validatedCase?.possessionClaimResponse;
    const partyAddress = possessionClaimResponse?.defendantContactDetails?.party?.address;
    const propertyAddress = req.res?.locals?.validatedCase?.data?.propertyAddress;
    const addressSource = partyAddress ?? propertyAddress;
    const { formattedAddress: formattedAddressStr } = getExistingAddress(req);

    const addressKnown = req.res?.locals.validatedCase?.claimantEnteredDefendantDetailsAddressKnown;
    const wasPropertyFallback = addressKnown !== 'YES';

    const radio = formContent.fields.find(f => f.componentType === 'radios') as RadioFormField | undefined;
    if (!radio || !radio.component) {
      return {};
    }

    const claimantName = getClaimantName(req);
    const prepopulateHeading = t('legend', { formattedAddressStr });
    radio.component.label.text = prepopulateHeading;
    radio.component.fieldset.legend.text = prepopulateHeading;
    radio.component.fieldset.legend.isPageHeading = true;
    if (radio.component.hint) {
      radio.component.hint.text = t('legend.hint', { claimantName });
    }

    const savedValue = wasPropertyFallback
      ? possessionClaimResponse?.defendantResponses?.propertyAddressConfirmation
      : possessionClaimResponse?.defendantResponses?.correspondenceAddressConfirmation;

    const addressConfirmedRadioSelection =
      req.body?.['correspondenceAddressConfirm'] !== undefined
        ? req.body['correspondenceAddressConfirm']
        : savedValue === 'YES'
          ? 'yes'
          : savedValue === 'NO'
            ? 'no'
            : undefined;

    return {
      ...formContent,
      formattedAddressStr,
      partyAddress,
      isManualOpen: addressConfirmedRadioSelection === 'no',
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
      ...buildAddressFieldValues(req, formContent, addressSource),
    };
  },

  translationKeys: { pageTitle: 'pageTitle' },
  fields: fieldsConfig,
});

function getExistingAddress(req: Request): { formattedAddress: string } {
  const caseData = req.res?.locals.validatedCase?.data;
  const originalAddress = caseData?.possessionClaimResponse?.claimantEnteredDefendantDetails?.address;

  if (originalAddress && 'AddressLine1' in originalAddress && originalAddress.AddressLine1) {
    // Drop Country for this caller — the legend is a UK-only correspondence address.
    return { formattedAddress: formatCcdAddress({ ...originalAddress, Country: undefined }) + '?' };
  }

  const propertyAddress = caseData?.propertyAddress;
  if (propertyAddress?.AddressLine1) {
    return { formattedAddress: formatCcdAddress({ ...propertyAddress, Country: undefined }) + '?' };
  }

  return { formattedAddress: '?' };
}
