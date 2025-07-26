import fs from 'fs';
import path from 'path';

import { LoginAction } from '../actions/custom-actions/login.action';
import { NavigateToUrlAction } from '../actions/custom-actions/navigateToUrl.action';
import { CheckAction } from '../actions/element-actions/check.action';
import { ClickButtonAction } from '../actions/element-actions/clickButton.action';
import { clickRadioButton } from '../actions/element-actions/clickRadioButton.action';
import { FillAction } from '../actions/element-actions/fill.action';
import { IAction } from '../interfaces/action.interface';

export class ActionRegistry {
  private static actions: Map<string, IAction> = new Map([
    ['clickButton', new ClickButtonAction()],
    ['fill', new FillAction()],
    ['check', new CheckAction()],
    ['clickRadioButton', new clickRadioButton()],
    ['login', new LoginAction()],
    ['navigateToUrl', new NavigateToUrlAction()],
  ]);

  static getAction(actionName: string): IAction {
    const action = this.actions.get(actionName);
    if (!action) {
      throw new Error(
        `Action '${actionName}' is not registered. Available actions: ${Array.from(this.actions.keys()).join(', ')}`
      );
    }
    return action;
  }

  static getAvailableActions(): string[] {
    return Array.from(this.actions.keys());
  }

  static updateReadmeSection(): void {
    const readmePath = path.join(__dirname, '../../test-README.md');

    try {
      const currentContent = fs.readFileSync(readmePath, 'utf8');
      const updatedContent = this.syncReadmeWithRegistry(currentContent);

      if (updatedContent !== currentContent) {
        fs.writeFileSync(readmePath, updatedContent);
      }
    } catch (error) {
      throw new error(error.message);
    }
  }

  private static syncReadmeWithRegistry(content: string): string {
    const sectionHeader = '### Actions';
    const startIdx = content.indexOf(sectionHeader);

    if (startIdx === -1) {
      return content;
    }

    const endIdx = content.indexOf('###', startIdx + 1);
    const sectionEnd = endIdx === -1 ? content.length : endIdx;
    const beforeSection = content.slice(0, startIdx);
    const afterSection = content.slice(sectionEnd);
    const sectionContent = content.slice(startIdx, sectionEnd);

    const registeredActions = new Set(this.getAvailableActions());

    const lines = sectionContent.split('\n');
    const newLines: string[] = [sectionHeader]; // Start with header

    const tableLines = ['| Action          | Example Usage |'];

    for (const line of lines) {
      const actionMatch = line.match(/^\| (.*?)\s*\|(.*)\|/);
      if (actionMatch && !line.includes('---')) {
        const actionName = actionMatch[1].trim();
        if (registeredActions.has(actionName)) {
          tableLines.push(line);
          registeredActions.delete(actionName);
        }
      }
    }

    registeredActions.forEach(action => {
      tableLines.push(`| ${action.padEnd(15)} | \`performAction('${action}', ...)\` |`);
    });

    newLines.push(...tableLines, '\n'); // <-- This adds the blank line
    return beforeSection + newLines.join('\n') + afterSection;
  }
}
