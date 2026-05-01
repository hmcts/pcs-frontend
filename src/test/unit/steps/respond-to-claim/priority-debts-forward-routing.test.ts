import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

describe('respond-to-claim priority-debts forward routing', () => {
  const routes = flowConfig.steps['priority-debts'].routes || [];
  const priorityDebtDetailsRouteCondition = routes[0]?.condition;
  const otherRegularExpensesRouteCondition = routes[1]?.condition;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req = {} as any;

  it('routes to priority-debt-details when user answers YES', async () => {
    if (!priorityDebtDetailsRouteCondition) {
      throw new Error('expected priority-debt-details route condition');
    }
    const result = await priorityDebtDetailsRouteCondition(req, {}, { havePriorityDebts: 'yes' });

    expect(result).toBe(true);
    expect(routes[0]?.nextStep).toBe('priority-debt-details');
  });

  it('routes to what-other-regular-expenses when user answers NO', async () => {
    if (!otherRegularExpensesRouteCondition) {
      throw new Error('expected other-regular-expenses route condition');
    }
    const result = await otherRegularExpensesRouteCondition(req, {}, { havePriorityDebts: 'no' });

    expect(result).toBe(true);
    expect(routes[1]?.nextStep).toBe('what-other-regular-expenses-do-you-have');
  });

  it('routes are mutually exclusive for a given answer', async () => {
    if (!priorityDebtDetailsRouteCondition || !otherRegularExpensesRouteCondition) {
      throw new Error('expected priority-debts route conditions');
    }
    const yesAnswer = { havePriorityDebts: 'yes' };
    const noAnswer = { havePriorityDebts: 'no' };

    expect(await priorityDebtDetailsRouteCondition(req, {}, noAnswer)).toBe(false);
    expect(await otherRegularExpensesRouteCondition(req, {}, yesAnswer)).toBe(false);
  });
});
