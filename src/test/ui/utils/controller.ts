import { AxeUtils } from '@hmcts/playwright-common';
import { Page, test } from '@playwright/test';

import {
  enable_axe_audit,
  enable_content_validation,
  enable_error_message_validation,
  enable_navigation_tests,
} from '../../../../playwright.config';
import { axe_exclusions } from '../config/axe-exclusions.config';

import { TriggerPageFunctionalTestsAction } from './actions/custom-actions';
import { actionData, actionRecord, actionTuple, validationData, validationRecord, validationTuple } from './interfaces';
import { ActionRegistry, ValidationRegistry } from './registry';
import {
  ErrorMessageValidation,
  PageContentValidation,
  PageNavigationValidation,
  VisibilityValidation,
} from './validations/custom-validations';

let testExecutor: { page: Page };
let previousUrl: string = '';
let startFunctionalTests = false;
let startAxeAudit = false;

export function initializeExecutor(page: Page): void {
  testExecutor = { page };
  previousUrl = page.url();
}

function getExecutor(): { page: Page } {
  if (!testExecutor) {
    throw new Error('Test executor not initialized. Call initializeExecutor(page) first.');
  }
  return testExecutor;
}

async function detectPageNavigation(): Promise<boolean> {
  const executor = getExecutor();
  const currentUrl = executor.page.url();
  const testPages = ['start-now', 'choose-an-application'];
  if (!startAxeAudit && testPages.some(page => currentUrl.includes(page))) {
    startAxeAudit = true;
    startFunctionalTests = true;
  }
  const pageNavigated = currentUrl !== previousUrl;

  if (pageNavigated) {
    previousUrl = currentUrl;
  }

  return pageNavigated;
}

async function validatePageIfNavigated(action: string): Promise<void> {
  if (action.includes('click') || action.includes('navigateToUrl')) {
    const pageNavigated = await detectPageNavigation();
    const executor = getExecutor();
    if (pageNavigated) {
      if (startAxeAudit && enable_axe_audit === 'true') {
        try {
          await test.step('Running Accessibility Scan', async () => {
            await new AxeUtils(executor.page).audit({
              exclude: axe_exclusions,
            });
          });
        } catch (error) {
          const errorMessage = String((error as Error).message || error).toLowerCase();
          if (errorMessage.includes('execution context was destroyed') || errorMessage.includes('navigation')) {
            console.warn(`Accessibility audit skipped due to navigation: ${errorMessage}`);
          } else {
            throw error;
          }
        }
      }
      if (
        startFunctionalTests &&
        (enable_content_validation === 'true' ||
          enable_error_message_validation === 'true' ||
          enable_navigation_tests === 'true')
      ) {
        await performAction('triggerFunctionalTests');
      }
    }
  }
}

export async function performAction(
  action: string,
  fieldName?: actionData | actionRecord,
  value?: actionData | actionRecord
): Promise<void> {
  const executor = getExecutor();
  await validatePageIfNavigated(action);
  const actionInstance = ActionRegistry.getAction(action);

  let displayFieldName = fieldName;
  let displayValue = value ?? fieldName;

  if (typeof fieldName === 'string' && fieldName.toLowerCase() === 'password' && typeof value === 'string') {
    displayValue = '*'.repeat(value.length);
  } else if (typeof fieldName === 'object' && fieldName !== null && 'password' in fieldName) {
    const obj = fieldName as Record<string, never>;
    displayValue = { ...obj, password: '*'.repeat(String(obj.password).length) };
    displayFieldName = displayValue;
  }

  const stepText = `${action}${
    displayFieldName !== undefined
      ? ` - ${typeof displayFieldName === 'object' ? readValuesFromInputObjects(displayFieldName) : displayFieldName}`
      : ''
  }${
    displayValue !== undefined && value !== undefined
      ? ` with value '${typeof displayValue === 'object' ? readValuesFromInputObjects(displayValue) : displayValue}'`
      : ''
  }`;

  await test.step(stepText, async () => {
    await actionInstance.execute(executor.page, action, fieldName, value);
  });
  await validatePageIfNavigated(action);
}

export async function performValidation(
  validation: string,
  inputFieldName?: validationData | validationRecord,
  inputData?: validationData | validationRecord
): Promise<void> {
  const executor = getExecutor();

  const [fieldName, data] =
    inputFieldName === undefined
      ? ['', undefined]
      : typeof inputFieldName === 'string'
        ? [inputFieldName, inputData]
        : ['', inputFieldName];

  const validationInstance = ValidationRegistry.getValidation(validation);
  await test.step(`Validated ${validation}${
    fieldName ? ` - '${typeof fieldName === 'object' ? readValuesFromInputObjects(fieldName) : fieldName}'` : ''
  }${
    data !== undefined ? ` with value '${typeof data === 'object' ? readValuesFromInputObjects(data) : data}'` : ''
  }`, async () => {
    await validationInstance.validate(executor.page, validation, fieldName, data);
  });
}

export async function performActions(groupName: string, ...actions: actionTuple[]): Promise<void> {
  getExecutor();
  await test.step(`${groupName}`, async () => {
    for (const action of actions) {
      const [actionName, fieldName, value] = action;
      await performAction(actionName, fieldName, value);
    }
  });
}

export async function performValidations(groupName: string, ...validations: validationTuple[]): Promise<void> {
  getExecutor();
  await test.step(`${groupName}`, async () => {
    for (const validation of validations) {
      const [validationType, fieldName, data] = validation;
      await performValidation(validationType, fieldName, data);
    }
  });
}

function readValuesFromInputObjects(obj: object): string {
  const keys = Object.keys(obj);
  const formattedPairs = keys.map(key => {
    const value = (obj as actionRecord)[key];
    let valueString: string;
    if (Array.isArray(value)) {
      valueString = `[${value
        .map(item => (typeof item === 'object' ? `{ ${readValuesFromInputObjects(item)} }` : String(item)))
        .join(', ')}]`;
    } else if (typeof value === 'object' && value !== null) {
      valueString = `{ ${readValuesFromInputObjects(value)} }`;
    } else {
      valueString = String(value);
    }
    return `${key}: ${valueString}`;
  });
  return `${formattedPairs.join(', ')}`;
}

export function finaliseAllValidations(): void {
  const errors: Error[] = [];

  TriggerPageFunctionalTestsAction.resetTestedPages();

  try {
    PageContentValidation.finaliseTest();
  } catch (error) {
    errors.push(error as Error);
  }

  try {
    VisibilityValidation.finaliseTest();
  } catch (error) {
    errors.push(error as Error);
  }

  try {
    ErrorMessageValidation.finaliseTest();
  } catch (error) {
    errors.push(error as Error);
  }

  try {
    PageNavigationValidation.finaliseTest();
  } catch (error) {
    errors.push(error as Error);
  }

  if (errors.length > 0) {
    const errorMessages = errors.map(e => e.message).join('\n\n');
    throw new Error(`\n❌ VALIDATION FAILURES:\n\n${errorMessages}`);
  }
}
