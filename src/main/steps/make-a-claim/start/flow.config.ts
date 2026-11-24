import type { Request } from 'express';

import { MAKE_A_CLAIM_START_ROUTE } from '../../../constants/makeAClaimRoutes';
import { MAKE_A_CLAIM_JOURNEY } from '../flow.config';

import { isWelshProperty, turnedAwayInWales } from './propertyCountry';

import { getFormData } from '@modules/steps';
import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';

export { MAKE_A_CLAIM_START_ROUTE };

const answered =
  (field: string, value: string) =>
  async (_req: Request, _formData: Record<string, unknown>, currentStepData: Record<string, unknown>) =>
    currentStepData[field] === value;

/**
 * The questions asked before a claim exists: who can use the service, then the property. A property in Wales is
 * asked the Wales claimant type. The claim is created once the claimant confirms they are claiming for themselves.
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
    'wales-claimant-type',
    'who-is-claiming',
    'not-litigant-in-person',
    'property-country',
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
    'not-private-landlord': {
      requiresAuth: false,
      previousStep: (req: Request) => (turnedAwayInWales(req) ? 'wales-claimant-type' : 'claimant-type'),
    },
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
    'wales-claimant-type': {
      dependencies: ['property-address'],
      previousStep: (req: Request) =>
        getFormData(req, 'property-country').legislativeCountry ? 'property-country' : 'property-address',
      routes: [
        { condition: answered('walesClaimantType', 'PRIVATE_LANDLORD'), nextStep: 'who-is-claiming' },
        { nextStep: 'not-private-landlord' },
      ],
    },
    'who-is-claiming': {
      dependencies: ['property-address'],
      previousStep: (req: Request) => (isWelshProperty(req) ? 'wales-claimant-type' : 'property-address'),
      routes: [{ nextStep: 'not-litigant-in-person' }],
    },
    'not-litigant-in-person': { previousStep: 'who-is-claiming' },
    'property-country': {
      dependencies: ['property-address'],
      previousStep: 'property-address',
      routes: [
        { condition: answered('legislativeCountry', 'Wales'), nextStep: 'wales-claimant-type' },
        { nextStep: 'who-is-claiming' },
      ],
    },
  },
};
