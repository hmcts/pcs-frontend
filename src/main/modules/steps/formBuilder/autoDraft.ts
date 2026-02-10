/**
 * Auto-Draft System - Convention over Configuration
 *
 * Automatically saves form data to CCD draft with ZERO configuration for standard cases.
 *
 * Design Principles:
 * 1. Convention over Configuration - 90% of steps need zero config
 * 2. Type Safety - Compile-time validation
 * 3. Co-located - Config lives with step definition
 * 4. Smart Defaults - Auto-detects common patterns
 *
 * Usage:
 *
 * // Standard case (zero config):
 * export const step = createFormStep({
 *   stepName: 'free-legal-advice',
 *   saveToDraft: true,  // ← That's it! Auto-detects everything
 *   fields: [...]
 * });
 *
 * // Custom case (need control):
 * export const step = createFormStep({
 *   stepName: 'special-step',
 *   saveToDraft: {
 *     path: 'defendantResponses',
 *     transform: (data) => customTransform(data)
 *   },
 *   fields: [...]
 * });
 */

import { Logger } from '@hmcts/nodejs-logging';
import type { Request } from 'express';

import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import { ccdCaseService } from '../../../services/ccdCaseService';

const logger = Logger.getLogger('autoDraft');

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Draft configuration options
 */
export type DraftConfig =
  | boolean // true = auto mode with conventions
  | {
      path?: 'defendantResponses' | 'defendantContactDetails' | string; // Where to save in CCD structure
      transform?: (formData: Record<string, unknown>, fields: FormFieldConfig[]) => Record<string, unknown>; // Custom transformation
      disabled?: boolean; // Explicitly disable draft save
    };

/**
 * Field type detection for smart defaults
 */
enum FieldPattern {
  DATE = 'date', // day, month, year → ISO date
  ENUM = 'enum', // yes, no → YES, NO
  ADDRESS = 'address', // addressLine1, city, postcode
  PHONE = 'phone', // phoneNumber
  NAME = 'name', // firstName, lastName
  TEXT = 'text', // Plain text, no transformation
}

// ============================================================================
// CONVENTION-BASED AUTO-DETECTION
// ============================================================================

/**
 * Detects field pattern based on field name and type
 *
 * Smart detection:
 * - Fields named 'day', 'month', 'year' → DATE pattern
 * - Radio fields with yes/no → ENUM pattern
 * - Fields with 'address' in name → ADDRESS pattern
 */
function detectFieldPattern(field: FormFieldConfig): FieldPattern {
  const name = field.name.toLowerCase();

  // Date components
  if (['day', 'month', 'year'].includes(name)) {
    return FieldPattern.DATE;
  }

  // Address fields
  if (name.includes('address') || name.includes('postcode') || name.includes('city')) {
    return FieldPattern.ADDRESS;
  }

  // Phone fields
  if (name.includes('phone') || name.includes('mobile')) {
    return FieldPattern.PHONE;
  }

  // Name fields
  if (name.includes('firstname') || name.includes('lastname')) {
    return FieldPattern.NAME;
  }

  // Radio/checkbox with yes/no options → Enum
  if (field.type === 'radio' || field.type === 'checkbox') {
    const hasYesNo = field.options?.some(
      opt => 'value' in opt && ['yes', 'no'].includes(String(opt.value).toLowerCase())
    );
    if (hasYesNo) {
      return FieldPattern.ENUM;
    }
  }

  return FieldPattern.TEXT;
}

/**
 * Detects if step saves to defendantResponses or defendantContactDetails
 *
 * Convention:
 * - Step name contains 'name', 'address', 'contact', 'phone', 'dob' → defendantContactDetails
 * - Everything else → defendantResponses
 */
function detectSavePath(stepName: string, fields: FormFieldConfig[]): string {
  const lowerStep = stepName.toLowerCase();

  // Check step name for contact-related keywords
  const isContactStep =
    lowerStep.includes('name') ||
    lowerStep.includes('address') ||
    lowerStep.includes('contact') ||
    lowerStep.includes('phone') ||
    lowerStep.includes('dob') ||
    lowerStep.includes('date-of-birth') ||
    lowerStep.includes('postcode');

  if (isContactStep) {
    return 'possessionClaimResponse.defendantContactDetails.party';
  }

  // Check field names
  const hasContactFields = fields.some(field => {
    const name = field.name.toLowerCase();
    return (
      name.includes('firstname') ||
      name.includes('lastname') ||
      name.includes('address') ||
      name.includes('phone') ||
      name.includes('dateofbirth')
    );
  });

  if (hasContactFields) {
    return 'possessionClaimResponse.defendantContactDetails.party';
  }

  // Default: defendant responses
  return 'possessionClaimResponse.defendantResponses';
}

/**
 * Auto-transforms field value based on detected pattern
 */
function autoTransformValue(value: unknown, pattern: FieldPattern): unknown {
  switch (pattern) {
    case FieldPattern.ENUM:
      // yes, no, preferNotToSay → YES, NO, PREFER_NOT_TO_SAY
      if (typeof value === 'string') {
        return value
          .replace(/([A-Z])/g, '_$1') // camelCase → snake_case
          .toUpperCase()
          .replace(/^_/, ''); // Remove leading underscore
      }
      return value;

    case FieldPattern.TEXT:
    case FieldPattern.ADDRESS:
    case FieldPattern.PHONE:
    case FieldPattern.NAME:
    default:
      return value;
  }
}

