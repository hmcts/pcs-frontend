import { Page } from 'playwright-core';

import { IAction, actionRecord } from '../../interfaces';

export const fieldsMap = new Map<string, string>();

export const FieldsStore = {
  
  set(key: string, value: string): void {
    fieldsMap.set(key, value);
  },

  
  get(key: string): string | undefined {
    return fieldsMap.get(key);
  },

  
  getAll(): ReadonlyMap<string, string> {
    return fieldsMap;
  },

  clear(): void {
    fieldsMap.clear();
  }
};


export class RecordAnswers implements IAction {
  async execute(page: Page, action: string, fieldName?: actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['recordUserEntry', () => this.recordUserEntry(fieldName as actionRecord)],

    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }
  private async recordUserEntry(fields: actionRecord) {
    const setIfKeyExists = (key?: string, value?: string) => {
      // eslint-disable-next-line curly
      if (key) FieldsStore.set(key, value ?? '');
    };
    setIfKeyExists(fields.question as string, fields.option as string);
    setIfKeyExists(fields.label as string, fields.input as string);
    setIfKeyExists(fields.confirm as string, fields.peopleOption as string);
  }
}