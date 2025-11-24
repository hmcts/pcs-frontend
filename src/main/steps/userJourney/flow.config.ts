import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

export const userJourneyFlowConfig: JourneyFlowConfig = {
  basePath: '/steps/user-journey',
  stepOrder: [
    'enter-age',
    'enter-ground',
    'ineligible',
    'enter-user-details',
    'enter-address',
    'summary',
    'application-submitted',
  ],
  steps: {
    'enter-age': {
      routes: [
        {
          condition: (formData: Record<string, unknown>, _currentStepData: Record<string, unknown>): boolean => {
            const enterAgeData = formData['enter-age'] as { age?: string } | undefined;
            return enterAgeData?.age === 'yes';
          },
          nextStep: 'enter-ground',
        },
        {
          condition: (formData: Record<string, unknown>, _currentStepData: Record<string, unknown>): boolean => {
            const enterAgeData = formData['enter-age'] as { age?: string } | undefined;
            return enterAgeData?.age === 'no';
          },
          nextStep: 'ineligible',
        },
      ],
    },
    'enter-ground': {
      dependencies: ['enter-age'],
      defaultNext: 'enter-user-details',
      previousStep: 'enter-age',
    },
    ineligible: {
      dependencies: ['enter-age'],
      previousStep: 'enter-age',
    },
    'enter-user-details': {
      dependencies: ['enter-ground'],
      defaultNext: 'enter-address',
      previousStep: 'enter-ground',
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
    },
  },
};
