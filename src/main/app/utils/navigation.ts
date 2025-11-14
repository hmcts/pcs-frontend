import type { Request } from 'express';

import { getFormData } from '../controller/sessionHelper';

import { stepRegistry } from './stepRegistry';

/**
 * Get all form data from all steps
 */
export function getAllFormData(req: Request): Record<string, unknown> {
  const allData: Record<string, unknown> = {};
  const allSteps = stepRegistry.getAllSteps();

  for (const step of allSteps) {
    const stepData = getFormData(req, step.name);
    if (stepData && Object.keys(stepData).length > 0) {
      // Merge step data into allData
      Object.assign(allData, stepData);
    }
  }

  return allData;
}

/**
 * Get the URL for the next step
 * Language is handled by i18next-http-middleware via cookies, so no query string needed
 */
export function getNextStepUrl(
  currentStepName: string,
  formData: Record<string, unknown>,
  allData: Record<string, unknown>
): string {
  const nextStepName = stepRegistry.getNextStepName(currentStepName, formData, allData);

  if (!nextStepName) {
    throw new Error(`No next step found for: ${currentStepName}`);
  }

  const nextStep = stepRegistry.getStep(nextStepName);
  if (!nextStep) {
    throw new Error(`Step not found: ${nextStepName}`);
  }

  // i18next-http-middleware handles language via cookies, no need for query string
  return nextStep.url;
}

/**
 * Get the URL for the previous step
 * Language is handled by i18next-http-middleware via cookies, so no query string needed
 */
export function getPreviousStepUrl(currentStepName: string, allData: Record<string, unknown>): string | null {
  const prevStepName = stepRegistry.getPreviousStepName(currentStepName, allData);

  if (!prevStepName) {
    return null; // First step, no back button
  }

  const prevStep = stepRegistry.getStep(prevStepName);
  if (!prevStep) {
    return null;
  }

  // i18next-http-middleware handles language via cookies, no need for query string
  return prevStep.url;
}

/**
 * Helper to get back URL in getController
 */
export function getBackUrl(req: Request, currentStepName: string): string | null {
  const allData = getAllFormData(req);
  return getPreviousStepUrl(currentStepName, allData);
}
