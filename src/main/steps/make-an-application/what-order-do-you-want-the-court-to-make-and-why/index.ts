import type { Request } from 'express';

import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'what-order-do-you-want-the-court-to-make-and-why',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/whatOrderDoYouWant.njk`,
  fields: [
    {
      name: 'whatOrderDoYouWant',
      type: 'character-count',
      required: true,
      maxLength: 6800,
      translationKey: {
        label: 'whatOrderDoYouWantLabel',
      },
      errorMessage: 'errors.whatOrderDoYouWant',
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    includeApplicationDetails: 'includeApplicationDetails',
    listHeading: 'list.heading',
  },
  extendGetContent: (req: Request) => {
    const typeOfApplication = req.session.formData?.['choose-an-application']?.['typeOfApplication'] ?? '';

    let list: string[] = [];
    const t = getTranslationFunction(req, 'what-order-do-you-want-the-court-to-make-and-why', ['common']);

    if (typeOfApplication === 'ADJOURN' || typeOfApplication === 'SOMETHING_ELSE') {
      list = t(`list.${typeOfApplication}`, { returnObjects: true }) as unknown as string[];
    }

    return {
      typeOfApplication,
      list,
    };
  },
});
