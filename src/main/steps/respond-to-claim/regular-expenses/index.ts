import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'regular-expenses',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/regularExpenses.njk`,

  // TODO: Add field configuration for expense categories
  // TODO: Uncomment when backend API field is added to CCD
  // getInitialFormData: req => {
  //   const caseData = req.res?.locals?.validatedCase?.data;
  //   // Map CCD data to form values
  //   return {};
  // },

  // TODO: Uncomment when backend API field is added to CCD
  // beforeRedirect: async req => {
  //   // Save to CCD before redirect
  //   await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  // },

  translationKeys: {
    pageTitle: 'pageTitle',
    question: 'question',
  },

  fields: [],
});
