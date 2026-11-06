import type { Request } from 'express';

import { MAKE_A_CLAIM_JOURNEY } from '../flow.config';

import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';

export const MAKE_A_CLAIM_START_ROUTE = '/make-a-claim';

const answered =
  (field: string, value: string) =>
  async (_req: Request, _formData: Record<string, unknown>, currentStepData: Record<string, unknown>) =>
    currentStepData[field] === value;

/**
 * The questions asked before a claim exists: who can use the service, then the property. The claim is
 * created once the claimant confirms they are claiming for themselves.
 */
export const startFlowConfig: JourneyFlowConfig = {
  basePath: MAKE_A_CLAIM_START_ROUTE,
  journeyName: MAKE_A_CLAIM_JOURNEY,
  entryStepIdAtBasePath: 'start',
  stepOrder: [
    'start',
    'claimant-type',
    'not-private-landlord',
    'trespass',
    'trespass-ineligible',
    'property-address',
    'property-ineligible',
    'who-is-claiming',
    'not-litigant-in-person',
    'property-country',
    'property-not-covered',
  ],
  steps: {
    start: { requiresAuth: false, defaultNext: 'claimant-type' },
    'claimant-type': {
      requiresAuth: false,
      previousStep: 'start',
      routes: [
        { condition: answered('claimantType', 'PRIVATE_LANDLORD'), nextStep: 'trespass' },
        { nextStep: 'not-private-landlord' },
      ],
    },
    'not-private-landlord': { requiresAuth: false, previousStep: 'claimant-type' },
    trespass: {
      dependencies: ['claimant-type'],
      previousStep: 'claimant-type',
      routes: [
        { condition: answered('isTrespass', 'yes'), nextStep: 'trespass-ineligible' },
        { nextStep: 'property-address' },
      ],
    },
    'trespass-ineligible': { previousStep: 'trespass' },
    'property-address': { dependencies: ['trespass'], previousStep: 'trespass', defaultNext: 'who-is-claiming' },
    'property-ineligible': { previousStep: 'property-address' },
    'who-is-claiming': {
      dependencies: ['property-address'],
      previousStep: 'property-address',
      routes: [{ nextStep: 'not-litigant-in-person' }],
    },
    'not-litigant-in-person': { previousStep: 'who-is-claiming' },
    'property-country': {
      dependencies: ['property-address'],
      previousStep: 'property-address',
      routes: [{ condition: answered('legislativeCountry', 'Wales'), nextStep: 'property-ineligible' }],
    },
    'property-not-covered': { previousStep: 'property-address' },
  },
};
