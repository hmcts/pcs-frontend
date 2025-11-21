import type { Request } from 'express';

import { createGetController, createPostController } from '../../../app/controller/controllerFactory';
import { getFormData } from '../../../app/controller/formHelpers';
import { type TranslationContent, createGenerateContent } from '../../../app/utils/i18n';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { ccdCaseService } from '../../../services/ccdCaseService';

const stepName = 'enter-user-details';
const generateContent = createGenerateContent(stepName, 'userJourney');

const getFields = (t: TranslationContent = {}): FormFieldConfig[] => {
  const errors = (t.errors as Record<string, string>) || {};
  return [
    {
      name: 'applicantForename',
      type: 'text',
      required: true,
      errorMessage: errors.firstName,
    },
    {
      name: 'applicantSurname',
      type: 'text',
      required: true,
      errorMessage: errors.lastName,
    },
  ];
};

export const step: StepDefinition = {
  url: '/steps/user-journey/enter-user-details',
  name: stepName,
  view: 'steps/userJourney/enterUserDetails.njk',
  stepDir: __dirname,
  generateContent,
  getController: () => {
    return createGetController('steps/userJourney/enterUserDetails.njk', stepName, generateContent, (req, _content) => {
      const savedData = getFormData(req, stepName);
      return {
        ...savedData,
      };
    });
  },
  postController: createPostController(
    stepName,
    generateContent,
    getFields,
    'steps/userJourney/enterUserDetails.njk',
    async (req: Request) => {
      const ccdCase = req.session.ccdCase;
      const user = req.session.user;

      if (ccdCase?.id) {
        req.session.ccdCase = await ccdCaseService.updateCase(user?.accessToken, {
          id: ccdCase.id,
          data: {
            ...ccdCase.data,
            applicantForename: req.body.applicantForename,
            applicantSurname: req.body.applicantSurname,
          },
        });
      } else {
        req.session.ccdCase = await ccdCaseService.createCase(user?.accessToken, {
          applicantForename: req.body.applicantForename,
          applicantSurname: req.body.applicantSurname,
        });
      }
    }
  ),
};
