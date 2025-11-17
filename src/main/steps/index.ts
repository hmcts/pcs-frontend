import type { StepDefinition } from './../interfaces/stepFormData.interface';
import { step as confirmation } from './eligibility/confirmation';
import { step as correspondenceAddress } from './eligibility/correspondence-address';
import { step as ineligible } from './eligibility/ineligible';
import { step as page2 } from './eligibility/page2';
import { step as page3 } from './eligibility/page3';
import { step as page4 } from './eligibility/page4';
import { step as page5 } from './eligibility/page5';
import { step as eligibilityStart } from './eligibility/start';
import { step as eligibilitySummary } from './eligibility/summary';
import { step as applicationSubmitted } from './userJourney/application-submitted';
import { step as enterAddress } from './userJourney/enter-address';
import { step as enterUserDetails } from './userJourney/enter-user-details';
import { step as summary } from './userJourney/summary';

export const stepsWithContent: StepDefinition[] = [
  enterUserDetails,
  enterAddress,
  summary,
  applicationSubmitted,
  eligibilityStart,
  page2,
  page3,
  page4,
  page5,
  correspondenceAddress,
  eligibilitySummary,
  confirmation,
  ineligible,
];

export const protectedSteps = [enterUserDetails, enterAddress, summary, applicationSubmitted];
