import type { Request } from 'express';

import { createGetController, createPostController } from '../../../app/controller/controllerFactory';
import { getFormData } from '../../../app/controller/formHelpers';
import { type TranslationContent, createGenerateContent } from '../../../app/utils/i18n';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

const stepName = 'enter-ground';
const generateContent = createGenerateContent(stepName, 'userJourney');

const getFields = (t: TranslationContent = {}): FormFieldConfig[] => {
  const errors = (t.errors as Record<string, string>) || {};
  return [
    {
      name: 'grounds',
      type: 'checkbox',
      required: true,
      errorMessage: errors.grounds,
    },
  ];
};

export const step: StepDefinition = {
  url: '/steps/user-journey/enter-ground',
  name: stepName,
  view: 'steps/userJourney/enterGround.njk',
  stepDir: __dirname,
  generateContent,
  getController: () => {
    return createGetController('steps/userJourney/enterGround.njk', stepName, generateContent, (req, _content) => {
      const savedData = getFormData(req, stepName);
      return {
        ...savedData,
        grounds: savedData?.grounds || [],
      };
    });
  },
  postController: createPostController(
    stepName,
    generateContent,
    getFields,
    'steps/userJourney/enterGround.njk',
    async (req: Request) => {
      // Normalize checkbox values - Express sends a single string when only one checkbox is selected
      if (req.body.grounds && typeof req.body.grounds === 'string') {
        req.body.grounds = [req.body.grounds];
      }
    }
  ),
};
