import type { FormBuilderConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController } from '../../controller/controllerFactory';
import { getFormData } from '../../controller/formHelpers';
import { createGenerateContent } from '../i18n';
import { DASHBOARD_ROUTE } from '../routes';

import { buildFormContent } from './formContent';
import { createPostHandler } from './postHandler';

export type { FormBuilderConfig } from '../../../interfaces/formFieldConfig.interface';

export function createFormStep(config: FormBuilderConfig): StepDefinition {
  const { stepName, journeyFolder, fields, beforeRedirect, extendGetContent, stepDir, translationKeys } = config;
  const generateContent = createGenerateContent(stepName, journeyFolder);

  const journeyPath = journeyFolder.replace(/([A-Z])/g, '-$1').toLowerCase();
  const viewPath = 'formBuilder.njk';

  return {
    url: `/steps/${journeyPath}/${stepName}`,
    name: stepName,
    view: viewPath,
    stepDir,
    generateContent,
    getController: () => {
      return createGetController(viewPath, stepName, generateContent, (req, content) => {
        const savedData = getFormData(req, stepName);
        const formContent = buildFormContent(fields, content, savedData, undefined, translationKeys);
        const ccdId = req.session?.ccdCase?.id;
        const result = extendGetContent ? { ...formContent, ...extendGetContent(req, content) } : formContent;
        return { ...result, ccdId, dashboardRoute: DASHBOARD_ROUTE, stepName, journeyFolder };
      });
    },
    postController: createPostHandler(fields, stepName, viewPath, generateContent, beforeRedirect, translationKeys),
  };
}
