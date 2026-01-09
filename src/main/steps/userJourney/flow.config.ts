import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

export const flowConfig: JourneyFlowConfig = {
  basePath: '/steps/user-journey',
  stepOrder: [
    'enter-age',
    'enter-dob',
    'enter-ground',
    'enter-other-reason',
    'ineligible',
    'enter-contact-preferences',
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
          nextStep: 'enter-dob',
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
    'enter-dob': {
      dependencies: ['enter-age'],
      defaultNext: 'enter-ground',
      previousStep: 'enter-age',
    },
    'enter-ground': {
      dependencies: ['enter-dob'],
      defaultNext: 'enter-other-reason',
      previousStep: 'enter-dob',
    },
    'enter-other-reason': {
      dependencies: ['enter-ground'],
      defaultNext: 'enter-contact-preferences',
      previousStep: 'enter-ground',
    },
    ineligible: {
      dependencies: ['enter-age'],
      previousStep: 'enter-age',
    },
    'enter-contact-preferences': {
      dependencies: ['enter-other-reason'],
      defaultNext: 'enter-user-details',
      previousStep: 'enter-other-reason',
    },
    'enter-user-details': {
      dependencies: ['enter-contact-preferences'],
      defaultNext: 'enter-address',
      previousStep: 'enter-contact-preferences',
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
