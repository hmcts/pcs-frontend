/**
 * CCD Mappers - Transform frontend form values to CCD backend format
 *
 * These mappers convert form field values (lowercase, camelCase) to CCD enum format (UPPERCASE, SNAKE_CASE).
 * They are reusable across multiple steps that need the same transformation logic.
 *
 * Usage:
 *   import { mapYesNoPreferNotToSay, mapYesNo, dateToISO } from '@mappers/ccdMappers';
 *
 *   ccdMapping: {
 *     backendPath: 'possessionClaimResponse.defendantResponses',
 *     frontendField: 'hadLegalAdvice',
 *     valueMapper: mapYesNoPreferNotToSay('receivedFreeLegalAdvice'),
 *   }
 */

import { DateTime } from 'luxon';

import type { FormFieldValue, ValueMapper } from '../interfaces/formFieldConfig.interface';
import { isNonEmpty } from '../utils/objectHelpers';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('ccdMappers');

/**
 * Maps yes/no/preferNotToSay radio values to CCD enum (YES/NO/PREFER_NOT_TO_SAY).
 *
 * Use this for fields that offer three options: yes, no, and prefer not to say.
 * Commonly used for sensitive questions like legal advice, support services, etc.
 *
 * @param backendFieldName - The CCD field name to save the mapped value to
 *
 * @example
 * // Step configuration
 * {
 *   frontendField: 'hadLegalAdvice',
 *   valueMapper: mapYesNoPreferNotToSay('receivedFreeLegalAdvice'),
 * }
 *
 * // Form submission: { hadLegalAdvice: 'yes' }
 * // CCD save: { receivedFreeLegalAdvice: 'YES' }
 */
export function mapYesNoPreferNotToSay(backendFieldName: string): ValueMapper {
  const ALLOWED_VALUES = ['yes', 'no', 'preferNotToSay'] as const;
  type AllowedValue = (typeof ALLOWED_VALUES)[number];

  return (value: FormFieldValue) => {
    if (typeof value !== 'string') {
      logger.warn(`mapYesNoPreferNotToSay expects a string, received: ${typeof value}`);
      return { [backendFieldName]: '' };
    }

    const enumMapping: Record<AllowedValue, string> = {
      yes: 'YES',
      no: 'NO',
      preferNotToSay: 'PREFER_NOT_TO_SAY',
    };

    const isAllowedValue = (ALLOWED_VALUES as readonly string[]).includes(value);

    if (!isAllowedValue) {
      const allowedStr = ALLOWED_VALUES.join(', ');
      logger.error(
        `mapYesNoPreferNotToSay: Invalid value "${value}" for field "${backendFieldName}". ` +
          `Allowed values: ${allowedStr}. This indicates a bug in form validation or incorrect mapper usage.`
      );
      return { [backendFieldName]: '' };
    }

    return { [backendFieldName]: enumMapping[value as AllowedValue] };
  };
}

/**
 * Maps simple yes/no radio values to CCD enum (YES/NO).
 *
 * Use this for binary yes/no questions without a "prefer not to say" option.
 * Commonly used for contact preferences, confirmations, simple eligibility checks.
 *
 * @param backendFieldName - The CCD field name to save the mapped value to
 *
 * @example
 * // Step configuration
 * {
 *   frontendField: 'telephonePreference',
 *   valueMapper: mapYesNo('canContactByPhone'),
 * }
 *
 * // Form submission: { telephonePreference: 'yes' }
 * // CCD save: { canContactByPhone: 'YES' }
 */
export function mapYesNo(backendFieldName: string): ValueMapper {
  const ALLOWED_VALUES = ['yes', 'no'] as const;
  type AllowedValue = (typeof ALLOWED_VALUES)[number];

  return (value: FormFieldValue) => {
    if (typeof value !== 'string') {
      logger.warn(`mapYesNo expects a string, received: ${typeof value}`);
      return { [backendFieldName]: '' };
    }

    const enumMapping: Record<AllowedValue, string> = {
      yes: 'YES',
      no: 'NO',
    };

    const isAllowedValue = (ALLOWED_VALUES as readonly string[]).includes(value);

    if (!isAllowedValue) {
      const allowedStr = ALLOWED_VALUES.join(', ');
      logger.error(
        `mapYesNo: Invalid value "${value}" for field "${backendFieldName}". ` +
          `Allowed values: ${allowedStr}. This indicates a bug in form validation or incorrect mapper usage.`
      );
      return { [backendFieldName]: '' };
    }

    return { [backendFieldName]: enumMapping[value as AllowedValue] };
  };
}

/**
 * Maps yes/no/notSure radio values to CCD enum (YES/NO/NOT_SURE).
 *
 * Use this for questions where the user might not know the answer.
 * Commonly used for date confirmations, historical information, etc.
 *
 * @param backendFieldName - The CCD field name to save the mapped value to
 *
 * @example
 * // Step configuration
 * {
 *   frontendField: 'tenancyStartDateKnown',
 *   valueMapper: mapYesNoNotSure('tenancyStartDateConfirmation'),
 * }
 *
 * // Form submission: { tenancyStartDateKnown: 'notSure' }
 * // CCD save: { tenancyStartDateConfirmation: 'NOT_SURE' }
 */
