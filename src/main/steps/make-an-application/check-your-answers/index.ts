import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { CitizenGenAppRequest } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation, getTranslationFunction } from '../../../modules/steps';
import { ccdCaseService } from '../../../services/ccdCaseService';
import { MAKE_AN_APPLICATION_ROUTE, flowConfig } from '../flow.config';

const STEP_NAME = 'check-your-answers';
const stepNavigation = createStepNavigation(flowConfig);

export const step: StepDefinition = {
  url: `${MAKE_AN_APPLICATION_ROUTE}/check-your-answers`,
  name: STEP_NAME,
  view: 'make-an-application/check-your-answers/checkYourAnswers.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'make-an-application/check-your-answers/checkYourAnswers.njk',
      STEP_NAME,
      stepNavigation,
      (req: Request) => {
        const t: TFunction = getTranslationFunction(req, STEP_NAME, ['common']);

        const formData = req.session.formData;

        if (!formData) {
          throw Error('No existing formData in session');
        }

        const typeOfApplication = formData['choose-an-application']['typeOfApplication'];

        return {
          summaryData: {
            rows: [
              {
                key: {
                  text: t('answers.chooseAnApplication.label'),
                },
                value: {
                  text: t(`answers.chooseAnApplication.options.${typeOfApplication}`),
                },
                actions: {
                  items: [
                    {
                      href: './choose-an-application',
                      text: t('change'),
                      visuallyHiddenText: t('answers.chooseAnApplication.changeHint'),
                    },
                  ],
                },
              },
            ],
          },
        };
      },
      'makeAnApplication'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const formData = req.session.formData;

      const ccdCase = res.locals.validatedCase;
      if (!ccdCase) {
        throw Error('No existing case details in session');
      }

      if (!formData) {
        throw Error('No existing formData in session');
      }

      const citizenGenAppRequest: CitizenGenAppRequest = {
        applicationType: formData['choose-an-application']['typeOfApplication'],
      };

      await ccdCaseService.submitGeneralApplication(req.session?.user?.accessToken, {
        id: ccdCase.id,
        data: {
          citizenGenAppRequest,
        },
      });

      delete req.session.formData;

      const redirectPath = await stepNavigation.getNextStepUrl(req, STEP_NAME, req.body);

      if (!redirectPath) {
        return res.status(500).send('Unable to determine next step');
      }

      res.redirect(303, redirectPath);
    },
  },
};
