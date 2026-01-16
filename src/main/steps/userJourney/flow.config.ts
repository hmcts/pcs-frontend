import { type Request } from 'express';

import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

export const flowConfig: JourneyFlowConfig = {
  basePath: '/steps/user-journey',
  stepOrder: [
    'enter-age',
    'enter-dob',
    'enter-ground',
    'enter-other-reason',
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
          condition: async (
            req: Request,
            formData: Record<string, unknown>,
            _currentStepData: Record<string, unknown>
          ): Promise<boolean> => {
            const enterAgeData = formData['enter-age'] as { age?: string } | undefined;
            return Promise.resolve(enterAgeData?.age === 'yes');
          },
          nextStep: 'enter-dob',
        },
        {
          condition: async (
            req: Request,
            formData: Record<string, unknown>,
            _currentStepData: Record<string, unknown>
          ): Promise<boolean> => {
            const enterAgeData = formData['enter-age'] as { age?: string } | undefined;
            return Promise.resolve(enterAgeData?.age === 'no');
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
      defaultNext: 'enter-user-details',
      previousStep: 'enter-ground',
    },
    ineligible: {
      dependencies: ['enter-age'],
      previousStep: 'enter-age',
    },
    'enter-user-details': {
      dependencies: ['enter-other-reason'],
      defaultNext: 'enter-address',
      previousStep: 'enter-other-reason',
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