export function mapYesNoNotSure(backendFieldName: string): ValueMapper {
  const ALLOWED_VALUES = ['yes', 'no', 'notSure'] as const;
  type AllowedValue = (typeof ALLOWED_VALUES)[number];

  return (value: FormFieldValue) => {
    if (typeof value !== 'string') {
      logger.warn(`mapYesNoNotSure expects a string, received: ${typeof value}`);
      return { [backendFieldName]: '' };
    }

    const enumMapping: Record<AllowedValue, string> = {
      yes: 'YES',
      no: 'NO',
      notSure: 'NOT_SURE',
    };

    const isAllowedValue = (ALLOWED_VALUES as readonly string[]).includes(value);

    if (!isAllowedValue) {
      const allowedStr = ALLOWED_VALUES.join(', ');
      logger.error(
        `mapYesNoNotSure: Invalid value "${value}" for field "${backendFieldName}". ` +
          `Allowed values: ${allowedStr}. This indicates a bug in form validation or incorrect mapper usage.`
      );
      return { [backendFieldName]: '' };
    }

    return { [backendFieldName]: enumMapping[value as AllowedValue] };
  };
}

/**
 * Combines separate day/month/year fields into ISO date string (YYYY-MM-DD).
 *
 * Uses Luxon for date validation and formatting.
 * Returns empty object if date is invalid or components are missing.
 *
 * @param backendFieldName - The CCD field name to save the ISO date to
 *
 * @example
 * // Step configuration
 * {
 *   frontendField: 'dateOfBirth',
 *   valueMapper: dateToISO('defendantDateOfBirth'),
 * }
 *
 * // Form submission: { dateOfBirth: { day: '15', month: '02', year: '1990' } }
 * // CCD save: { defendantDateOfBirth: '1990-02-15' }
 */
export function dateToISO(backendFieldName: string): ValueMapper {
  return (formData: FormFieldValue) => {
    if (typeof formData === 'string' || Array.isArray(formData)) {
      logger.warn(`dateToISO expects an object, received: ${typeof formData}`);
      return {};
    }

    const { day, month, year } = formData;

    if (!day || !month || !year) {
      logger.warn(`Missing date components: day=${String(day)}, month=${String(month)}, year=${String(year)}`);
      return {};
    }

    const dateTime = DateTime.fromObject({
      year: Number(year),
      month: Number(month),
      day: Number(day),
    });

    if (!dateTime.isValid) {
      logger.warn(
        `Invalid date: ${dateTime.invalidReason} (day=${String(day)}, month=${String(month)}, year=${String(year)})`
      );
      return {};
    }

    return { [backendFieldName]: dateTime.toISODate() };
  };
}

/**
 * Passes form fields through to CCD unchanged - simple 1:1 mapping with no transformation.
 *
 * Use this for text fields, names, addresses, etc. that don't need enum conversion.
 * Filters out empty values automatically.
 *
 * @param fieldNames - Array of field names to pass through
 *
 * @example
 * // Step configuration
 * {
 *   frontendFields: ['firstName', 'lastName'],
 *   valueMapper: passThrough(['firstName', 'lastName']),
 * }
 *
 * // Form submission: { firstName: 'John', lastName: 'Doe' }
 * // CCD save: { firstName: 'John', lastName: 'Doe' }
 */
export function passThrough(fieldNames: readonly string[]): ValueMapper {
  return (formData: FormFieldValue) => {
    if (typeof formData === 'string' || Array.isArray(formData)) {
      logger.warn(`passThrough expects an object, received: ${typeof formData}`);
      return {};
    }

    return Object.fromEntries(
      fieldNames.map(name => [name, formData[name]] as const).filter(([, value]) => isNonEmpty(value))
    );
  };
}

/**
 * Converts checkbox array values to uppercase enum format.
 *
 * Transforms camelCase values to SNAKE_CASE CCD enum format.
 * Used for multi-select checkboxes that map to CCD enum arrays.
 *
 * @param backendFieldName - The CCD field name to save the array to
 *
 * @example
 * // Step configuration
 * {
 *   frontendField: 'supportServices',
 *   valueMapper: multipleYesNo('selectedSupportServices'),
 * }
 *
 * // Form submission: { supportServices: ['legalAdvice', 'financialSupport'] }
 * // CCD save: { selectedSupportServices: ['LEGAL_ADVICE', 'FINANCIAL_SUPPORT'] }
 */
export function multipleYesNo(backendFieldName: string): ValueMapper {
  return (value: FormFieldValue) => {
    if (!Array.isArray(value)) {
      logger.warn(`multipleYesNo expects an array, received: ${typeof value}`);
      return { [backendFieldName]: [] };
    }

    const transformedValues = value.map(v =>
      v
        .replace(/([A-Z])/g, '_$1')
        .toUpperCase()
        .replace(/^_/, '')
    );

    return { [backendFieldName]: transformedValues };
  };
}