/**
 * Combines date fields (day, month, year) into ISO date string
 */
function combineDateFields(formData: Record<string, unknown>): string | null {
  const { day, month, year } = formData;

  if (!day || !month || !year) {
    return null;
  }

  const paddedMonth = String(month).padStart(2, '0');
  const paddedDay = String(day).padStart(2, '0');

  return `${year}-${paddedMonth}-${paddedDay}`;
}

/**
 * Converts field name to backend format
 *
 * Convention:
 * - hadLegalAdvice → receivedFreeLegalAdvice (special case)
 * - tenancyTypeCorrect → tenancyTypeCorrect (keep as is)
 * - firstName → firstName (keep as is)
 */
function convertFieldName(fieldName: string): string {
  // Special cases (map frontend naming to backend naming)
  const specialCases: Record<string, string> = {
    hadLegalAdvice: 'receivedFreeLegalAdvice',
    // Add more special cases here if needed
  };

  return specialCases[fieldName] || fieldName;
}

// ============================================================================
// AUTO-TRANSFORM FORM DATA
// ============================================================================

/**
 * Automatically transforms form data to CCD structure using conventions
 *
 * Zero configuration! Detects patterns and applies transformations automatically.
 */
function autoTransformFormData(
  formData: Record<string, unknown>,
  fields: FormFieldConfig[],
  _basePath: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Detect if we have date fields
  const hasDateFields = ['day', 'month', 'year'].every(f => f in formData);

  if (hasDateFields) {
    // Combine date fields into single ISO date
    const isoDate = combineDateFields(formData);
    if (isoDate) {
      result.dateOfBirth = isoDate;
    }
    return result;
  }

  // Transform each field
  for (const field of fields) {
    const value = formData[field.name];

    if (value === undefined || value === null || value === '') {
      continue; // Skip empty values
    }

    // Detect pattern and transform
    const pattern = detectFieldPattern(field);
    const transformedValue = autoTransformValue(value, pattern);

    // Convert field name
    const backendFieldName = convertFieldName(field.name);

    result[backendFieldName] = transformedValue;
  }

  return result;
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

  keys.reduce<Record<string, unknown>>((acc, key, index) => {
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
// PUBLIC API
// ============================================================================

/**
 * Saves form data to CCD draft automatically
 *
 * Called from beforeRedirect hook in formBuilder
 */
export async function saveToDraft(
  req: Request,
  stepName: string,
  fields: FormFieldConfig[],
  config: DraftConfig
): Promise<void> {
  // Check if disabled
  if (config === false || (typeof config === 'object' && config.disabled)) {
    logger.info(`[${stepName}] Draft save disabled`);
    return;
  }

  const ccdCase = req.session.ccdCase;
  const formData = req.session.formData?.[stepName];
  const accessToken = req.session.user?.accessToken;

  // Validate prerequisites
  if (!ccdCase?.id) {
    logger.warn(`[${stepName}] No CCD case in session, skipping draft save`);
    return;
  }

  if (!formData || Object.keys(formData).length === 0) {
    logger.info(`[${stepName}] No form data, skipping draft save`);
    return;
  }

  if (!accessToken) {
    throw new Error('No access token in session');
  }

  try {
    logger.info(`[${stepName}] Auto-saving to draft...`);

    // Determine save path (auto-detect or use config)
    let savePath: string;
    let transformedData: Record<string, unknown>;

    if (typeof config === 'object' && config.transform) {
      // Custom transformation provided
      transformedData = config.transform(formData, fields);
      savePath = config.path || detectSavePath(stepName, fields);
    } else {
      // Auto-detect and auto-transform
      savePath = typeof config === 'object' && config.path ? config.path : detectSavePath(stepName, fields);
      transformedData = autoTransformFormData(formData, fields, savePath);
    }

    logger.info(`[${stepName}] Save path: ${savePath}`);
    logger.info(`[${stepName}] Transformed data:`, JSON.stringify(transformedData, null, 2));

    // Convert to nested CCD structure
    const ccdData = pathToNested(savePath, transformedData);

    // Save to CCD
    const updatedCase = await ccdCaseService.updateCase(accessToken, {
      id: ccdCase.id,
      data: {
        submitDraftAnswers: 'No', // Draft mode
        ...ccdData,
      },
    });

    // Store only caseId in session (not full merged case data from CCD)
    // Next page GET will fetch fresh data via START event
    req.session.ccdCase = { id: updatedCase.id, data: {} };

    logger.info(`[${stepName}] ✅ Draft saved successfully`);
  } catch (error) {
    logger.error(`[${stepName}] ❌ Failed to save draft:`, error);
    throw error;
  }
}

/**
 * Returns true if step has draft save enabled
 */
export function isDraftSaveEnabled(config: DraftConfig | undefined): boolean {
  if (config === undefined) {
    return false;
  }

  if (typeof config === 'boolean') {
    return config;
  }

  return !config.disabled;
}
