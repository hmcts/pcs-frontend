import type { JourneyFlowConfig } from '../../app/utils/stepFlow';

/**
 * Step flow configuration for the user journey
 * This defines the order, dependencies, and conditional routing for all steps
 *
 * Example of conditional routing:
 * ```typescript
 * 'enter-address': {
 *   dependencies: ['enter-user-details'],
 *   routes: [
 *     {
 *       condition: (formData, currentStepData) => {
 *         // If user selected "skip address", go to summary
 *         return currentStepData.skipAddress === 'yes';
 *       },
 *       nextStep: 'summary',
 *     },
 *     {
 *       // Default route (no condition)
 *       nextStep: 'enter-address',
 *     },
 *   ],
 * },
 * ```
 */
export const userJourneyFlowConfig: JourneyFlowConfig = {
  // Option 1: Use basePath for custom URL structure (e.g., '/defendant', '/applicant')
  basePath: '/steps/user-journey',

  // Define the default step order
  stepOrder: ['enter-user-details', 'enter-address', 'summary', 'application-submitted'],

  // Step configurations
  // Note: requiresAuth defaults to true if not specified
  steps: {
    'enter-user-details': {
      defaultNext: 'enter-address',
    },
    'enter-address': {
      dependencies: ['enter-user-details'],
      defaultNext: 'summary',
    },
    summary: {
      dependencies: ['enter-user-details', 'enter-address'],
      defaultNext: 'application-submitted',
    },
    'application-submitted': {
      dependencies: ['summary'],
      // This is the end step, so no next step
    },
  },
};
