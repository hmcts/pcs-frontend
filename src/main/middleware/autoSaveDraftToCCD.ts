/**
 * Auto-saves form data to CCD draft after validation.
 *
 * Called automatically by formBuilder when step has ccdMapping configured.
 */

import type { Request, Response } from 'express';

import type { CcdFieldMapping } from '../interfaces/formFieldConfig.interface';
import { ccdCaseService } from '../services/ccdCaseService';
import { pathToNested } from '../utils/objectHelpers';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('autoSaveDraftToCCD');

/**
 * Auto-saves form data to CCD draft.
 *
 * Reads form data from req.body, transforms it using valueMapper,
 * and saves to CCD draft storage.
 */
export async function autoSaveToCCD(
  req: Request,
  res: Response,
  config: { stepName: string; ccdMapping?: CcdFieldMapping }
): Promise<void> {
  const { stepName, ccdMapping } = config;

  if (!ccdMapping) {
    logger.debug(`[${stepName}] No CCD mapping, skipping save`);
    return;
  }

  const formData = req.body;

  if (!formData || Object.keys(formData).length === 0) {
    logger.debug(`[${stepName}] No form data, skipping save`);
    return;
  }

  await saveToCCD(req, res, stepName, ccdMapping);
}

/**
 * Saves form data to CCD draft.
 *
 * Steps:
 * 1. Extract relevant fields from req.body
 * 2. Transform values (e.g., 'yes' → 'YES')
 * 3. Nest into CCD structure (e.g., possessionClaimResponse.party)
 * 4. Save to CCD API
 */
async function saveToCCD(req: Request, res: Response, stepName: string, ccdMapping: CcdFieldMapping): Promise<void> {
  const validatedCase = res.locals.validatedCase;
  const accessToken = req.session.user?.accessToken;

  if (!validatedCase?.id) {
    logger.warn(`[${stepName}] No case found, skipping save`);
    return;
  }

  if (!accessToken) {
    logger.error(`[${stepName}] No access token`);
    throw new Error('No access token available for CCD update');
  }

  try {
    logger.debug(`[${stepName}] Saving to CCD draft`);

    // Extract relevant fields from req.body
    const relevantData = extractRelevantFields(req, ccdMapping, stepName);
    if (!relevantData) {
      return;
    }

    // Transform to CCD format (e.g., 'yes' → 'YES')
    const transformedData = ccdMapping.valueMapper(relevantData, req);

    if (Object.keys(transformedData).length === 0) {
      logger.debug(`[${stepName}] No data to save`);
      return;
    }

    // Nest into CCD structure
    const nestedData = pathToNested(ccdMapping.backendPath, transformedData);

    // Save to CCD
    await ccdCaseService.updateDraftRespondToClaim(accessToken, validatedCase.id, nestedData);

    logger.info(`[${stepName}] Draft saved to CCD`);
  } catch (error) {
    logger.error(`[${stepName}] Failed to save to CCD:`, error);
  }
}

/**
 * Extracts relevant fields from req.body based on ccdMapping.
 *
 * Three patterns:
 * - frontendField: Extract single field
 * - frontendFields: Extract multiple fields
 * - Neither: Use entire req.body
 */
function extractRelevantFields(
  req: Request,
  ccdMapping: CcdFieldMapping,
  stepName: string
): string | string[] | Record<string, unknown> | null {
  const formData = req.body;

  // Single field (e.g., 'hadLegalAdvice')
  if (ccdMapping.frontendField) {
    const fieldValue = formData[ccdMapping.frontendField];
    if (fieldValue === undefined) {
      logger.warn(`[${stepName}] Field '${ccdMapping.frontendField}' not found`);
      return null;
    }
    return fieldValue as string | string[];
  }

  // Multiple fields (e.g., ['firstName', 'lastName', 'nameConfirmation.firstName'])
  if (ccdMapping.frontendFields) {
    const multiFieldData: Record<string, unknown> = {};
    for (const fieldName of ccdMapping.frontendFields) {
      if (formData[fieldName] !== undefined) {
        multiFieldData[fieldName] = formData[fieldName];
      }
    }
    if (Object.keys(multiFieldData).length === 0) {
      logger.warn(`[${stepName}] No fields found`);
      return null;
    }
    return multiFieldData;
  }

  // Use entire req.body
  return formData;
}
