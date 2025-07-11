import { Page, expect } from '@playwright/test';

import { IValidation, ValidationData } from '../../interfaces/validation.interface';

export class DashboardTasksValidation implements IValidation {
  async validate(page: Page, fieldName: string, data: ValidationData): Promise<void> {
    const errors: string[] = [];

    // Helper function for soft assertions
    const softAssert = async (assertion: () => Promise<void>, errorMessage: string) => {
      try {
        await assertion();
      } catch (error) {
        errors.push(errorMessage + (error instanceof Error ? `: ${error.message}` : ''));
      }
    };

    // Validate required fields first
    if (!data.title) {
      errors.push('Title is required in validation data');
    }
    if (!data.status) {
      errors.push('Status is required in validation data');
    }

    // Get locators
    const taskLocator = data.taskHasLink
      ? page.locator(`a.govuk-link:has-text("${data.title}")`)
      : page.locator(`div:has-text("${data.title}")`).first();

    const statusLocator = page.locator(
      `:has(> a:has-text("${data.title}"), > div:has-text("${data.title}")) ~ div:has-text("${data.status}")`
    );

    await softAssert(() => expect(taskLocator).toBeVisible(), 'Task element not visible');

    await softAssert(() => expect(taskLocator).toHaveText(data.title as string), 'Task title mismatch');

    await softAssert(() => expect(statusLocator).toBeVisible(), 'Status not visible');

    await softAssert(() => expect(statusLocator).toHaveText(data.status as string), 'Task status mismatch');

    if (data.deadline) {
      const deadlineLocator = taskLocator.locator('~ div');
      await softAssert(() => expect(deadlineLocator).toHaveText(data.deadline as string), 'Task deadline mismatch');
    }

    if (errors.length > 0) {
      throw new Error(`Dashboard validation failed:\n${errors.join('\n')}`);
    }
  }
}
