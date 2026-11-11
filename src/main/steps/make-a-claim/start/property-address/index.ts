import { ADDRESS_TEMPLATE, addressContent, addressFields } from '../../addressFields';
import { propertyEligibilityRedirect } from '../propertyEligibility';
import { createStartStep } from '../startStep';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createStartStep({
  stepName: 'property-address',
  stepDir: __dirname,
  customTemplate: ADDRESS_TEMPLATE,
  invalidates: ['property-country'],
  fields: addressFields('property'),
  beforeRedirect: async req => {
    const redirect = await propertyEligibilityRedirect(req);
    if (redirect) {
      req.res?.redirect(303, redirect);
    }
  },
  extendGetContent: (req, formContent) => ({
    ...addressContent(req, 'property'),
    ...(req.query?.problem === 'tooLong' && !formContent.errorSummary
      ? {
          errorSummary: {
            titleText: getTranslationFunction(req)('errors.title'),
            errorList: [{ text: getTranslationFunction(req)('errors.tooLong'), href: '#property-addressLine1' }],
          },
        }
      : {}),
  }),
});
