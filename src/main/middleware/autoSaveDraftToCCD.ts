/**
 * Auto-Save Draft to CCD Middleware
 *
 * Automatically saves form data to CCD draft table on every step submission.
 *
 * Features:
 * - Generic: Works for any step with simple configuration
 * - Helper functions: Reusable transformations (yesNoEnum, dateToISO, etc.)
 * - Convention over Configuration: Minimal setup per step
 * - Non-invasive: No changes to existing step definitions
 *
 * Usage:
 * 1. Add step to STEP_FIELD_MAPPING
 * 2. Register middleware in app.ts
 * 3. Done! Auto-saves on every form submission
 */

import { Logger } from '@hmcts/nodejs-logging';
import type { NextFunction, Request, Response } from 'express';

import { ccdCaseService } from '../services/ccdCaseService';

const logger = Logger.getLogger('autoSaveDraftToCCD');

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Value mapper function: transforms form data to backend format
 *
 * Can accept either:
 * - Single value (for single field mapping)
 * - Full formData object (for multi-field mapping like dates)
 */
type ValueMapper = (valueOrFormData: string | string[] | Record<string, unknown>) => Record<string, unknown>;

/**
 * Step mapping configuration
 */
interface StepMapping {
  backendPath: string; // Where to save in CCD structure (e.g., 'possessionClaimResponse.defendantResponses')
  frontendField?: string; // Single frontend field name (e.g., 'hadLegalAdvice')
  frontendFields?: string[]; // Multiple frontend field names (e.g., ['day', 'month', 'year'])
  valueMapper: ValueMapper; // Transformation function
}

// ============================================================================
// HELPER FUNCTIONS (Reusable Transformations)
// ============================================================================

/**
 * Helper 1: Yes/No radio buttons → YES/NO enum
 *
 * Frontend values: 'yes', 'no', 'preferNotToSay'
 * Backend values: 'YES', 'NO', 'PREFER_NOT_TO_SAY'
 *
 * Usage:
 * valueMapper: yesNoEnum('receivedFreeLegalAdvice')
 */
export function yesNoEnum(backendFieldName: string): ValueMapper {
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

    const transformedValue = enumMapping[value] || value.toUpperCase();

    return { [backendFieldName]: transformedValue };
  };
}

/**
 * Helper 2: Date fields (day/month/year) → ISO date string
 *
 * Frontend values: { day: '15', month: '08', year: '1990' }
 * Backend value: '1990-08-15'
 *
 * Usage:
 * valueMapper: dateToISO('dateOfBirth')
 */
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

/**
 * Helper 3: Pass through fields unchanged (1:1 mapping)
 *
 * Frontend values: { firstName: 'John', lastName: 'Doe' }
 * Backend values: { firstName: 'John', lastName: 'Doe' }
 *
 * Usage:
 * valueMapper: passThrough(['firstName', 'lastName'])
 */
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

/**
 * Helper 4: Multiple yes/no checkboxes → Array of enum values
 *
 * Frontend values: { vulnerabilities: ['mentalHealth', 'disability'] }
 * Backend value: ['MENTAL_HEALTH', 'DISABILITY']
 *
 * Usage:
 * valueMapper: multipleYesNo('vulnerabilities')
 */
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

// ============================================================================
// STEP CONFIGURATION (Add your steps here)
// ============================================================================

/**
 * Step field mapping configuration
 *
 * Add each step that needs auto-save here.
 *
 * Example:
 * 'step-name': {
 *   backendPath: 'possessionClaimResponse.defendantResponses',
 *   frontendField: 'fieldName',
 *   valueMapper: yesNoEnum('backendFieldName'),
 * }
 */
