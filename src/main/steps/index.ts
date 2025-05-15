import { step as page1 } from './page1';
import { step as page2 } from './page2';
import { step as page3Yes } from './page3Yes';
import { step as page3No } from './page3No';
import { step as page4 } from './page4';
import { StepDefinition } from './types';

export const stepsWithContent: StepDefinition[] = [page1, page2, page3Yes, page3No, page4];
