import type { Request } from 'express';

import { FIELD_LIMITS } from './fieldLimits';
import { type AddressPart, addressFieldName } from './formValues';

import { getTranslationFunction } from '@modules/steps';
import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';

export const ADDRESS_TEMPLATE = 'make-a-claim/templates/address.njk';

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

type IsRequired = (formData: Record<string, unknown>) => boolean;

const AUTOCOMPLETE: Record<AddressPart, string> = {
  addressLine1: 'address-line1',
  addressLine2: 'address-line2',
  town: 'address-level2',
  county: 'address-level1',
  postcode: 'postal-code',
};

/** The manual address fields of a postcode finder, required unless `required` says the address is not asked for. */
export function addressFields(prefix: string, required: IsRequired = () => true): FormFieldConfig[] {
  const field = (part: AddressPart, isRequired: boolean, extra: Partial<FormFieldConfig> = {}): FormFieldConfig => ({
    name: addressFieldName(prefix, part),
    type: 'text',
    required: isRequired ? (formData: Record<string, unknown>) => required(formData) : false,
    translationKey: { label: `makeAClaim:address.labels.${part}` },
    classes: part === 'postcode' ? 'govuk-input--width-10' : 'govuk-!-width-three-quarters',
    attributes: { autocomplete: AUTOCOMPLETE[part] },
    ...extra,
  });
  return [
    field('addressLine1', true, { maxLength: FIELD_LIMITS.addressLine }),
    field('addressLine2', false, { maxLength: FIELD_LIMITS.addressLine }),
    field('town', true, { maxLength: FIELD_LIMITS.addressLine }),
    field('county', false, { maxLength: FIELD_LIMITS.addressLine }),
    field('postcode', true, {
      maxLength: FIELD_LIMITS.postcode,
      validator: (value: unknown): boolean | string =>
        typeof value === 'string' && value.trim() && !UK_POSTCODE.test(value.trim()) ? 'errors.postcodeInvalid' : true,
    }),
  ];
}

/** What the address template needs to render the finder for `prefix`. */
export function addressContent(req: Request, prefix: string): Record<string, unknown> {
  const t = getTranslationFunction(req, ['makeAClaim', 'common']);
  const label = (key: string) => t(`makeAClaim:address.finder.${key}`);
  const posted = req.method === 'POST' ? (req.body ?? {}) : {};
  return {
    addressPrefix: prefix,
    addressOpen: Boolean(posted[addressFieldName(prefix, 'addressLine1')]) || req.method === 'POST',
    addressLabels: {
      enterPostcode: label('enterPostcode'),
      findAddress: label('findAddress'),
      selectAddress: label('selectAddress'),
      enterManually: label('enterManually'),
      lookupPostcodeError: label('lookupPostcodeError'),
      postcodeNotFoundError: label('postcodeNotFoundError'),
      selectAddressError: label('selectAddressError'),
      errorPrefix: t('common:errorPrefix'),
      oneAddressFound: t('common:addressLookup.oneFound'),
      manyAddressesFound: t('common:addressLookup.manyFound'),
      noAddressesFound: t('common:addressLookup.noneFound'),
    },
  };
}
