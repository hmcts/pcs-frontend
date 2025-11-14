import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { getFormData, setFormData } from '../../../app/controller/sessionHelper';
import { validateForm } from '../../../app/controller/validation';
import { TranslationContent, loadTranslations } from '../../../app/utils/loadTranslations';
import { getAllFormData, getBackUrl, getNextStepUrl } from '../../../app/utils/navigation';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { ccdCaseService } from '../../../services/ccdCaseService';
import { SupportedLang, getLanguageFromRequest } from '../../../utils/getLanguageFromRequest';

const stepName = 'enter-user-details';

const generateContent = (lang = 'en'): TranslationContent => {
  return loadTranslations(lang, ['common', 'userJourney/enterUserDetails']);
};

const getFields = (t: TranslationContent = {}): FormFieldConfig[] => {
  const errors = t.errors || {};
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
  stepNumber: 1,
  section: 'personal-details',
  description: 'Enter user personal details',
  generateContent,
  getController: (lang = 'en') => {
    const content = generateContent(lang);
    return createGetController('steps/userJourney/enterUserDetails.njk', stepName, content, req => {
      const savedData = getFormData(req, stepName);
      return {
        ...content,
        ...savedData,
        common: content,
        labels: content.labels,
        errors: content.errors,
        title: content.title,
        backUrl: getBackUrl(req, stepName),
      };
    });
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const lang: SupportedLang = getLanguageFromRequest(req);
      const content = generateContent(lang);
      const fields = getFields(content);
      const errors = validateForm(req, fields, content);
      if (Object.keys(errors).length > 0) {
        const firstField = Object.keys(errors)[0];
        return res.status(400).render('steps/userJourney/enterUserDetails.njk', {
          ...content,
          ...req.body,
          error: { field: firstField, text: errors[firstField] },
        });
      }

      setFormData(req, stepName, req.body);
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
          // applicantForename: req.body.applicantForename,
          // applicantSurname: req.body.applicantSurname,
        });
      }

      const allFormData = getAllFormData(req);
      const nextStepUrl = getNextStepUrl(stepName, req.body, allFormData);
      res.redirect(303, nextStepUrl);
    },
  },
};
