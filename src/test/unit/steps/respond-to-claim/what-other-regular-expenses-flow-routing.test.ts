import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

import { getPreviousStep } from '@modules/steps/flow';

describe('respond-to-claim what-other-regular-expenses-do-you-have back navigation (showCondition paradigm)', () => {
  const reqWithPriorityDebts = (priorityDebts: 'YES' | 'NO'): Request =>
    ({
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  householdCircumstances: {
                    shareIncomeExpenseDetails: 'YES',
                    priorityDebts,
                  },
                },
              },
            },
          },
        },
      },
    }) as unknown as Request;

  it('returns priority-debt-details when user has priority debts', async () => {
    await expect(
      getPreviousStep(reqWithPriorityDebts('YES'), 'what-other-regular-expenses-do-you-have', flowConfig, {})
    ).resolves.toBe('priority-debt-details');
  });

  it('returns priority-debts when user has no priority debts', async () => {
    await expect(
      getPreviousStep(reqWithPriorityDebts('NO'), 'what-other-regular-expenses-do-you-have', flowConfig, {})
    ).resolves.toBe('priority-debts');
  });
});
