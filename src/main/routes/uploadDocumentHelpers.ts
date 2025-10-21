import { Logger } from '@hmcts/nodejs-logging';
import { Response } from 'express';

const logger = Logger.getLogger('uploadDocument');

interface ServiceResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

/**
 * Handles the result from a service call with consistent logging and response
 */
export const handleServiceResult = (
  res: Response,
  result: ServiceResult,
  stage: string,
  operation: string
): Response => {
  if (result.success) {
    logger.info(`[uploadDocument-POC] ${stage} Complete: ${operation} successful`);
    return res.json(result);
  } else {
    logger.error(`[uploadDocument-POC] ${stage} Failed: ${operation} error:`, result.error);
    return res.status(500).json({
      success: false,
      error: `${operation} failed`,
      message: result.error,
    });
  }
};

/**
 * Handles unexpected errors in route handlers with consistent logging and response
 */
export const handleRouteError = (res: Response, error: unknown, stage: string, operation: string): Response => {
  logger.error(`[uploadDocument-POC] ${stage}: Unexpected error:`, error);
  return res.status(500).json({
    success: false,
    error: `${operation} failed`,
    message: error instanceof Error ? error.message : 'Unknown error occurred',
  });
};
