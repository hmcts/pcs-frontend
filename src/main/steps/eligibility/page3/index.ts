import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { getFormData, setFormData } from '../../../app/controller/sessionHelper';
import { validateForm } from '../../../app/controller/validation';
import { TranslationContent, loadTranslations } from '../../../app/utils/loadTranslations';
import { getAllFormData, getBackUrl, getNextStepUrl } from '../../../app/utils/navigation';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { SupportedLang, getLanguageFromRequest } from '../../../utils/getLanguageFromRequest';

const stepName = 'page3';

const generateContent = (lang = 'en'): TranslationContent => {
  return loadTranslations(lang, ['common', 'eligibility']);
};

const getFields = (t: TranslationContent = {}): FormFieldConfig[] => {
  const errors = t.errors || {};
  return [
    {
      name: 'grounds',
      type: 'checkbox',
      required: true,
      options: [
        {
          value: 'rent-arrears-8',
          text: t.page3?.options?.rentArrears8?.text || 'Rent arrears (ground 8)',
          hint: t.page3?.options?.rentArrears8?.hint || "The tenant owes at least 2 months' rent",
        },
        {
          value: 'breach-contract-9',
          text: t.page3?.options?.breachContract9?.text || 'Breach of contract (ground 9)',
          hint: t.page3?.options?.breachContract9?.hint || 'The tenant has broken terms of the tenancy agreement',
        },
        {
          value: 'other-10',
          text: t.page3?.options?.other10?.text || 'Other (ground 10)',
          hint: t.page3?.options?.other10?.hint || 'Other statutory grounds for possession',
        },
      ],
      errorMessage: errors.grounds || 'Select at least one option',
    },
  ];
};

export const step: StepDefinition = {
  url: '/steps/eligibility/page3',
  name: stepName,
  view: 'steps/eligibility/page3.njk',
  stepDir: __dirname,
  stepNumber: 3,
  section: 'eligibility',
  description: 'Grounds for possession',
  prerequisites: ['page2'],
  generateContent,
  getController: (lang = 'en') => {
    const content = generateContent(lang);
    return createGetController('steps/eligibility/page3.njk', stepName, content, req => {
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
        return res.status(400).render('steps/eligibility/page3.njk', {
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
