import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'priority-debts',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/priorityDebts.njk`,

  // TODO: Uncomment when backend API field is added to CCD
  // getInitialFormData: (req: Request) => {
  //   const caseData = req.res?.locals?.validatedCase?.data;
  //   const response = caseData?.possessionClaimResponse?.defendantResponses;
  //
  //   if (!response) return {};
  //
  //   const formData: Record<string, unknown> = {};
  //
  //   if (response.hasPriorityDebts) {
  //     formData.hasPriorityDebts = response.hasPriorityDebts;
  //   }
  //
  //   return formData;
  // },

  // TODO: Uncomment when backend API field is added to CCD
  // beforeRedirect: async (req: Request) => {
  //   const hasPriorityDebts = req.body?.hasPriorityDebts as string | undefined;
  //
  //   if (!hasPriorityDebts) return;
  //
  //   const possessionClaimResponse: PossessionClaimResponse = {
  //     defendantResponses: {
  //       hasPriorityDebts,
  //     },
  //   };
  //
  //   await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  // },

  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
    paragraph1: 'paragraph1',
    paragraph2: 'paragraph2',
    bulletList: 'bulletList',
    guidanceLinkText: 'guidanceLink.text',
    guidanceLinkUrl: 'guidanceLink.url',
    question: 'question',
  },

  fields: [
    {
      name: 'hasPriorityDebts',
      type: 'radio',
      required: true,
      errorMessage: 'errors.hasPriorityDebts.required',
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        { value: 'yes', translationKey: 'options.yes' },
        { value: 'no', translationKey: 'options.no' },
      ],
    },
  ],
});
