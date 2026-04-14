import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { CitizenGenAppRequest } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createGetController, createStepNavigation, getFormData, getTranslationFunction } from '../../../modules/steps';
import { ccdCaseService } from '../../../services/ccdCaseService';
import { toYesNoEnum } from '../../utils/yesNoEnum';
import { MAKE_AN_APPLICATION_ROUTE, flowConfig } from '../flow.config';

const STEP_NAME = 'check-your-answers';
const stepNavigation = createStepNavigation(flowConfig);

function isHearingInNext14Days(req: Request): 'yes' | 'no' | undefined {
  return getFormData(req, 'is-the-court-hearing-in-the-next-14-days').courtHearingInNext14Days as 'yes' | 'no';
}

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
        const courtHearingInNext14Days =
          formData['is-the-court-hearing-in-the-next-14-days']['courtHearingInNext14Days'];

        return {
          summaryData: {
            rows: [
              {
                key: {
                  text: t('answers.typeOfApplication.label'),
                },
                value: {
                  text: t(`answers.typeOfApplication.options.${typeOfApplication}`),
                },
                actions: {
                  items: [
                    {
                      href: './choose-an-application',
                      text: t('change'),
                      visuallyHiddenText: t('answers.typeOfApplication.changeHint'),
                    },
                  ],
                },
              },
              {
                key: {
                  text: t('answers.courtHearingInNext14Days.label'),
                },
                value: {
                  text: t(`options.${courtHearingInNext14Days}`),
                },
                actions: {
                  items: [
                    {
                      href: './is-the-court-hearing-in-the-next-14-days',
                      text: t('change'),
                      visuallyHiddenText: t('answers.courtHearingInNext14Days.changeHint'),
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

      const hearingInNext14Days = isHearingInNext14Days(req);

      const citizenGenAppRequest: CitizenGenAppRequest = {
        applicationType: formData['choose-an-application']['typeOfApplication'],
        within14Days: hearingInNext14Days ? toYesNoEnum(hearingInNext14Days) : undefined,
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
