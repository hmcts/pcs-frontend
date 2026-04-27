import type { PossessionClaimResponse } from '../../../../../main/services/ccdCase.interface';
import { normaliseRespondToClaimDraft } from '../../../../../main/steps/respond-to-claim/normalise';

// Hardcoded mapping between each known cross-page orphan rule and the corresponding
// normaliser behavior. Each row represents a rule that should be encoded in BOTH
// `flow.config.ts` (as a routing condition that skips the dependent step) AND the
// normaliser registry (as a rule that drops orphaned fields).
//
// This is a CONSISTENCY CHECK against a hardcoded list, not full drift detection.
// If the list itself drifts from flow.config, the test still passes. To catch all
// drift you would need a single source of truth for routing conditions (out of
// scope; will be possible once PR 1133's `showCondition` lands per step).
//
// When you add a new normaliser, add a row here too. When you delete or change a
// flow.config route, audit this list.
const knownOrphanRules: {
  name: string;
  gating: PossessionClaimResponse;
  expectedDropped: string[];
}[] = [
  {
    name: 'instalment-payments + how-much-afford-to-pay are skipped when repaymentPlanAgreed is YES',
    gating: {
      defendantResponses: {
        paymentAgreement: {
          repaymentPlanAgreed: 'YES',
          repayArrearsInstalments: 'YES',
          additionalRentContribution: '10000',
          additionalContributionFrequency: 'WEEKLY',
        },
      },
    },
    expectedDropped: ['repayArrearsInstalments', 'additionalRentContribution', 'additionalContributionFrequency'],
  },
  {
    name: 'instalment-payments + how-much-afford-to-pay are skipped when repaymentPlanAgreed is NOT_SURE',
    gating: {
      defendantResponses: {
        paymentAgreement: {
          repaymentPlanAgreed: 'NOT_SURE',
          repayArrearsInstalments: 'YES',
          additionalRentContribution: '10000',
          additionalContributionFrequency: 'WEEKLY',
        },
      },
    },
    expectedDropped: ['repayArrearsInstalments', 'additionalRentContribution', 'additionalContributionFrequency'],
  },
  {
    name: 'how-much-afford-to-pay is skipped when repayArrearsInstalments is NO',
    gating: {
      defendantResponses: {
        paymentAgreement: {
          repaymentPlanAgreed: 'NO',
          repayArrearsInstalments: 'NO',
          additionalRentContribution: '10000',
          additionalContributionFrequency: 'WEEKLY',
        },
      },
    },
    expectedDropped: ['additionalRentContribution', 'additionalContributionFrequency'],
  },
  {
    name: 'notice-date pages are skipped when possessionNoticeReceived is NO',
    gating: {
      defendantResponses: { possessionNoticeReceived: 'NO', noticeReceivedDate: '2024-01-15' },
    },
    expectedDropped: ['noticeReceivedDate'],
  },
  {
    name: 'notice-date pages are skipped when possessionNoticeReceived is NOT_SURE',
    gating: {
      defendantResponses: { possessionNoticeReceived: 'NOT_SURE', noticeReceivedDate: '2024-01-15' },
    },
    expectedDropped: ['noticeReceivedDate'],
  },
  {
    name: 'finance branch is skipped when shareIncomeExpenseDetails is NO',
    gating: {
      defendantResponses: {
        householdCircumstances: {
          shareIncomeExpenseDetails: 'NO',
          incomeFromJobs: 'YES',
          incomeFromJobsAmount: '5000',
          universalCredit: 'YES',
          ucApplicationDate: '2024-01-01',
        },
      },
    },
    expectedDropped: ['incomeFromJobs', 'incomeFromJobsAmount', 'universalCredit', 'ucApplicationDate'],
  },
];

describe('flow.config + normaliser consistency', () => {
  it.each(knownOrphanRules)(
    '$name → orphans dropped by normaliseRespondToClaimDraft',
    ({ gating, expectedDropped }) => {
      const result = normaliseRespondToClaimDraft(gating);
      const flat = JSON.stringify(result);
      for (const droppedKey of expectedDropped) {
        expect(flat).not.toContain(droppedKey);
      }
    }
  );
});
