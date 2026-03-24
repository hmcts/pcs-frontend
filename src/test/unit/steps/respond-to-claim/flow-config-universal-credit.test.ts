import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

describe('respond-to-claim flow config - Universal Credit conditional routing', () => {
  const createMockRequest = (): Request =>
    ({
      session: { formData: {} },
    }) as Request;

  describe('regular-income step conditional routing', () => {
    const regularIncomeStep = flowConfig.steps['regular-income'];

    it('routes to priority-debts when universalCredit checkbox is selected (single value)', async () => {
      const req = createMockRequest();
      const currentStepData = {
        regularIncome: 'universalCredit',
      };

      const route = regularIncomeStep.routes?.[0];
      expect(route).toBeDefined();

      const shouldRoute = await route!.condition!(req, {}, currentStepData);
      expect(shouldRoute).toBe(true);
      expect(route!.nextStep).toBe('priority-debts');
    });

    it('routes to priority-debts when universalCredit is in array (multiple selections)', async () => {
      const req = createMockRequest();
      const currentStepData = {
        regularIncome: ['incomeFromJobs', 'universalCredit', 'pension'],
      };

      const route = regularIncomeStep.routes?.[0];
      const shouldRoute = await route!.condition!(req, {}, currentStepData);
      expect(shouldRoute).toBe(true);
    });

    it('does not route to priority-debts when universalCredit is NOT selected', async () => {
      const req = createMockRequest();
      const currentStepData = {
        regularIncome: ['incomeFromJobs', 'pension'],
      };

      const route = regularIncomeStep.routes?.[0];
      const shouldRoute = await route!.condition!(req, {}, currentStepData);
      expect(shouldRoute).toBe(false);
    });

    it('does not route to priority-debts when regularIncome is empty', async () => {
      const req = createMockRequest();
      const currentStepData = {
        regularIncome: [],
      };

      const route = regularIncomeStep.routes?.[0];
      const shouldRoute = await route!.condition!(req, {}, currentStepData);
      expect(shouldRoute).toBe(false);
    });

    it('does not route to priority-debts when regularIncome is undefined', async () => {
      const req = createMockRequest();
      const currentStepData = {};

      const route = regularIncomeStep.routes?.[0];
      const shouldRoute = await route!.condition!(req, {}, currentStepData);
      expect(shouldRoute).toBe(false);
    });

    it('uses persisted formData when currentStepData is empty (back button scenario)', async () => {
      const req = createMockRequest();
      const persistedFormData = {
        'regular-income': {
          regularIncome: ['universalCredit', 'pension'],
        },
      };
      const currentStepData = {};

      const route = regularIncomeStep.routes?.[0];
      const shouldRoute = await route!.condition!(req, persistedFormData, currentStepData);
      expect(shouldRoute).toBe(true);
    });

    it('uses universal-credit as defaultNext when condition does not match', () => {
      expect(regularIncomeStep.defaultNext).toBe('universal-credit');
    });
  });

  describe('priority-debts step previousStep function', () => {
    const priorityDebtsStep = flowConfig.steps['priority-debts'];

    it('returns regular-income when user selected universalCredit', async () => {
      const req = createMockRequest();
      const formData = {
        'regular-income': {
          regularIncome: ['incomeFromJobs', 'universalCredit'],
        },
      };

      const previousStepFn = priorityDebtsStep.previousStep;
      expect(typeof previousStepFn).toBe('function');

      const previousStep = await (
        previousStepFn as (req: Request, formData: Record<string, unknown>) => Promise<string>
      )(req, formData);
      expect(previousStep).toBe('regular-income');
    });

    it('returns universal-credit when user did NOT select universalCredit', async () => {
      const req = createMockRequest();
      const formData = {
        'regular-income': {
          regularIncome: ['incomeFromJobs', 'pension'],
        },
      };

      const previousStepFn = priorityDebtsStep.previousStep;
      const previousStep = await (
        previousStepFn as (req: Request, formData: Record<string, unknown>) => Promise<string>
      )(req, formData);
      expect(previousStep).toBe('universal-credit');
    });

    it('returns universal-credit when regular-income data is missing', async () => {
      const req = createMockRequest();
      const formData = {};

      const previousStepFn = priorityDebtsStep.previousStep;
      const previousStep = await (
        previousStepFn as (req: Request, formData: Record<string, unknown>) => Promise<string>
      )(req, formData);
      expect(previousStep).toBe('universal-credit');
    });

    it('returns universal-credit when regularIncome is undefined', async () => {
      const req = createMockRequest();
      const formData = {
        'regular-income': {},
      };

      const previousStepFn = priorityDebtsStep.previousStep;
      const previousStep = await (
        previousStepFn as (req: Request, formData: Record<string, unknown>) => Promise<string>
      )(req, formData);
      expect(previousStep).toBe('universal-credit');
    });

    it('handles regularIncome as single string value', async () => {
      const req = createMockRequest();
      const formData = {
        'regular-income': {
          regularIncome: 'universalCredit',
        },
      };

      const previousStepFn = priorityDebtsStep.previousStep;
      const previousStep = await (
        previousStepFn as (req: Request, formData: Record<string, unknown>) => Promise<string>
      )(req, formData);
      expect(previousStep).toBe('regular-income');
    });
  });

  describe('AC13: Skip universal-credit step when UC selected', () => {
    it('full journey path: regular-income -> priority-debts (UC selected)', async () => {
      const req = createMockRequest();
      const currentStepData = {
        regularIncome: ['universalCredit', 'pension'],
      };

      // Step 1: User submits regular-income with UC selected
      const regularIncomeRoute = flowConfig.steps['regular-income'].routes?.[0];
      const shouldSkipUC = await regularIncomeRoute!.condition!(req, {}, currentStepData);
      expect(shouldSkipUC).toBe(true);
      expect(regularIncomeRoute!.nextStep).toBe('priority-debts');

      // Step 2: User clicks back from priority-debts
      const fullFormData = { 'regular-income': { regularIncome: ['universalCredit', 'pension'] } };
      const priorityDebtsPreviousStep = await (
        flowConfig.steps['priority-debts'].previousStep as (
          req: Request,
          formData: Record<string, unknown>
        ) => Promise<string>
      )(req, fullFormData);
      expect(priorityDebtsPreviousStep).toBe('regular-income');
    });

    it('full journey path: regular-income -> universal-credit -> priority-debts (UC NOT selected)', async () => {
      const req = createMockRequest();
      const currentStepData = {
        regularIncome: ['incomeFromJobs', 'pension'],
      };

      // Step 1: User submits regular-income without UC
      const regularIncomeRoute = flowConfig.steps['regular-income'].routes?.[0];
      const shouldSkipUC = await regularIncomeRoute!.condition!(req, {}, currentStepData);
      expect(shouldSkipUC).toBe(false);
      expect(flowConfig.steps['regular-income'].defaultNext).toBe('universal-credit');

      // Step 2: User clicks back from priority-debts
      const fullFormData = { 'regular-income': { regularIncome: ['incomeFromJobs', 'pension'] } };
      const priorityDebtsPreviousStep = await (
        flowConfig.steps['priority-debts'].previousStep as (
          req: Request,
          formData: Record<string, unknown>
        ) => Promise<string>
      )(req, fullFormData);
      expect(priorityDebtsPreviousStep).toBe('universal-credit');
    });
  });
});