const STEP_FIELD_MAPPING: Record<string, StepMapping> = {
  // Free Legal Advice step
  'free-legal-advice': {
    backendPath: 'possessionClaimResponse.defendantResponses',
    frontendField: 'hadLegalAdvice',
    valueMapper: yesNoEnum('receivedFreeLegalAdvice'),
  },

  // Add more steps here as needed...
  // Example: Date of birth
  // 'defendant-date-of-birth': {
  //   backendPath: 'possessionClaimResponse.defendantResponses',
  //   frontendFields: ['day', 'month', 'year'],
  //   valueMapper: dateToISO('dateOfBirth'),
  // },

  // Example: Name
  // 'defendant-name-capture': {
  //   backendPath: 'possessionClaimResponse.defendantResponses',
  //   frontendFields: ['firstName', 'lastName'],
  //   valueMapper: passThrough(['firstName', 'lastName']),
  // },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extracts step name from URL path
 *
 * Supports:
 * - /steps/{journey}/{stepName} → stepName
 * - /case/{caseReference}/respond-to-claim/{stepName} → stepName
 */
function extractStepName(path: string): string | null {
  const stepsMatch = path.match(/\/steps\/[^/]+\/([^/]+)/);
  if (stepsMatch) {
    return stepsMatch[1];
  }
  const respondToClaimMatch = path.match(/\/case\/[^/]+\/respond-to-claim\/([^/]+)/);
  return respondToClaimMatch ? respondToClaimMatch[1] : null;
}

/**
 * Converts flat object to nested structure based on path
 *
 * Example:
 * pathToNested('a.b.c', { x: 1 }) → { a: { b: { c: { x: 1 } } } }
 */
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

// ============================================================================
// MAIN SAVE FUNCTION
// ============================================================================

/**
 * Saves form data to CCD draft
 */
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

    // Extract relevant fields
    let relevantData: string | string[] | Record<string, unknown>;
    if (config.frontendField) {
      // Single field - could be string or array
      const fieldValue = formData[config.frontendField];
      if (fieldValue === undefined) {
        logger.warn(`[${stepName}] Field '${config.frontendField}' not found in form data, skipping save`);
        return;
      }
      relevantData = fieldValue as string | string[];
    } else if (config.frontendFields) {
      // Multiple fields - collect into object
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
      // All fields
      relevantData = formData;
    }

    // Transform using mapper
    const transformedData = config.valueMapper(relevantData);

    // Convert to nested CCD structure
    const nestedData = pathToNested(config.backendPath, transformedData);

    // Prepare CCD payload - send only incremental changes
    const ccdPayload = {
      submitDraftAnswers: 'No', // Always draft mode
      ...nestedData,
    };

    // Save to CCD
    const updatedCase = await ccdCaseService.updateCase(accessToken, {
      id: ccdCase.id,
      data: ccdPayload,
    });

    // Store only caseId in session (not full merged case data from CCD)
    // Next page GET will fetch fresh data via START event
    req.session.ccdCase = { id: updatedCase.id, data: {} };

    logger.info(`[${stepName}] Draft saved successfully to CCD`);
  } catch (error) {
    logger.error(`[${stepName}] Failed to save draft to CCD:`, error);
    // Don't throw - allow user to continue even if draft save fails
    // The form data is still in session
  }
}

// ============================================================================
// MIDDLEWARE EXPORT
// ============================================================================

/**
 * Auto-save draft middleware
 *
 * Intercepts res.redirect() to save form data to CCD before redirect.
 */
export function autoSaveDraftToCCD(req: Request, res: Response, next: NextFunction): void {
  // Save original redirect function
  const originalRedirect = res.redirect.bind(res);

  // Replace with our version that saves to CCD first
  res.redirect = async function (statusOrUrl: number | string, url?: string): Promise<void> {
    // Properly handle Express redirect signatures:
    // - res.redirect(url) → statusOrUrl is string, url is undefined
    // - res.redirect(status, url) → statusOrUrl is number, url is string
    const isStatusProvided = typeof statusOrUrl === 'number';

    try {
      // Extract step name from current URL
      const stepName = extractStepName(req.path);

      if (!stepName) {
        logger.debug('No step name found in path, skipping auto-save');
        // Call original redirect with proper arguments
        return isStatusProvided ? originalRedirect(statusOrUrl, url!) : originalRedirect(statusOrUrl);
      }

      // Check if this step has CCD mapping
      const config = STEP_FIELD_MAPPING[stepName];

      if (!config) {
        logger.debug(`[${stepName}] No CCD mapping configured, skipping auto-save`);
        return isStatusProvided ? originalRedirect(statusOrUrl, url!) : originalRedirect(statusOrUrl);
      }

      // Get form data from session
      const formData = req.session.formData?.[stepName];

      if (!formData || Object.keys(formData).length === 0) {
        logger.debug(`[${stepName}] No form data in session, skipping auto-save`);
        return isStatusProvided ? originalRedirect(statusOrUrl, url!) : originalRedirect(statusOrUrl);
      }

      // Save to CCD
      await saveToCCD(req, stepName, formData, config);

      // Continue with original redirect
      return isStatusProvided ? originalRedirect(statusOrUrl, url!) : originalRedirect(statusOrUrl);
    } catch (error) {
      logger.error('Error in autoSaveDraftToCCD middleware:', error);
      // Continue with redirect even if save failed
      return isStatusProvided ? originalRedirect(statusOrUrl, url!) : originalRedirect(statusOrUrl);
    }
  };

  next();
}
