import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { getFormData, setFormData } from '../../../app/controller/sessionHelper';
import { validateForm } from '../../../app/controller/validation';
import { TranslationContent, loadTranslations } from '../../../app/utils/loadTranslations';
import { getAllFormData, getBackUrl, getNextStepUrl } from '../../../app/utils/navigation';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { SupportedLang, getLanguageFromRequest } from '../../../utils/getLanguageFromRequest';

const stepName = 'page2';

const generateContent = (lang = 'en'): TranslationContent => {
  return loadTranslations(lang, ['common', 'eligibility']);
};

const getFields = (t: TranslationContent = {}): FormFieldConfig[] => {
  const errors = t.errors || {};
  return [
    {
      name: 'age',
      type: 'radio',
      required: true,
      options: [
        { value: 'yes', text: t.page2?.ageOptions?.yes || 'Yes' },
        { value: 'no', text: t.page2?.ageOptions?.no || 'No' },
      ],
      errorMessage: errors.age || 'Select an option to continue.',
    },
  ];
};

export const step: StepDefinition = {
  url: '/steps/eligibility/page2',
  name: stepName,
  view: 'steps/eligibility/page2.njk',
  stepDir: __dirname,
  stepNumber: 2,
  section: 'eligibility',
  description: 'Age eligibility check',
  prerequisites: ['start'],
  generateContent,
  getController: (lang = 'en') => {
    const content = generateContent(lang);
    return createGetController('steps/eligibility/page2.njk', stepName, content, req => {
      const savedData = getFormData(req, stepName);
      return {
        ...content,
        ...savedData,
        backUrl: getBackUrl(req, stepName),
      };
    });
  },
  getNextStep: (formData, _allData) => {
    return formData.age === 'yes' ? 'page3' : 'ineligible';
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const lang: SupportedLang = getLanguageFromRequest(req);
      const content = generateContent(lang);
      const fields = getFields(content);
      const errors = validateForm(req, fields, content.errors);

      if (Object.keys(errors).length > 0) {
        const firstField = Object.keys(errors)[0];
        return res.status(400).render('steps/eligibility/page2.njk', {
          ...content,
          ...req.body,
          error: { field: firstField, text: errors[firstField] },
          errorSummaryTitle: content.errorSummaryTitle,
          backUrl: getBackUrl(req, stepName),
        });
      }

      setFormData(req, stepName, req.body);
      const allFormData = getAllFormData(req);
      const nextStepUrl = getNextStepUrl(stepName, req.body, allFormData);
      res.redirect(303, nextStepUrl);
    },
  },
};
