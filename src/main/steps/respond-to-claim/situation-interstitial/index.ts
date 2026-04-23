import { createRespondToClaimFormStep } from '../formStep';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'your-household-and-circumstances',
  stepDir: __dirname,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    paragraph1: 'paragraph1',
    paragraph2: 'paragraph2',
    paragraph3: 'paragraph3',
    bullet1: 'bullet1',
    bullet2: 'bullet2',
    bullet3: 'bullet3',
    bullet4: 'bullet4',
    bullet5: 'bullet5',
  },
  fields: [],
  customTemplate: `${__dirname}/situationInterstitial.njk`,
});
