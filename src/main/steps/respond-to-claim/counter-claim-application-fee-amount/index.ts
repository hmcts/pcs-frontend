import type { Request } from 'express';
import { TFunction } from 'i18next';

import { isLegalRepresentativeUser, penceToPounds } from '../../utils';
import { getCounterClaimAmountInPence } from '../../utils/counterClaimAmount';
import { createRespondToClaimFormStep } from '../formStep';

import { Logger } from '@modules/logger';
import { getTranslationFunction } from '@modules/steps';
import { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { CcdCaseModel } from '@services/ccdCaseData.model';
import { getCounterClaimFeeType, getFee } from '@services/feeLookupService';
import { getPaymentSessionState, setPaymentSessionState } from '@services/paymentSessionService';
import { paymentService } from '@services/pcsApi/paymentService';

const logger = Logger.getLogger('paymentReturn');

const legalRepFormFieldConfig: FormFieldConfig[] = [
  {
    name: 'paymentOptions',
    type: 'radio',
    required: true,
    options: [
      {
        value: 'pba',
        translationKey: 'options.pba',
        subFields: {
          pbaAccount: {
            name: 'pbaAccount',
            type: 'select',
            required: true,
            translationKey: {
              label: 'labels.pba',
            },
            errorMessage: 'errors.pbaAccount',
          },
          customerReference: {
            name: 'customerReference',
            type: 'text',
            required: true,
            translationKey: { label: 'labels.customerReference' },
            errorMessage: 'errors.customerReference',
          },
        },
      },
      {
        value: 'card',
        translationKey: 'options.card',
      },
    ],
  },
];

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-application-fee-amount',
  stepDir: __dirname,
  customTemplate: `${__dirname}/counterClaimApplicationFeeAmount.njk`,
  resolveRedirectAfterPost: async req => {
    // card should normally GET; this is mainly for PBA POST
    if (!isLegalRepresentativeUser(req)) {
      return;
    }

    const caseReference = req.params.caseReference;
    const paymentOption = req.body?.paymentOptions as string | undefined;

    if (paymentOption === 'card') {
      return caseReference ? `/case/${caseReference}/respond-to-claim/counter-claim-payment/start` : '#';
    } else if (paymentOption === 'pba') {
      const paymentSession = getPaymentSessionState(req);
      if (paymentSession) {
        setPaymentSessionState(req, {
          ...paymentSession,
          customerReference: req.body?.['paymentOptions.customerReference'],
          pbaAccount: req.body?.['paymentOptions.pbaAccount'],
        });
      }
      return caseReference ? `/case/${caseReference}/respond-to-claim/counter-claim-pba-payment/start` : '#';
    } else {
      return caseReference ? `/case/${caseReference}/respond-to-claim/counter-claim-application-fee-amount` : '#';
    }
  },
  extendGetContent: async (req, formContent) => {
    const paymentSession = getPaymentSessionState(req);
    const caseModel = req.res?.locals?.validatedCase;
    const counterClaim = caseModel instanceof CcdCaseModel ? caseModel.defendantResponsesCounterClaim : undefined;
    const claimType = paymentSession?.counterClaimType ?? counterClaim?.claimType;
    if (!claimType) {
      throw new Error('Counterclaim fee unavailable: missing claimType');
    }

    const claimAmountInPence = paymentSession?.counterClaimAmountInPence ?? getCounterClaimAmountInPence(counterClaim);

    let feeAmount = paymentSession?.feeAmount;
    if (feeAmount === undefined) {
      const feeType = getCounterClaimFeeType(claimType, claimAmountInPence);
      feeAmount = await getFee(feeType, claimAmountInPence);
    }

    if (paymentSession) {
      setPaymentSessionState(req, {
        ...paymentSession,
        feeAmount,
        counterClaimAmountInPence: claimAmountInPence,
        counterClaimType: claimType,
      });
    }

    const t = getTranslationFunction(req);
    const counterClaimAmountPounds = claimAmountInPence ? penceToPounds(claimAmountInPence) : undefined;
    const counterClaimAmount = counterClaimAmountPounds === undefined ? undefined : Number(counterClaimAmountPounds);
    const caseReference = req.params.caseReference;
    const serviceRequestReference = paymentSession?.serviceRequestReference;
    const payNowUrl = caseReference ? `/case/${caseReference}/respond-to-claim/counter-claim-payment/start` : '#';
    const payNowDisabled = !serviceRequestReference;
    const paymentQuery = req.query?.payment;
    const showPaymentError = paymentQuery === 'failed' || paymentQuery === 'pending';

    const backUrl = caseReference
      ? `/case/${caseReference}/respond-to-claim/response-submitted-counter-claim-fee-payment-needed`
      : '';

    const isLegalRepresentative = isLegalRepresentativeUser(req);
    let pbaAccountItems: { value: string; text: string }[] = [];

    if (isLegalRepresentative) {
      pbaAccountItems = await buildPbaAccountsSelections(req, t);
    }

    return {
      ...formContent,
      isLegalRepresentative,
      pbaAccountItems,
      formattedCounterClaimAmount:
        counterClaimAmount === undefined ? undefined : t('counterClaimAmountDisplay', { counterClaimAmount }),
      formattedCounterClaimFee: t('counterClaimFeeDisplay', { counterClaimFee: feeAmount }),
      payNowButton: t('payNowButton', { counterClaimFee: feeAmount }),
      payNowUrl,
      payNowDisabled,
      showPaymentError,
      backUrl,
      errors: {
        paymentOptions: t('errors.paymentOptions'),
        pbaAccount: t('errors.pbaAccount'),
        customerReference: t('errors.customerReference'),
      },
      labels: {
        pba: t('labels.pba'),
        customerReferenceHeading: t('labels.customerReferenceHeading'),
        customerReferenceHint: t('labels.customerReferenceHint'),
        selectPba: t('labels.selectPba'),
      },
      pageTitle: t('pageTitle'),
    };
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    notApplicable: 'notApplicable',
    counterClaimAmountLabel: 'counterClaimAmountLabel',
    counterClaimFeeLabel: 'counterClaimFeeLabel',
    payNowButton: 'payNowButton',
    paymentError: 'paymentError',
  },
  fields: legalRepFormFieldConfig,
});

async function buildPbaAccountsSelections(
  req: Request,
  t: TFunction<'translation', undefined>
): Promise<{ value: string; text: string }[]> {
  const pbaAccounts = await getPbaAccounts(req);

  const accountOptions = (pbaAccounts ?? []).map(account => ({
    value: account,
    text: account,
  }));

  return [{ value: '', text: t('labels.selectPba') }, ...accountOptions];
}

async function getPbaAccounts(req: Request): Promise<string[]> {
  const accessToken = req.session.user?.accessToken;
  if (!accessToken) {
    logger.error('Unable to get PBA accounts for user');
    return [];
  }

  const pbaAccountsResponse = await paymentService.getPbaAccounts(accessToken);
  return pbaAccountsResponse.pbaAccounts;
}
