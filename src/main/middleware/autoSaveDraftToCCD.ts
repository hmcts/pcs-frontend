/**
 * Auto-save form data to CCD draft for configured steps.
 *
 * Usage: Call autoSaveToCCD() in formBuilder's beforeRedirect callback.
 * Add steps to STEP_FIELD_MAPPING to enable auto-save.
 *
 * Example:
 *   const step = createFormStep(
 *     { ... },
 *     templatePath,
 *     async (req, res) => { await autoSaveToCCD(req, res, 'step-name'); }
 *   );
 */

import { Logger } from '@hmcts/nodejs-logging';
import type { NextFunction, Request, Response } from 'express';
import { DateTime } from 'luxon';

import { ccdCaseService } from '../services/ccdCaseService';
import { isNonEmpty } from '../utils/objectHelpers';

const logger = Logger.getLogger('autoSaveDraftToCCD');

type FormFieldValue = string | string[] | Record<string, unknown>;
type ValueMapper = (valueOrFormData: FormFieldValue) => Record<string, unknown>;

interface StepMapping {
  backendPath: string;
  frontendField?: string;
  frontendFields?: string[];
  valueMapper: ValueMapper;
}

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

export const STEP_FIELD_MAPPING: Record<string, StepMapping> = {
  'free-legal-advice': {
    backendPath: 'possessionClaimResponse.defendantResponses',
    frontendField: 'hadLegalAdvice',
    valueMapper: yesNoEnum('receivedFreeLegalAdvice'),
  },
};

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
 * Auto-saves form data to CCD draft if step is configured in STEP_FIELD_MAPPING.
 * Use this in formBuilder's beforeRedirect callback instead of middleware.
 */
export async function autoSaveToCCD(req: Request, res: Response, stepName: string): Promise<void> {
  const config = STEP_FIELD_MAPPING[stepName];

  if (!config) {
    logger.debug(`[${stepName}] No CCD mapping configured, skipping auto-save`);
    return;
  }

  const formData = req.session.formData?.[stepName];

  if (!formData || Object.keys(formData).length === 0) {
    logger.debug(`[${stepName}] No form data in session, skipping auto-save`);
    return;
  }

  await saveToCCD(req, res, stepName, formData, config);
}

async function saveToCCD(
  req: Request,
  res: Response,
  stepName: string,
  formData: Record<string, unknown>,
  config: StepMapping
): Promise<void> {
  const validatedCase = res.locals.validatedCase;
  const accessToken = req.session.user?.accessToken;

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
    if (config.frontendField) {
      const fieldValue = formData[config.frontendField];
      if (fieldValue === undefined) {
        logger.warn(`[${stepName}] Field '${config.frontendField}' not found in form data, skipping save`);
        return;
      }
      relevantData = fieldValue as string | string[];
    } else if (config.frontendFields) {
      const multiFieldData: Record<string, unknown> = {};
      for (const fieldName of config.frontendFields) {
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

    const transformedData = config.valueMapper(relevantData);
    const nestedData = pathToNested(config.backendPath, transformedData);

    const ccdPayload = {
      submitDraftAnswers: 'No',
      ...nestedData,
    };

    const updatedCase = await ccdCaseService.updateCase(accessToken, {
      id: validatedCase.id,
      data: ccdPayload,
    });

    // Update res.locals with merged case data from CCD
    res.locals.validatedCase = updatedCase;

    logger.info(`[${stepName}] Draft saved successfully to CCD`);
  } catch (error) {
    logger.error(`[${stepName}] Failed to save draft to CCD:`, error);
  }
}

/**
 * DEPRECATED: Do not use this middleware approach.
 * Instead, call autoSaveToCCD() directly in formBuilder's beforeRedirect callback.
 *
 * @deprecated Use autoSaveToCCD() function instead
 */
export function autoSaveDraftToCCD(_req: Request, _res: Response, next: NextFunction): void {
  logger.warn('autoSaveDraftToCCD middleware is deprecated. Use autoSaveToCCD() in beforeRedirect callback instead.');
  next();
}
