import { Logger } from '@hmcts/nodejs-logging';
import type { Request } from 'express';

import { getFormData } from '../controller/sessionHelper';

import { stepRegistry } from './stepRegistry';

const logger = Logger.getLogger('navigation');

export function getAllFormData(req: Request): Record<string, unknown> {
  const allData: Record<string, unknown> = {};
  const allSteps = stepRegistry.getAllSteps();

  for (const step of allSteps) {
    const stepData = getFormData(req, step.name);
    if (stepData && Object.keys(stepData).length > 0) {
      Object.assign(allData, stepData);
    }
  }

  return allData;
}

export function getNextStepUrl(
  currentStepName: string,
  formData: Record<string, unknown>,
  allData: Record<string, unknown>
): string {
  const nextStepName = stepRegistry.getNextStepName(currentStepName, formData, allData);

  if (!nextStepName) {
    logger.error('No next step found', {
      currentStepName,
      stepOrder: stepRegistry.getStepOrder(),
    });
    throw new Error(`No next step found for: ${currentStepName}`);
  }

  const nextStep = stepRegistry.getStep(nextStepName);
  if (!nextStep) {
    logger.error('Next step not found in registry', {
      nextStepName,
      currentStepName,
    });
    throw new Error(`Step not found: ${nextStepName}`);
  }

  return nextStep.url;
}

export function getPreviousStepUrl(currentStepName: string, allData: Record<string, unknown>): string | null {
  const prevStepName = stepRegistry.getPreviousStepName(currentStepName, allData);

  if (!prevStepName) {
    return null;
  }

  const prevStep = stepRegistry.getStep(prevStepName);
  if (!prevStep) {
    return null;
  }

  return prevStep.url;
}

export function getBackUrl(req: Request, currentStepName: string): string | null {
  const allData = getAllFormData(req);
  return getPreviousStepUrl(currentStepName, allData);
}

export function getCompletedSteps(req: Request): string[] {
  const completedSteps: string[] = [];
  const allSteps = stepRegistry.getAllSteps();

  for (const step of allSteps) {
    const stepData = getFormData(req, step.name);
    if (stepData && Object.keys(stepData).length > 0) {
      completedSteps.push(step.name);
    }
  }

  return completedSteps;
}
