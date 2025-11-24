import type { Request } from 'express';

import { createGetController, createPostController } from '../../../app/controller/controllerFactory';
import { getFormData } from '../../../app/controller/formHelpers';
import { type TranslationContent, createGenerateContent } from '../../../app/utils/i18n';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';

const stepName = 'enter-age';
const generateContent = createGenerateContent(stepName, 'userJourney');

const getFields = (t: TranslationContent = {}): FormFieldConfig[] => {
  const errors = (t.errors as Record<string, string>) || {};
  return [
    {
      name: 'age',
      type: 'radio',
      required: true,
      errorMessage: errors.age,
    },
  ];
};

export const step: StepDefinition = {
  url: '/steps/user-journey/enter-age',
  name: stepName,
  view: 'steps/userJourney/enterAge.njk',
  stepDir: __dirname,
  generateContent,
  getController: () => {
    return createGetController('steps/userJourney/enterAge.njk', stepName, generateContent, (req, _content) => {
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
    'steps/userJourney/enterAge.njk',
    async (_req: Request) => {
      // No additional logic needed, just store the form data
    }
  ),
};
