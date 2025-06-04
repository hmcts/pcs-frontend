import type { StepDefinition } from './../interfaces/stepFormData.interface';
import { step as page1 } from './page1';
import { step as page2 } from './page2';
import { step as page3No } from './page3No';
import { step as page3Yes } from './page3Yes';
import { step as page4 } from './page4';

import { step as enterUserDetails } from './userJourney/enter-user-details';
import { step as enterAddress } from './userJourney/enter-address';
import { step as summary }  from './userJourney/summary';
import { step as applicationSubmitted }  from './userJourney/application-submitted';

export const stepsWithContent: StepDefinition[] =
[page1, page2, page3Yes, page3No, page4, enterUserDetails,
  enterAddress,
  summary, applicationSubmitted];

export const protectedSteps = [
  enterUserDetails,
  enterAddress,
  summary,
  applicationSubmitted
];

