import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

import { getNextStep, getPreviousStep } from '@modules/steps/flow';

describe('respond-to-claim priority-debts flow routing (showCondition paradigm)', () => {
  const createReq = (householdCircumstances: Record<string, unknown>): Request =>
    ({
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  householdCircumstances: {
                    shareIncomeExpenseDetails: 'YES',
                    ...householdCircumstances,
                  },
                },
              },
            },
          },
        },
      },
    }) as unknown as Request;

  describe('forward navigation from priority-debts', () => {
    it('goes to priority-debt-details when priorityDebts is YES', async () => {
      const req = createReq({ priorityDebts: 'YES' });
      await expect(getNextStep(req, 'priority-debts', flowConfig, {})).resolves.toBe('priority-debt-details');
    });

    it('skips priority-debt-details and goes to regular-expenses when priorityDebts is NO', async () => {
      const req = createReq({ priorityDebts: 'NO' });
      await expect(getNextStep(req, 'priority-debts', flowConfig, {})).resolves.toBe(
        'what-other-regular-expenses-do-you-have'
      );
    });
  });

  describe('back navigation to priority-debts', () => {
    it('uses regular-income as previous step when UC is selected in case data', async () => {
      const req = createReq({ universalCredit: 'YES' });
      await expect(getPreviousStep(req, 'priority-debts', flowConfig, {})).resolves.toBe(
        'what-regular-income-do-you-receive'
      );
    });

    it('uses have-you-applied-for-universal-credit as previous step when UC is not selected', async () => {
      const req = createReq({ universalCredit: 'NO' });
      await expect(getPreviousStep(req, 'priority-debts', flowConfig, {})).resolves.toBe(
        'have-you-applied-for-universal-credit'
      );
    });
  });
});
