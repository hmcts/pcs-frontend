import type { StepDefinition } from './../interfaces/stepFormData.interface';
import { step as applicationSubmitted } from './userJourney/application-submitted';
import { step as enterAddress } from './userJourney/enter-address';
import { step as enterUserDetails } from './userJourney/enter-user-details';
import { step as summary } from './userJourney/summary';

export const stepsWithContent: StepDefinition[] = [enterUserDetails, enterAddress, summary, applicationSubmitted];

export const protectedSteps = [enterUserDetails, enterAddress, summary, applicationSubmitted];
