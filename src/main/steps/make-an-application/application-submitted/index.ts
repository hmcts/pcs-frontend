import { Request } from 'express';
import type { TFunction } from 'i18next';

import { createFormStep, getFormData, getTranslationFunction } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'application-submitted',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/applicationSubmitted.njk`,
  fields: [],
  translationKeys: {
    pageTitle: 'pageTitle',
    whatHappensNext: 'whatHappensNext',
    youDoNotNeedToDoAnythingElse: 'youDoNotNeedToDoAnythingElse',
    giveFeedbackAboutThisService: 'giveFeedbackAboutThisService',
    completeThisShortSurvey: 'completeThisShortSurvey',
    closeAndReturnToCaseOverview: 'buttons.closeAndReturnToCaseOverview',
  },
  extendGetContent: async (req: Request) => {
    const t: TFunction = getTranslationFunction(req);

    const confirmationPanelTitle =
      req.query.status === 'pending' ? t('paymentBeingProcessed') : t('applicationSubmitted');

    const typeOfApplication = getFormData(req, 'choose-an-application').typeOfApplication;

    let receivedYourApplicationMessage;
    switch (typeOfApplication) {
      case 'ADJOURN':
        receivedYourApplicationMessage = t('adjournRequestReceived');
        break;
      case 'SET_ASIDE':
        receivedYourApplicationMessage = t('setAsideRequestReceived');
        break;
      default:
        receivedYourApplicationMessage = t('somethingElseRequestReceived');
        break;
    }

    return {
      confirmationPanelTitle,
      receivedYourApplicationMessage,
    };
  },
});
