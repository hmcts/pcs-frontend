import { Logger } from '@hmcts/nodejs-logging';
import { Application } from 'express';

import { getValidatedLanguage } from '../app/utils/i18n';
import { stepDependencyCheckMiddleware } from '../app/utils/stepFlow';
import { ccdCaseMiddleware, oidcMiddleware } from '../middleware';
import { getFlowConfigForStep, stepsWithContent } from '../steps';

const logger = Logger.getLogger('registerSteps');

export default function registerSteps(app: Application): void {
  for (const step of stepsWithContent) {
    const flowConfig = getFlowConfigForStep(step);
    const stepConfig = flowConfig?.steps[step.name];
    const requiresAuth = stepConfig?.requiresAuth !== false;
    const middlewares = requiresAuth ? [oidcMiddleware, ccdCaseMiddleware] : [];
    const dependencyCheck = flowConfig ? stepDependencyCheckMiddleware(flowConfig) : stepDependencyCheckMiddleware();
    const allGetMiddleware = step.middleware
      ? [...middlewares, dependencyCheck, ...step.middleware]
      : [...middlewares, dependencyCheck];
    if (step.getController) {
      app.get(step.url, ...allGetMiddleware, (req, res) => {
        const lang = getValidatedLanguage(req);
        logger.debug('Language information', {
          url: req.url,
          step: step.name,
          validatedLang: lang,
          reqLanguage: req.language,
          langCookie: req.cookies?.lang,
          langQuery: req.query?.lang,
          headers: {
            'accept-language': req.headers?.['accept-language'] || undefined,
          },
        });
        const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
        return controller.get(req, res);
      });
    }
    if (step.postController?.post) {
      app.post(step.url, ...middlewares, step.postController.post);
    }
  }

  const protectedStepsCount = stepsWithContent.filter(step => {
    const flowConfig = getFlowConfigForStep(step);
    const stepConfig = flowConfig?.steps[step.name];
    return stepConfig?.requiresAuth !== false;
  }).length;

  logger.info('Steps registered successfully', {
    totalSteps: stepsWithContent.length,
    protectedSteps: protectedStepsCount,
  });
}
