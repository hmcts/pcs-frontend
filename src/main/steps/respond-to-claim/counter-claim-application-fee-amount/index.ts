import { isLegalRepresentativeUser, penceToPounds } from '../../utils';
import { getCounterClaimAmountInPence } from '../../utils/counterClaimAmount';
import { createRespondToClaimFormStep } from '../formStep';

import { getTranslationFunction } from '@modules/steps';
import { BuiltFormContent } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { CcdCaseModel } from '@services/ccdCaseData.model';
import { getCounterClaimFeeType, getFee } from '@services/feeLookupService';
import { getPaymentSessionState, setPaymentSessionState } from '@services/paymentSessionService';
import { SelectItems } from '@utils/fieldComponentTypes.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-application-fee-amount',
  stepDir: __dirname,
  fields: [
    {
      name: 'paymentOptions',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: {
        label: 'paymentOptions',
      },
      options: [
        {
          value: 'pba',
          translationKey: 'options.pba',
          subFields: {
            pbaAccount: {
              name: 'pbaAccount',
              type: 'select',
              required: true,
              translationKey: { label: 'pbaAccount' },
            },
            customerReference: {
              name: 'customerReference',
              type: 'text',
              translationKey: { label: 'customerReferenceLabel' },
            },
          },
        },
        {
          value: 'card',
          translationKey: 'options.card',
        },
      ],
    },
  ],
  customTemplate: `${__dirname}/counterClaimApplicationFeeAmount.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    notApplicable: 'notApplicable',
    counterClaimAmountLabel: 'counterClaimAmountLabel',
    counterClaimFeeLabel: 'counterClaimFeeLabel',
    payNowButton: 'payNowButton',
    paymentError: 'paymentError',
    pbaNumberLabel: 'pbaNumberLabel',
    customerReferenceLabel: 'customerReferenceLabel',
  },
  resolveRedirectAfterPost: async req => {
    const caseReference = req.params.caseReference;
    if (isLegalRepresentativeUser(req)) {
      const paymentOption = req.body?.paymentOptions as string | undefined;

      if (paymentOption === 'pba') {
        return caseReference ? `/case/${caseReference}/respond-to-claim/counter-claim-pba-payment/start` : '#';
      } else {
        return caseReference ? `/case/${caseReference}/respond-to-claim/counter-claim-payment/start` : '#';
      }
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


    if (isLegalRepresentativeUser(req)) {
      buildPbaAccountsSelections(formContent);
    }

    return {
      formattedCounterClaimAmount:
        counterClaimAmount === undefined ? undefined : t('counterClaimAmountDisplay', { counterClaimAmount }),
      formattedCounterClaimFee: t('counterClaimFeeDisplay', { counterClaimFee: feeAmount }),
      payNowButton: t('payNowButton', { counterClaimFee: feeAmount }),
      payNowUrl,
      payNowDisabled,
      showPaymentError,
      backUrl,
    };
  },
});

function buildPbaAccountsSelections(formContent: BuiltFormContent) {
  const select = formContent.fields.find(f => f.name === 'selectDefendant') as SelectItems | undefined;
  const pbaAccounts = getPbaAccounts();

  addSelectOptionsForPbaAccounts(pbaAccounts, select);
}

function getPbaAccounts(): string[] {
  // invoke api
  return ['pba123', 'pba321'];
}

function addSelectOptionsForPbaAccounts(
  pbaAccounts: string[] | undefined,
  radio: SelectItems | undefined
) {
  if (radio?.component) {
    pbaAccounts?.forEach(pbaAccount => {
      radio.component.items.push({
        value: pbaAccount,
        text: pbaAccount
      });
    });
  }
}
