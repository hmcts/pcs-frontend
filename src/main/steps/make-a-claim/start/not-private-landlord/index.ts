import { turnedAwayInWales } from '../propertyCountry';
import { createStartStep } from '../startStep';

import { getStepTranslations } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createStartStep({
  stepName: 'not-private-landlord',
  stepDir: __dirname,
  fields: [],
  customTemplate: 'make-a-claim/templates/info.njk',
  extendGetContent: req => ({
    exitUrl: 'https://www.gov.uk',
    ...(turnedAwayInWales(req) ? { paragraphs: getStepTranslations(req).walesParagraphs } : {}),
  }),
});
