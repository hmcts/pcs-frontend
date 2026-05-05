import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

import { getNextStep } from '@modules/steps/flow';

describe('respond-to-claim priority-debts forward routing (showCondition paradigm)', () => {
  const createReq = (priorityDebts: 'YES' | 'NO' | undefined): Request =>
    ({
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  householdCircumstances: {
                    shareIncomeExpenseDetails: 'YES',
                    ...(priorityDebts !== undefined ? { priorityDebts } : {}),
                  },
                },
              },
            },
          },
        },
      },
    }) as unknown as Request;

  it('routes to priority-debt-details when priorityDebts is YES', async () => {
    await expect(getNextStep(createReq('YES'), 'priority-debts', flowConfig, {})).resolves.toBe(
      'priority-debt-details'
    );
  });

  it('routes to what-other-regular-expenses when priorityDebts is NO', async () => {
    await expect(getNextStep(createReq('NO'), 'priority-debts', flowConfig, {})).resolves.toBe(
      'what-other-regular-expenses-do-you-have'
    );
  });

  it('routes to what-other-regular-expenses when priorityDebts is absent', async () => {
    await expect(getNextStep(createReq(undefined), 'priority-debts', flowConfig, {})).resolves.toBe(
      'what-other-regular-expenses-do-you-have'
    );
  });
});
