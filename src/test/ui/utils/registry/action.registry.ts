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
    ['NavigateToUrl', new NavigateToUrlAction()],
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
}
