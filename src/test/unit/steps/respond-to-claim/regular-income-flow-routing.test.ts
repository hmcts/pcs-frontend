import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';
import { shouldShowUniversalCreditStep } from '../../../../main/steps/respond-to-claim/flowConditions';

import { getNextStep } from '@modules/steps/flow';

describe('respond-to-claim regular-income flow routing (showCondition paradigm)', () => {
  // hasSelectedUniversalCredit (src/main/steps/utils/hasSelectedUniversalCredit.ts) checks for
  // universalCreditAmount/universalCreditFrequency presence, not the universalCredit flag —
  // so realistic fixtures must include amount/frequency when simulating "UC selected".
  const createReq = (universalCredit: 'YES' | 'NO' | undefined): Request =>
    ({
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  householdCircumstances: {
                    shareIncomeExpenseDetails: 'YES',
                    ...(universalCredit === 'YES'
                      ? { universalCredit, universalCreditAmount: '20000', universalCreditFrequency: 'MONTHLY' }
                      : universalCredit === 'NO'
                        ? { universalCredit }
                        : {}),
                  },
                },
              },
            },
          },
        },
      },
    }) as unknown as Request;

  describe('shouldShowUniversalCreditStep show condition', () => {
    it('hides the UC question when universalCredit is YES in case data', () => {
      expect(shouldShowUniversalCreditStep(createReq('YES'))).toBe(false);
    });

    it('shows the UC question when universalCredit is NO in case data', () => {
      expect(shouldShowUniversalCreditStep(createReq('NO'))).toBe(true);
    });

    it('shows the UC question when universalCredit is absent from case data', () => {
      expect(shouldShowUniversalCreditStep(createReq(undefined))).toBe(true);
    });
  });

  describe('getNextStep navigation from what-regular-income-do-you-receive', () => {
    it('skips UC question and goes to priority-debts when universalCredit is YES', async () => {
      await expect(getNextStep(createReq('YES'), 'what-regular-income-do-you-receive', flowConfig, {})).resolves.toBe(
        'priority-debts'
      );
    });

    it('shows UC question when universalCredit is NO', async () => {
      await expect(getNextStep(createReq('NO'), 'what-regular-income-do-you-receive', flowConfig, {})).resolves.toBe(
        'have-you-applied-for-universal-credit'
      );
    });

    it('shows UC question when universalCredit is absent', async () => {
      await expect(
        getNextStep(createReq(undefined), 'what-regular-income-do-you-receive', flowConfig, {})
      ).resolves.toBe('have-you-applied-for-universal-credit');
    });
  });
});
