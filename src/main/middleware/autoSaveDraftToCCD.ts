/**
 * Auto-saves form data to CCD draft after successful validation.
 *
 * Usage: formBuilder automatically injects this when your step defines `ccdMapping`.
 * You rarely need to call this manually - just add ccdMapping to your step config.
 *
 * Manual usage example (if you have custom logic):
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
 * Maps radio button yes/no/preferNotToSay values to CCD's uppercase enum format.
 * Converts 'yes' to 'YES', 'no' to 'NO', 'preferNotToSay' to 'PREFER_NOT_TO_SAY'
 *
 * IMPORTANT: Only for radio buttons with controlled values, not free-text fields.
 *
 * @example
 * // Correct - radio button with predefined options
 * {
 *   frontendField: 'hadLegalAdvice',
 *   valueMapper: yesNoEnum('receivedFreeLegalAdvice'),
 * }
 *
 * // Wrong - text field with user input
 * {
 *   frontendField: 'userName',
 *   valueMapper: yesNoEnum('userName'), // Will fail validation!
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

    const enumMapping: Record<AllowedValue, string> = {
      yes: 'YES',
      no: 'NO',
      preferNotToSay: 'PREFER_NOT_TO_SAY',
    };

    const isAllowedValue = (ALLOWED_VALUES as readonly string[]).includes(value);

    if (!isAllowedValue) {
      const allowedStr = ALLOWED_VALUES.join(', ');
      logger.error(
        `yesNoEnum: Invalid value "${value}" for field "${backendFieldName}". ` +
          `Allowed values: ${allowedStr}. This indicates a bug in form validation or incorrect mapper usage.`
      );
      // Fail safely by returning empty string instead of invalid data
      return { [backendFieldName]: '' };
    }
    return { [backendFieldName]: enumMapping[value as AllowedValue] };
  };
}

/** Combines separate day/month/year fields into ISO date string (e.g., '1990-02-15') using luxon for validation */
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

/** Passes form fields through to CCD unchanged - simple 1:1 mapping with no transformation */
export function passThrough(fieldNames: readonly string[]): ValueMapper {
  return (formData: FormFieldValue) => {
    if (typeof formData === 'string' || Array.isArray(formData)) {
      logger.warn('passThrough expects an object, received:', typeof formData);
      return {};
    }

    return Object.fromEntries(
      fieldNames.map(name => [name, formData[name]] as const).filter(([, value]) => isNonEmpty(value))
    );
  };
}

/** Converts checkbox array values to uppercase enum format (e.g., ['option1', 'option2'] to ['OPTION_1', 'OPTION_2']) */
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

/** Converts dot-path notation to nested CCD structure (e.g., 'possessionClaimResponse.defendantResponses' becomes nested objects) */
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
    logger.debug(`[${stepName}] Starting auto-save with ${Object.keys(formData).length} fields`);

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
    logger.debug(`[${stepName}] Sending CCD payload for case ${validatedCase.id}`);

    await ccdCaseService.updateDraftRespondToClaim(accessToken, validatedCase.id, ccdPayload);

    // We don't update res.locals.validatedCase here because CCD only returns the fields we just saved,
    // not the full merged case. The next page will fetch fresh complete data via its START callback.
    // This is eventual consistency by design - current page keeps old data, next page gets merged data.

    logger.info(`[${stepName}] Draft saved successfully to CCD`);
  } catch (error) {
    logger.error(`[${stepName}] Failed to save draft to CCD:`, error);
  }
}
