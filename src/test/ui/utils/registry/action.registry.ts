import { LoginAction } from '../actions/custom-actions/login.action';
import { NavigateToUrl } from '../actions/custom-actions/navigateToUrl.action';
import { CheckAction } from '../actions/element-actions/check.action';
import { ClickButtonAction } from '../actions/element-actions/clickButton.action';
import { ClickLinkAction } from '../actions/element-actions/clickLink.action';
import { ClickRadioButton } from '../actions/element-actions/clickRadioButton.action';
import { InputTextAction } from '../actions/element-actions/inputText.action';
import { IAction } from '../interfaces/action.interface';

export class ActionRegistry {
  private static actions: Map<string, IAction> = new Map([
    ['clickButton', new ClickButtonAction()],
    ['clickLink', new ClickLinkAction()],
    ['inputText', new InputTextAction()],
    ['check', new CheckAction()],
    ['clickRadioButton', new ClickRadioButton()],
    ['createUserAndLogin', new LoginAction()],
    ['navigateToUrl', new NavigateToUrl()],
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
