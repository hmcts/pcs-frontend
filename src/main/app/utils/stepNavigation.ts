import type { Request } from 'express';

import { userJourneyFlowConfig } from '../../steps/userJourney/flow.config';

import { getNextStep, getPreviousStep, getStepUrl } from './stepFlow';

/**
 * Helper functions for step navigation
 * Use these in your step controllers instead of hardcoded paths
 */
export const stepNavigation = {
  /**
   * Get the next step URL after submitting the current step
   * @param req - Express request object
   * @param currentStepName - Name of the current step
   * @param currentStepData - Data from the current step being submitted (optional)
   * @returns URL of the next step, or null if no next step
   */
  getNextStepUrl: (
    req: Request,
    currentStepName: string,
    currentStepData: Record<string, unknown> = {}
  ): string | null => {
    const formData = req.session.formData || {};
    const nextStep = getNextStep(currentStepName, userJourneyFlowConfig, formData, currentStepData);
    return nextStep ? getStepUrl(nextStep, userJourneyFlowConfig) : null;
  },

  /**
   * Get the back URL for the current step
   * @param req - Express request object
   * @param currentStepName - Name of the current step
   * @returns URL of the previous step, or null if this is the first step
   */
  getBackUrl: (req: Request, currentStepName: string): string | null => {
    const previousStep = getPreviousStep(currentStepName, userJourneyFlowConfig);
    return previousStep ? getStepUrl(previousStep, userJourneyFlowConfig) : null;
  },

  /**
   * Get the URL for a specific step by name
   * @param stepName - Name of the step
   * @returns URL for the step
   */
  getStepUrl: (stepName: string): string => {
    return getStepUrl(stepName, userJourneyFlowConfig);
  },
};
