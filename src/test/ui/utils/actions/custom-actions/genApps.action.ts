import { Page } from '@playwright/test';

import {
  areThereAnyReasonsThatThisApplicationShouldNotBeShared,
  chooseAnApplication,
  doYouNeedHelpPayingTheFee,
  haveTheOtherPartiesAgreedToThisApplication,
  haveYouAlreadyAppliedForHelpWithFees,
  isTheCourtHearingInTheNext14Days,
} from '../../../data/page-data/genApps-page-data';
import { compareMaps } from '../../common/compareMaps.util';
import { generateRandomString } from '../../common/string.utils';
import { performAction, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

import { FieldsStore } from './recordAnsweredFields.action';

const cyaMap = new Map<string, string>();

export class GenAppsAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['chooseAnApplication', () => this.chooseAnApplication(fieldName as actionRecord)],
      ['confirmIfCourtHearingInNext14Days', () => this.confirmIfCourtHearingInNext14Days(fieldName as actionRecord)],
      ['doYouNeedHelpPayingFee', () => this.doYouNeedHelpPayingFee(fieldName as actionRecord)],
      ['confirmYouHaveAppliedForFeeHelp', () => this.confirmYouHaveAppliedForFeeHelp(fieldName as actionRecord)],
      ['confirmOtherPartiesAgreed', () => this.confirmOtherPartiesAgreed(fieldName as actionRecord)],
      ['reasonsApplicationShouldNotBeShared', () => this.reasonsApplicationShouldNotBeShared(fieldName as actionRecord)],
      ['inputErrorValidationGenApp', () => this.inputErrorValidationGenApp(fieldName as actionRecord)],
      ['retrieveCYATableData', () => this.retrieveCYATableData(page)],
      ['validateCYA', () => this.validateCYA()],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async chooseAnApplication(chooseApp: actionRecord) {
    await performAction('recordUserEntry', chooseApp);
    await performAction('clickRadioButton', {
      question: chooseApp.question,
      option: chooseApp.option,
    });
    FieldsStore.rename(chooseApp.question as string, 'Type of application');
    await performAction('clickButton', chooseAnApplication.continueButton);
  }

  private async confirmIfCourtHearingInNext14Days(courtHearing: actionRecord) {
    await performAction('recordUserEntry', courtHearing);
    await performAction('clickRadioButton', {
      question: courtHearing.question,
      option: courtHearing.option,
    });
    await performAction('clickButton', isTheCourtHearingInTheNext14Days.continueButton);
  }

  private async doYouNeedHelpPayingFee(feeHelp: actionRecord) {
    await performAction('recordUserEntry', feeHelp);
    await performAction('clickRadioButton', {
      question: feeHelp.question,
      option: feeHelp.option,
    });
    await performAction('clickButton', doYouNeedHelpPayingTheFee.continueButton);
  }

  private async confirmYouHaveAppliedForFeeHelp(confirmFeeHelp: actionRecord) {
    await performAction('recordUserEntry', confirmFeeHelp);
    await performAction('clickRadioButton', {
      question: confirmFeeHelp.question,
      option: confirmFeeHelp.option,
    });
    if (confirmFeeHelp.option === 'Yes') {
      await performAction('inputText', confirmFeeHelp.label, confirmFeeHelp.input);
    } else {
      FieldsStore.delete(confirmFeeHelp.label as string);
    }
    await performAction('clickButton', haveYouAlreadyAppliedForHelpWithFees.continueButton);
  }

  private async confirmOtherPartiesAgreed(confirmOtherParty: actionRecord) {
    await performAction('recordUserEntry', confirmOtherParty);
    await performAction('clickRadioButton', {
      question: confirmOtherParty.question,
      option: confirmOtherParty.option,
    });
    await performAction('clickButton', haveTheOtherPartiesAgreedToThisApplication.continueButton);
  }

  private async reasonsApplicationShouldNotBeShared(reason: actionRecord) {
    await performAction('recordUserEntry', reason);
    await performAction('clickRadioButton', {
      question: reason.question,
      option: reason.option,
    });
    if (reason.option === 'Yes') {
      await performAction('inputText', reason.label, reason.input);
    } else {
      FieldsStore.delete(reason.label as string);
    }
    await performAction('clickButton', areThereAnyReasonsThatThisApplicationShouldNotBeShared.continueButton);
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

        case 'textField':
          await performAction('inputText', validationArr.label, generateRandomString(item.input));
          await performAction('clickButton', validationArr.button);
          await performValidation('errorMessage', validationArr.label, item.errMessage);
          break;
      }
    }
  }

  private async retrieveCYATableData(page: Page) {

    const tables = page.locator(`//dl`);
    const tableCount = await tables.count();

    if (tableCount === 0) { throw new Error(`CYA table not found. Exiting...`); }

    for (let i = 0; i < tableCount; i++) {
      const curTable = tables.nth(i);


      if (!await curTable.isVisible()) {
        throw new Error('table not found');
      }


      const rows = curTable.locator('.govuk-summary-list__row');
      const rowCount = await rows.count();


      for (let j = 0; j < rowCount; j++) {
        const row = rows.nth(j);

        if (!(await row.isVisible())) { continue; }

        const keyQns = row.locator('dt.govuk-summary-list__key');
        const valAns = row.locator('dd.govuk-summary-list__value');

        if ((await keyQns.count()) === 0 || (await valAns.count()) === 0) { continue; }

        const keyText = (await keyQns.first().innerText()).trim();
        const valText = (await valAns.first().innerText()).trim().replace(/\r?\n+/g, ',');
        if (keyText && keyText.length > 0) {
          cyaMap.set(keyText ?? '', valText ?? '');
        }
      }
    }
  };


  private async validateCYA() {
    // console.log('CYA field count is :' + cyaMap.size);

    // for (const [k, v] of cyaMap) {
    //   console.log(`key from CYA page: "${k}" → value from CYA page: "${v}"`);
    // }
    // console.log('User input count is :' + FieldsStore.getAll().size);

    const misMatchMap = compareMaps(cyaMap, FieldsStore.getAll());
    // console.log('mismatch size is '+misMatchMap.size);

    if (misMatchMap.size > 0) {
      console.log(`❌ Differences found: ${misMatchMap.size}`);
      for (const [key, val] of misMatchMap) {
        const expectedValue = val.a === undefined ? '<missing>' : String(val.a);
        const actualValue = val.b === undefined ? '<missing>' : String(val.b);
        console.log('============================================================');
        console.log(`• key: "${String(key)}" → Expected: ${expectedValue} | Actual: ${actualValue}`);
      }
    } else {
      console.log('\n✅ CHECK YOUR ANSWERS VALIDATION PASSED!\n');
    }
    cyaMap.clear();
  }
}
