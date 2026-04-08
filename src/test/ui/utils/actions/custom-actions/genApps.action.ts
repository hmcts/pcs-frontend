import { Page } from '@playwright/test';

import { chooseAnApplication } from '../../../data/page-data/genApps-page-data';
import { performAction, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

export class GenAppsAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['chooseAnApplication', () => this.chooseAnApplication(fieldName as actionRecord)],
      ['inputErrorValidationGenApp', () => this.inputErrorValidationGenApp(fieldName as actionRecord)],
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

  private async inputErrorValidationGenApp(validationArr: actionRecord) {
    const inputs = Array.isArray(validationArr.inputArray) ? validationArr.inputArray : [validationArr.inputArray];

    for (const item of inputs) {
      switch (validationArr.validationType) {
        case 'radioOptions':
          await performAction('clickButton', validationArr.button);
          await performValidation(
            'errorMessage',
            !validationArr?.header ? (validationArr.header = 'There is a problem') : validationArr.header,
            item.errMessage
          );
          await performAction('clickRadioButton', { question: validationArr.question, option: validationArr.option });
          break;
      }
    }
  }
}
