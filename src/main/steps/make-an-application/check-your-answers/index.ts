import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { CitizenGenAppRequest } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, getFormData, getTranslation, getTranslationFunction } from '../../../modules/steps';
import { DASHBOARD_ROUTE, getDashboardUrl } from '../../../routes/dashboard';
import { ccdCaseService } from '../../../services/ccdCaseService';
import { MAKE_AN_APPLICATION_ROUTE } from '../flow.config';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('check-your-answers');
const stepName = 'check-your-answers';

export const step: StepDefinition = {
  url: `${MAKE_AN_APPLICATION_ROUTE}/check-your-answers`,
  name: stepName,
  view: 'make-an-application/check-your-answers/checkYourAnswers.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'make-an-application/check-your-answers/checkYourAnswers.njk',
      stepName,
      (_req: Request) => {
        // TODO: Is there a better way to get the translated values into the data?
        const t: TFunction = _req.t || getTranslationFunction(_req, stepName, ['common']);

        const formData = getFormData(_req, 'choose-an-application');
        const typeOfApplication = formData['typeOfApplication'];
        const result = getTranslation(t, `answers.chooseAnApplication.${typeOfApplication}`);

        return {
          backUrl: DASHBOARD_ROUTE,
          summaryData: {
            rows: [
              {
                key: {
                  text: 'Type of application',
                },
                value: {
                  text: result,
                },
                actions: {
                  items: [
                    {
                      href: './choose-an-application',
                      text: 'Change',
                      visuallyHiddenText: 'Change type of application',
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
      logger.info('Submitting data', JSON.stringify(formData, null, 2));

      const ccdCase = res.locals.validatedCase;
      if (!ccdCase) {
        throw Error('No existing case details in session');
      }

      if (!formData) {
        throw Error('No existing formData in session');
      }

      const citizenGenAppRequest: CitizenGenAppRequest = {
        type: formData['choose-an-application']['typeOfApplication'],
      };

      await ccdCaseService.submitGeneralApplication(req.session?.user?.accessToken, {
        id: ccdCase.id,
        data: {
          citizenGenAppRequest,
        },
      });

      const redirectPath = getDashboardUrl(ccdCase.id);

      if (!redirectPath) {
        return res.status(500).send('Unable to determine next step');
      }

      res.redirect(303, redirectPath);
    },
  },
};
