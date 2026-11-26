import { turnedAwayInWales } from '../propertyCountry';
import { EXIT_URL, INFO_TEMPLATE, createStartStep } from '../startStep';

import { getStepTranslations } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createStartStep({
  stepName: 'not-private-landlord',
  stepDir: __dirname,
  fields: [],
  customTemplate: INFO_TEMPLATE,
  extendGetContent: req => ({
    exitUrl: EXIT_URL,
    ...(turnedAwayInWales(req) ? { paragraphs: getStepTranslations(req).walesParagraphs } : {}),
  }),
});
