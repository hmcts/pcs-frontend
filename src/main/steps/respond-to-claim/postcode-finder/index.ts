import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation } from '../../../modules/steps';
import { buildFormContent } from '../../../modules/steps/formBuilder/formContent';
import { getTranslationFunction } from '../../../modules/steps/i18n';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';

const stepName = 'postcode-finder';
const stepNavigation = createStepNavigation(flowConfig);

const getFields = (t: TFunction): FormFieldConfig[] => {
  return [
    {
      name: 'correspondenceAddressConfirm',
      type: 'radio',
      required: false,
      options: [
        {
          value: 'yes',
          label: t('labels.yes', 'Yes'),
        },
        {
          value: 'no',
          label: t('labels.no', 'No'),
          subFields: {
            addressLine1: {
              name: 'addressLine1',
              type: 'text',
              required: false,
            },
            addressLine2: {
              name: 'addressLine2',
              type: 'text',
              required: false,
            },
            townOrCity: {
              name: 'townOrCity',
              type: 'text',
              required: false,
            },
            county: {
              name: 'county',
              type: 'text',
              required: false,
            },
            postcode: {
              name: 'postcode',
              type: 'text',
              required: false,
            },
          },
        },
      ],
    },
  ];
};

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/postcode-finder`,
  name: stepName,
  view: 'respond-to-claim/postcode-finder/postcodeFinder.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'respond-to-claim/postcode-finder/postcodeFinder.njk',
      stepName,
      (req: Request) => {
        const t: TFunction = getTranslationFunction(req, stepName, ['common']);
        const fields = getFields(t);

        const nunjucksEnv = req.app.locals.nunjucksEnv;
        if (!nunjucksEnv) {
          throw new Error('Nunjucks environment not initialized');
        }

        // Build form content without loading saved data (not persisting yet)
        const formContent = buildFormContent(fields, t, {}, {}, undefined, nunjucksEnv);

        return {
          ...formContent,
          backUrl: `${RESPOND_TO_CLAIM_ROUTE}/start-now`,
        };
      },
      'respondToClaim'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      // Get next step URL and redirect
      const redirectPath = stepNavigation.getNextStepUrl(req, stepName, req.body);

      if (!redirectPath) {
        // No next step defined - show not found page
        return res.status(404).render('not-found');
      }

      res.redirect(303, redirectPath);
    },
  },
};
