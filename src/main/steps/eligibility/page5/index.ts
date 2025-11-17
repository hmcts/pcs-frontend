import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { getFormData, setFormData } from '../../../app/controller/sessionHelper';
import { validateForm } from '../../../app/controller/validation';
import { TranslationContent, loadTranslations } from '../../../app/utils/loadTranslations';
import { getAllFormData, getBackUrl, getNextStepUrl } from '../../../app/utils/navigation';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { SupportedLang, getLanguageFromRequest } from '../../../utils/getLanguageFromRequest';

const stepName = 'page5';

const generateContent = (lang = 'en'): TranslationContent => {
  return loadTranslations(lang, ['common', 'eligibility']);
};

const getFields = (t: TranslationContent = {}): FormFieldConfig[] => {
  const errors = t.errors || {};
  return [
    {
      name: 'dateOfBirth',
      type: 'date',
      required: true,
      errorMessage: errors.dateOfBirth || 'Enter a date of birth',
    },
    {
      name: 'email',
      type: 'text',
      required: true,
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      errorMessage: errors.email || 'Enter a valid email address',
    },
  ];
};

export const step: StepDefinition = {
  url: '/steps/eligibility/page5',
  name: stepName,
  view: 'steps/eligibility/page5.njk',
  stepDir: __dirname,
  stepNumber: 5,
  section: 'eligibility',
  description: 'Enter date of birth and email',
  prerequisites: ['page4'],
  generateContent,
  getController: (lang = 'en') => {
    const content = generateContent(lang);
    return createGetController('steps/eligibility/page5.njk', stepName, content, req => {
      const savedData = getFormData(req, stepName) as Record<string, unknown>;
      const dateOfBirth = savedData?.dateOfBirth as { day?: string; month?: string; year?: string } | undefined;
      return {
        ...content,
        ...savedData,
        dateOfBirthDay: dateOfBirth?.day || (savedData?.dateOfBirthDay as string | undefined),
        dateOfBirthMonth: dateOfBirth?.month || (savedData?.dateOfBirthMonth as string | undefined),
        dateOfBirthYear: dateOfBirth?.year || (savedData?.dateOfBirthYear as string | undefined),
        email: savedData?.email as string | undefined,
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
        return res.status(400).render('steps/eligibility/page5.njk', {
          ...content,
          ...req.body,
          dateOfBirthDay: req.body['dateOfBirth-day'],
          dateOfBirthMonth: req.body['dateOfBirth-month'],
          dateOfBirthYear: req.body['dateOfBirth-year'],
          error: { field: firstField, text: errors[firstField] },
          errorSummaryTitle: content.errorSummaryTitle,
          backUrl: getBackUrl(req, stepName),
        });
      }

      const formData = {
        ...req.body,
        dateOfBirth: {
          day: req.body['dateOfBirth-day'],
          month: req.body['dateOfBirth-month'],
          year: req.body['dateOfBirth-year'],
        },
      };

      setFormData(req, stepName, formData);
      const allFormData = getAllFormData(req);
      const nextStepUrl = getNextStepUrl(stepName, formData, allFormData);
      res.redirect(303, nextStepUrl);
    },
  },
};
