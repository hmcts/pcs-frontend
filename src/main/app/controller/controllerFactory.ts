import { Logger } from '@hmcts/nodejs-logging';
import { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig } from '../../interfaces/formFieldConfig.interface';
import type { StepFormData } from '../../interfaces/stepFormData.interface';
import { getFormData, setFormData, validateForm } from '../utils/formBuilder/helpers';
import { getStepNamespace, getStepTranslations, getValidatedLanguage, loadStepNamespace } from '../utils/i18n';
import { stepNavigation } from '../utils/stepFlow';

const logger = Logger.getLogger('controllerFactory');

type PostControllerCallback = (req: Request, res: Response) => Promise<void> | void;
type TranslationFn = (req: Request) => StepFormData | Promise<StepFormData>;

export class GetController {
  constructor(
    private view: string,
    private generateContent: TranslationFn
  ) {}

  get = async (req: Request, res: Response): Promise<void> => {
    const content = await this.generateContent(req);
    res.render(this.view, {
      ...content,
    });
  };
}

export const createGetController = (
  view: string,
  stepName: string,
  extendContent?: (req: Request) => StepFormData | Promise<StepFormData>,
  journeyFolder?: string
): GetController => {
  return new GetController(view, async (req: Request) => {
    if (journeyFolder && req.i18n) {
      try {
        await loadStepNamespace(req, stepName, journeyFolder);
      } catch (error) {
        logger.warn(`Failed to load namespace for step ${stepName}:`, error);
      }
    }

    const formData = getFormData(req, stepName);
    const postData = req.body || {};
    const lang = getValidatedLanguage(req);

    const reqLang = req.language || 'en';
    let t: TFunction = req.t || ((key: string) => key);

    if (journeyFolder && req.i18n) {
      const stepNamespace = getStepNamespace(stepName);
      t = req.i18n.getFixedT(reqLang, [stepNamespace, 'common']) || t;
    }

    req.t = t;

    const selected = formData?.answer || formData?.choices || postData.answer || postData.choices;

    const stepTranslations = journeyFolder ? getStepTranslations(req, stepName) : {};
    const commonTranslations = req.i18n?.getResourceBundle(reqLang, 'common') || {};
    const commonContent: Record<string, unknown> = {};
    for (const key of ['change', 'buttons']) {
      if (commonTranslations[key]) {
        commonContent[key] = commonTranslations[key];
      }
    }

    const baseContent: StepFormData = {
      ...formData,
      lang,
      pageUrl: req.originalUrl || '/',
      selected,
      t,
      answer: postData.answer ?? formData?.answer,
      choices: postData.choices ?? formData?.choices,
      error: postData.error,
      backUrl: stepNavigation.getBackUrl(req, stepName),
      serviceName: t('serviceName'),
      phase: t('phase'),
      feedback: t('feedback'),
      back: t('back'),
      languageToggle: t('languageToggle'),
      ...commonContent,
      ...stepTranslations,
    };

    if (extendContent) {
      const extended = await extendContent(req);
      return { ...baseContent, ...extended };
    }

    return baseContent;
  });
};

export const createPostRedirectController = (nextUrl: string): { post: (req: Request, res: Response) => void } => {
  return {
    post: (_req: Request, res: Response) => {
      res.redirect(nextUrl);
    },
  };
};

export const createPostController = (
  stepName: string,
  getFields: (t: TFunction) => FormFieldConfig[],
  view: string,
  beforeRedirect?: PostControllerCallback,
  journeyFolder?: string
): { post: (req: Request, res: Response) => Promise<void | Response> } => {
  return {
    post: async (req: Request, res: Response) => {
      if (journeyFolder && req.i18n) {
        try {
          await loadStepNamespace(req, stepName, journeyFolder);
        } catch (error) {
          logger.warn(`Failed to load namespace for step ${stepName}:`, error);
        }
      }

      const reqLang = req.language || 'en';
      let t: TFunction = req.t || ((key: string) => key);

      if (journeyFolder && req.i18n) {
        const stepNamespace = getStepNamespace(stepName);
        t = req.i18n.getFixedT(reqLang, [stepNamespace, 'common']) || t;
      }

      const fields = getFields(t);
      const errors = validateForm(req, fields);

      if (Object.keys(errors).length > 0) {
        const firstField = Object.keys(errors)[0];
        return res.status(400).render(view, {
          ...req.body,
          error: { field: firstField, text: errors[firstField] },
          lang: reqLang,
          pageUrl: req.originalUrl || '/',
          t,
          backUrl: stepNavigation.getBackUrl(req, stepName),
        });
      }

      setFormData(req, stepName, req.body);

      if (beforeRedirect) {
        await beforeRedirect(req, res);
        if (res.headersSent) {
          return;
        }
      }

      const redirectPath = stepNavigation.getNextStepUrl(req, stepName, req.body);
      if (!redirectPath) {
        return res.status(500).send('Unable to determine next step');
      }

      res.redirect(303, redirectPath);
    },
  };
};
