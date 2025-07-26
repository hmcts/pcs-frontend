import { Page } from '@playwright/test';

export interface IAction<T = void> {
  execute(page: Page, fieldName: string, value?: string | number | boolean | string[] | object): Promise<T>;
}
