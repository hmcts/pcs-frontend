import { createRespondToClaimFormStep } from '../formStep';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';
import { clientContextSessionClearer } from '@utils/clientContextSessionClearer';
import { getCaseManagementUrl } from '@utils/legalRepresentativeRedirectHandler';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-payment-successful',
  stepDir: __dirname,
  fields: [],
  customTemplate: `${__dirname}/counterClaimPaymentSuccessful.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    paragraph1: 'paragraph1',
    paragraph2: 'paragraph2',
    paymentReference: 'paymentReference',
    heading1: 'heading1',
    listItem1: 'listItem1',
    listItem2: 'listItem2',
    heading2: 'heading2',
    surveyParagraph: 'surveyParagraph',
    closeAndReturnToCaseOverview: 'closeAndReturnToCaseOverview',
  },
  extendGetContent: req => {
    clientContextSessionClearer(req);

    const paymentReference = req.session.payment?.paymentReference;
    const t = getTranslationFunction(req);
    const caseId = req.res?.locals.validatedCase?.id;

    return {
      paymentReferenceLine: paymentReference ? t('paymentReference', { paymentReference }) : undefined,
      closeUrl: getCaseManagementUrl(req),
      dashboardUrl: getDashboardUrl(caseId),
    };
  },
});
