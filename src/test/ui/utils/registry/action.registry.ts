import {
  CreateCaseAPIAction,
  FetchPINsAndValidateAccessCodeAPIAction,
  LoginAction,
  NavigateToUrlAction,
  RespondToClaimAction,
} from '../actions/custom-actions';
import {
  CheckAction,
  ClickButtonAction,
  ClickRadioButtonAction,
  ClickSummaryAction,
  ClickTabAction,
  InputTextAction,
  SelectAction,
  UploadFileAction,
  clickLinkAndVerifyNewTabTitleAction,
} from '../actions/element-actions';
import { ClickLinkAction } from '../actions/element-actions/clickLink.action';
import { IAction } from '../interfaces';

export class ActionRegistry {
  private static actions: Map<string, IAction> = new Map([
    ['check', new CheckAction()],
    ['clickButton', new ClickButtonAction()],
    ['clickSummary', new ClickSummaryAction()],
    ['clickLink', new ClickLinkAction()],
    ['clickLinkAndVerifyNewTabTitle', new clickLinkAndVerifyNewTabTitleAction()],
    ['clickRadioButton', new ClickRadioButtonAction()],
    ['clickTab', new ClickTabAction()],
    ['inputText', new InputTextAction()],
    ['select', new SelectAction()],
    ['UploadFile', new UploadFileAction()],
    ['login', new LoginAction()],
    ['createUser', new LoginAction()],
    ['navigateToUrl', new NavigateToUrlAction()],
    ['createCaseAPI', new CreateCaseAPIAction()],
    ['submitCaseAPI', new CreateCaseAPIAction()],
    ['selectLegalAdvice', new RespondToClaimAction()],
    ['inputDefendantDetails', new RespondToClaimAction()],
    ['enterDateOfBirthDetails', new RespondToClaimAction()],
    ['inputErrorValidation', new RespondToClaimAction()],
    ['fetchPINsAPI', new FetchPINsAndValidateAccessCodeAPIAction()],
    ['validateAccessCodeAPI', new FetchPINsAndValidateAccessCodeAPIAction()],
    ['selectLegalAdvice', new RespondToClaimAction()],
    ['inputDefendantDetails', new RespondToClaimAction()],
    ['enterDateOfBirthDetails', new RespondToClaimAction()],
    ['confirmDefendantDetails', new RespondToClaimAction()],
    ['selectCorrespondenceAddressKnown', new RespondToClaimAction()],
    ['selectNoticeDetails', new RespondToClaimAction()],
    ['enterNoticeDateKnown', new RespondToClaimAction()],
    ['enterNoticeDateUnknown', new RespondToClaimAction()],
    ['readPaymentInterstitial', new RespondToClaimAction()],
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
