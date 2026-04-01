import { Page } from '@playwright/test';

import { chooseAnApplication } from '../../../data/genApps-page-data';
import { performAction } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

export class GenAppsAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['chooseAnApplication', () => this.chooseAnApplication(fieldName as actionRecord)],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async chooseAnApplication(chooseApp: actionRecord) {
    await performAction('clickRadioButton', {
      question: chooseApp.question,
      option: chooseApp.option,
    });
    await performAction('clickButton', chooseAnApplication.continueButton);
  }
}
