import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { getFormData, setFormData } from '../../../app/controller/sessionHelper';
import { validateForm } from '../../../app/controller/validation';
import { TranslationContent, loadTranslations } from '../../../app/utils/loadTranslations';
import { getAllFormData, getBackUrl, getNextStepUrl } from '../../../app/utils/navigation';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { SupportedLang, getLanguageFromRequest } from '../../../utils/getLanguageFromRequest';

const stepName = 'page4';

const generateContent = (lang = 'en'): TranslationContent => {
  return loadTranslations(lang, ['common', 'eligibility']);
};

const getFields = (t: TranslationContent = {}): FormFieldConfig[] => {
  const errors = t.errors || {};
  return [
    {
      name: 'title',
      type: 'select',
      required: true,
      options: [
        { value: 'Mr', text: t.page4?.fields?.title?.items?.mr || 'Mr' },
        { value: 'Ms', text: t.page4?.fields?.title?.items?.ms || 'Ms' },
        { value: 'Miss', text: t.page4?.fields?.title?.items?.miss || 'Miss' },
        { value: 'Mrs', text: t.page4?.fields?.title?.items?.mrs || 'Mrs' },
      ],
      errorMessage: errors.title || 'Title is required',
    },
    {
      name: 'firstName',
      type: 'text',
      required: true,
      errorMessage: errors.firstName || 'Enter a first name',
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
      errorMessage: errors.lastName || 'Enter a last name',
    },
  ];
};

export const step: StepDefinition = {
  url: '/steps/eligibility/page4',
  name: stepName,
  view: 'steps/eligibility/page4.njk',
  stepDir: __dirname,
  stepNumber: 4,
  section: 'eligibility',
  description: 'Enter personal details',
  prerequisites: ['page3'],
  generateContent,
  getController: (lang = 'en') => {
    const content = generateContent(lang);
    return createGetController('steps/eligibility/page4.njk', stepName, content, req => {
      const savedData = getFormData(req, stepName);
      return {
        ...content,
        ...savedData,
        backUrl: getBackUrl(req, stepName),
      };
    });
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const lang: SupportedLang = getLanguageFromRequest(req);
      const content = generateContent(lang);
      const fields = getFields(content);
      const errors = validateForm(req, fields, content.errors);

      if (Object.keys(errors).length > 0) {
        const firstField = Object.keys(errors)[0];
        return res.status(400).render('steps/eligibility/page4.njk', {
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
