/**
 * Auto-save form data to CCD draft for configured steps.
 *
 * Usage: formBuilder auto-injects this when a step defines `ccdMapping`.
 * You can also call it manually from a step's `beforeRedirect` if needed.
 *
 * Example:
 *   const step = createFormStep(
 *     { ... },
 *     templatePath,
 *     async (req, res) => { await autoSaveToCCD(req, res, { stepName: 'step-name', ccdMapping }); }
 *   );
 */

import type { Request, Response } from 'express';
import { DateTime } from 'luxon';

import type {
  CcdFieldMapping,
  CcdMappingContext,
  FormFieldValue,
  ValueMapper,
} from '../interfaces/formFieldConfig.interface';
import { ccdCaseService } from '../services/ccdCaseService';
import { isNonEmpty } from '../utils/objectHelpers';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('autoSaveDraftToCCD');

/**
 * Transforms yes/no/preferNotToSay enum values to CCD uppercase format.
 *
 * IMPORTANT: Only use for controlled enum fields (radio buttons with predefined options).
 * DO NOT use for free-text fields or fields with arbitrary values.
 *
 * @example
 * // Correct usage (radio button with controlled values)
 * {
 *   frontendField: 'hadLegalAdvice',
 *   valueMapper: yesNoEnum('receivedFreeLegalAdvice'),
 * }
 *
 * // Wrong usage (text field)
 * {
 *   frontendField: 'userName',
 *   valueMapper: yesNoEnum('userName'), // Don't do this!
 * }
 */
export function yesNoEnum(backendFieldName: string): ValueMapper {
  const ALLOWED_VALUES = ['yes', 'no', 'preferNotToSay'] as const;
  type AllowedValue = (typeof ALLOWED_VALUES)[number]; // 'yes' | 'no' | 'preferNotToSay'

  return (value: FormFieldValue) => {
    if (typeof value !== 'string') {
      logger.warn('yesNoEnum expects a string, received:', typeof value);
      return { [backendFieldName]: '' };
    }

    // Type-safe mapping: only allowed values as keys
    const enumMapping: Record<AllowedValue, string> = {
      yes: 'YES',
      no: 'NO',
      preferNotToSay: 'PREFER_NOT_TO_SAY',
    };

    // Validate that value is one of the allowed enum values
    const isAllowedValue = (ALLOWED_VALUES as readonly string[]).includes(value);

    if (!isAllowedValue) {
      const allowedStr = ALLOWED_VALUES.join(', ');
      logger.error(
        `yesNoEnum: Invalid value "${value}" for field "${backendFieldName}". ` +
          `Allowed values: ${allowedStr}. This indicates a bug in form validation or incorrect mapper usage.`
      );
      // Return empty string to prevent invalid data in CCD
      return { [backendFieldName]: '' };
    }

    // Type assertion safe here because isAllowedValue check guarantees it
    return { [backendFieldName]: enumMapping[value as AllowedValue] };
  };
}

