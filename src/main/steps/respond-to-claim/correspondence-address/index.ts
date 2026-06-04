import type { Request } from 'express';
import isPostalCode from 'validator/lib/isPostalCode';

import { getTranslationFunction } from '../../../modules/steps';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { buildCcdAddressFromFormParts, formatCcdAddress } from '../../utils/ccdAddress';
import { getClaimantName } from '../../utils/getClaimantName';
import { createRespondToClaimFormStep } from '../formStep';

import type { FormFieldConfig, RadioFormField } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

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
              if (typeof value === 'string' && value.trim() && !isPostalCode(value.trim(), 'GB')) {
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
  isAnswered: req => Boolean(req.res?.locals.validatedCase?.defendantResponses?.correspondenceAddressConfirmation),
  stepDir: __dirname,
  customTemplate: 'respond-to-claim/correspondence-address/correspondenceAddress.njk',
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const addressConfirm = req.body?.['correspondenceAddressConfirm'] as string | undefined;

    if (addressConfirm === 'yes') {
      response.defendantResponses.correspondenceAddressConfirmation = 'YES';
      delete response.defendantContactDetails.party.address;
    } else if (addressConfirm === 'no') {
      response.defendantResponses.correspondenceAddressConfirmation = 'NO';
      response.defendantContactDetails.party.address = buildCcdAddressFromFormParts({
        addressLine1: req.body?.['correspondenceAddressConfirm.addressLine1'] ?? '',
        addressLine2: req.body?.['correspondenceAddressConfirm.addressLine2'],
        townOrCity: req.body?.['correspondenceAddressConfirm.townOrCity'] ?? '',
        county: req.body?.['correspondenceAddressConfirm.county'],
        postcode: req.body?.['correspondenceAddressConfirm.postcode'] ?? '',
      });
    } else {
      delete response.defendantResponses.correspondenceAddressConfirmation;
      delete response.defendantContactDetails.party.address;
    }

    await saveDraftDefendantResponse(req, response);
  },
  getInitialFormData: (req: Request) => {
    const possessionClaimResponse = req.res?.locals.validatedCase?.possessionClaimResponse;
    const confirmed = possessionClaimResponse?.defendantResponses?.correspondenceAddressConfirmation;
    const partyAddress = possessionClaimResponse?.defendantContactDetails?.party?.address;

    const selection = confirmed === 'YES' ? 'yes' : confirmed === 'NO' ? 'no' : undefined;
    if (!selection) {
      return {};
    }

    const result: Record<string, unknown> = { correspondenceAddressConfirm: selection };
    if (selection === 'no') {
      result['correspondenceAddressConfirm.addressLine1'] = partyAddress?.AddressLine1 || '';
      result['correspondenceAddressConfirm.addressLine2'] = partyAddress?.AddressLine2 || '';
      result['correspondenceAddressConfirm.townOrCity'] = partyAddress?.PostTown || '';
      result['correspondenceAddressConfirm.county'] = partyAddress?.County || '';
      result['correspondenceAddressConfirm.postcode'] = partyAddress?.PostCode || '';
    }
    return result;
  },
  extendGetContent: async (req, formContent) => {
    const t = getTranslationFunction(req);
    const possessionClaimResponse = req.res?.locals?.validatedCase?.possessionClaimResponse;
    const partyAddress = possessionClaimResponse?.defendantContactDetails?.party?.address;
    const { formattedAddress: formattedAddressStr } = getExistingAddress(req);

    // Claim-time fact — read from claimantEnteredDefendantDetails, not from the resolved address string.
    const isAddressKnown = req.res?.locals.validatedCase?.claimantEnteredDefendantDetailsAddressKnown === 'YES';

    const radio = formContent.fields.find(f => f.componentType === 'radios') as RadioFormField | undefined;
    if (!radio || !radio.component) {
      return {};
    }

    if (isAddressKnown) {
      const claimantName = getClaimantName(req);
      const prepopulateHeading = t('legend', { formattedAddressStr });
      radio.component.label.text = prepopulateHeading;
      radio.component.fieldset.legend.text = prepopulateHeading;
      radio.component.fieldset.legend.isPageHeading = true;
      if (radio.component.hint) {
        radio.component.hint.text = t('legend.hint', { claimantName });
      }
    }

    const confirmed = possessionClaimResponse?.defendantResponses?.correspondenceAddressConfirmation;
    const addressConfirmedRadioSelection =
      req.body?.correspondenceAddressConfirm !== undefined
        ? req.body.correspondenceAddressConfirm
        : confirmed === 'YES'
          ? 'yes'
          : confirmed === 'NO'
            ? 'no'
            : undefined;

    return {
      ...formContent,
      isAddressKnown,
      formattedAddressStr,
      partyAddress,
      isManualOpen: addressConfirmedRadioSelection === 'no',
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
      // Extract nested field values for easy template access (only on POST with errors)
      correspondenceAddressLine1:
        req.body?.['correspondenceAddressConfirm.addressLine1'] || partyAddress?.AddressLine1 || '',
      correspondenceAddressLine2:
        req.body?.['correspondenceAddressConfirm.addressLine2'] || partyAddress?.AddressLine2 || '',
      correspondenceTownOrCity: req.body?.['correspondenceAddressConfirm.townOrCity'] || partyAddress?.PostTown || '',
      correspondenceCounty: req.body?.['correspondenceAddressConfirm.county'] || partyAddress?.County || '',
      correspondencePostcode: req.body?.['correspondenceAddressConfirm.postcode'] || partyAddress?.PostCode || '',
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
  return { formattedAddress: '?' };
}
