/**
 * Middleware that intercepts res.redirect() to auto-save form data to CCD draft.
 * Add steps to STEP_FIELD_MAPPING to enable auto-save.
 */

import { Logger } from '@hmcts/nodejs-logging';
import type { NextFunction, Request, Response } from 'express';

import { ccdCaseService } from '../services/ccdCaseService';

const logger = Logger.getLogger('autoSaveDraftToCCD');

type ValueMapper = (valueOrFormData: string | string[] | Record<string, unknown>) => Record<string, unknown>;

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

  return (value: string | string[] | Record<string, unknown>) => {
    if (typeof value !== 'string') {
      logger.warn('yesNoEnum expects a string, received:', typeof value);
      return { [backendFieldName]: '' };
    }

    const enumMapping: Record<string, string> = {
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

    return { [backendFieldName]: enumMapping[value] };
  };
}

/** Combines date fields (day/month/year) into ISO date string */
export function dateToISO(backendFieldName: string): ValueMapper {
  return (formData: string | string[] | Record<string, unknown>) => {
    if (typeof formData === 'string' || Array.isArray(formData)) {
      logger.warn('dateToISO expects an object, received:', typeof formData);
      return {};
    }

    const { day, month, year } = formData;

    if (!day || !month || !year) {
      logger.warn(`Missing date components: day=${day}, month=${month}, year=${year}`);
      return {};
    }

    const paddedMonth = String(month).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
    const isoDate = `${year}-${paddedMonth}-${paddedDay}`;

    return { [backendFieldName]: isoDate };
  };
}

/** Pass through fields unchanged (1:1 mapping) */
export function passThrough(fieldNames: string[]): ValueMapper {
  return (formData: string | string[] | Record<string, unknown>) => {
    if (typeof formData === 'string' || Array.isArray(formData)) {
      logger.warn('passThrough expects an object, received:', typeof formData);
      return {};
    }

    const result: Record<string, unknown> = {};

    for (const fieldName of fieldNames) {
      if (formData[fieldName] !== undefined && formData[fieldName] !== null && formData[fieldName] !== '') {
        result[fieldName] = formData[fieldName];
      }
    }

    return result;
  };
}

/** Transforms array of checkbox values to uppercase enum array */
export function multipleYesNo(backendFieldName: string): ValueMapper {
  return (value: string | string[] | Record<string, unknown>) => {
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

const STEP_FIELD_MAPPING: Record<string, StepMapping> = {
  'free-legal-advice': {
    backendPath: 'possessionClaimResponse.defendantResponses',
    frontendField: 'hadLegalAdvice',
    valueMapper: yesNoEnum('receivedFreeLegalAdvice'),
  },
};

/** Extracts step name from URL path */
function extractStepName(path: string): string | null {
  const stepsMatch = path.match(/\/steps\/[^/]+\/([^/]+)/);
  if (stepsMatch) {
    return stepsMatch[1];
  }
  const respondToClaimMatch = path.match(/\/case\/[^/]+\/respond-to-claim\/([^/]+)/);
  return respondToClaimMatch ? respondToClaimMatch[1] : null;
}

/** Converts dot-path to nested object (e.g., 'a.b.c' → { a: { b: { c: value } } }) */
function pathToNested(path: string, value: Record<string, unknown>): Record<string, unknown> {
  const keys = path.split('.');
  const result: Record<string, unknown> = {};

  keys.reduce((acc, key, index) => {
    if (index === keys.length - 1) {
      acc[key] = value;
    } else {
      acc[key] = {};
    }
    return acc[key] as Record<string, unknown>;
  }, result);

  return result;
}

async function saveToCCD(
  req: Request,
  stepName: string,
  formData: Record<string, unknown>,
  config: StepMapping
): Promise<void> {
  const ccdCase = req.session.ccdCase;
  const accessToken = req.session.user?.accessToken;

  if (!ccdCase?.id) {
    logger.warn(`[${stepName}] No CCD case in session, skipping draft save`);
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
      id: ccdCase.id,
      data: ccdPayload,
    });

    // Store only caseId - next page will fetch fresh data via START event
    req.session.ccdCase = { id: updatedCase.id, data: {} };

    logger.info(`[${stepName}] Draft saved successfully to CCD`);
  } catch (error) {
    logger.error(`[${stepName}] Failed to save draft to CCD:`, error);
  }
}

export function autoSaveDraftToCCD(req: Request, res: Response, next: NextFunction): void {
  const originalRedirect = res.redirect.bind(res);

  res.redirect = async function (statusOrUrl: number | string, url?: string): Promise<void> {
    const isStatusProvided = typeof statusOrUrl === 'number';

    try {
      const stepName = extractStepName(req.path);

      if (!stepName) {
        logger.debug('No step name found in path, skipping auto-save');
        return isStatusProvided ? originalRedirect(statusOrUrl, url!) : originalRedirect(statusOrUrl);
      }

      const config = STEP_FIELD_MAPPING[stepName];

      if (!config) {
        logger.debug(`[${stepName}] No CCD mapping configured, skipping auto-save`);
        return isStatusProvided ? originalRedirect(statusOrUrl, url!) : originalRedirect(statusOrUrl);
      }

      const formData = req.session.formData?.[stepName];

      if (!formData || Object.keys(formData).length === 0) {
        logger.debug(`[${stepName}] No form data in session, skipping auto-save`);
        return isStatusProvided ? originalRedirect(statusOrUrl, url!) : originalRedirect(statusOrUrl);
      }

      await saveToCCD(req, stepName, formData, config);

      return isStatusProvided ? originalRedirect(statusOrUrl, url!) : originalRedirect(statusOrUrl);
    } catch (error) {
      logger.error('Error in autoSaveDraftToCCD middleware:', error);
      return isStatusProvided ? originalRedirect(statusOrUrl, url!) : originalRedirect(statusOrUrl);
    }
  };

  next();
}