/** Combines date fields (day/month/year) into ISO date string using luxon */
export function dateToISO(backendFieldName: string): ValueMapper {
  return (formData: FormFieldValue) => {
    if (typeof formData === 'string' || Array.isArray(formData)) {
      logger.warn('dateToISO expects an object, received:', typeof formData);
      return {};
    }

    const { day, month, year } = formData;

    if (!day || !month || !year) {
      logger.warn(`Missing date components: day=${String(day)}, month=${String(month)}, year=${String(year)}`);
      return {};
    }

    // Use luxon for proper date validation and formatting
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

/** Pass through fields unchanged (1:1 mapping) */
export function passThrough(fieldNames: readonly string[]): ValueMapper {
  return (formData: FormFieldValue) => {
    if (typeof formData === 'string' || Array.isArray(formData)) {
      logger.warn('passThrough expects an object, received:', typeof formData);
      return {};
    }

    // Functional approach: map field names to entries, filter non-empty values
    return Object.fromEntries(
      fieldNames.map(name => [name, formData[name]] as const).filter(([, value]) => isNonEmpty(value))
    );
  };
}

/** Transforms array of checkbox values to uppercase enum array */
export function multipleYesNo(backendFieldName: string): ValueMapper {
  return (value: FormFieldValue) => {
    if (!Array.isArray(value)) {
      logger.warn('multipleYesNo expects an array, received:', typeof value);
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

/** Converts dot-path to nested object (e.g., 'a.b.c' → { a: { b: { c: value } } }) */
function pathToNested(path: string, value: Record<string, unknown>): Record<string, unknown> {
  const keys = path.split('.');
  const result: Record<string, unknown> = {};

  void keys.reduce((acc, key, index) => {
    if (index === keys.length - 1) {
      acc[key] = value;
    } else {
      acc[key] = {};
    }
    return acc[key] as Record<string, unknown>;
  }, result);

  return result;
}

/**
 * Auto-saves form data to CCD draft using the provided `ccdMapping`.
 */
export async function autoSaveToCCD(
  req: Request,
  res: Response,
  config: { stepName: string; ccdMapping?: CcdFieldMapping }
): Promise<void> {
  const { stepName, ccdMapping } = config;

  if (!ccdMapping) {
    logger.debug(`[${stepName}] No CCD mapping configured, skipping auto-save`);
    return;
  }

  const formData = req.session.formData?.[stepName];

  if (!formData || Object.keys(formData).length === 0) {
    logger.debug(`[${stepName}] No form data in session, skipping auto-save`);
    return;
  }

  await saveToCCD(req, res, stepName, formData, ccdMapping);
}

async function saveToCCD(
  req: Request,
  res: Response,
  stepName: string,
  formData: Record<string, unknown>,
  ccdMapping: CcdFieldMapping
): Promise<void> {
  const validatedCase = res.locals.validatedCase;
  const accessToken = req.session.user?.accessToken;
  const ctx: CcdMappingContext = { caseData: validatedCase?.data as Record<string, unknown> | undefined };

  if (!validatedCase?.id) {
    logger.warn(`[${stepName}] No validated case, skipping draft save`);
    return;
  }

  if (!accessToken) {
    logger.error(`[${stepName}] No access token in session`);
    throw new Error('No access token available for CCD update');
  }

  try {
    logger.debug(`[${stepName}] Auto-saving to CCD draft`);

    let relevantData: string | string[] | Record<string, unknown>;
    if (ccdMapping.frontendField) {
      const fieldValue = formData[ccdMapping.frontendField];
      if (fieldValue === undefined) {
        logger.warn(`[${stepName}] Field '${ccdMapping.frontendField}' not found in form data, skipping save`);
        return;
      }
      relevantData = fieldValue as string | string[];
    } else if (ccdMapping.frontendFields) {
      const multiFieldData: Record<string, unknown> = {};
      for (const fieldName of ccdMapping.frontendFields) {
        if (formData[fieldName] !== undefined) {
          multiFieldData[fieldName] = formData[fieldName];
        }
      }
      if (Object.keys(multiFieldData).length === 0) {
        logger.warn(`[${stepName}] No matching fields found in form data, skipping save`);
        return;
      }
      relevantData = multiFieldData;
    } else {
      relevantData = formData;
    }

    const transformedData = ccdMapping.valueMapper(relevantData, ctx);

    // Skip save if transformed data is empty (nothing to update)
    if (Object.keys(transformedData).length === 0) {
      logger.debug(`[${stepName}] Transformed data is empty, skipping CCD save`);
      return;
    }

    const nestedData = pathToNested(ccdMapping.backendPath, transformedData);

    const ccdPayload = {
      ...nestedData,
    };

    await ccdCaseService.updateDraftRespondToClaim(accessToken, validatedCase.id, ccdPayload);

    // Don't update res.locals.validatedCase with CCD response
    // CCD submit returns incomplete data (only fields in payload, not full merged case)
    // Keep existing res.locals.validatedCase from start callback (has complete data)
    // Next page will call start callback and get fresh merged data from CCD

    logger.info(`[${stepName}] Draft saved successfully to CCD`);
  } catch (error) {
    logger.error(`[${stepName}] Failed to save draft to CCD:`, error);
  }
}
