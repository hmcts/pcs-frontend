import {
  CreateCaseAPIAction,
  FetchPINsAndValidateAccessCodeAPIAction,
  LoginAction,
  NavigateToUrlAction,
  RespondToClaimAction,
  TriggerPageFunctionalTestsAction,
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
} from '../actions/element-actions';
import { ClickLinkAction } from '../actions/element-actions/clickLink.action';
import { IAction } from '../interfaces';

export class ActionRegistry {
  private static actions: Map<string, IAction> = new Map<string, IAction>([
    ['check', new CheckAction()],
    ['clickButton', new ClickButtonAction()],
    ['clickSummary', new ClickSummaryAction()],
    ['clickLink', new ClickLinkAction()],
    ['clickLinkAndVerifyNewTabTitle', new ClickLinkAction()],
    ['clickLinkAndVerifySameTabTitle', new ClickLinkAction()],
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
    ['fetchPINsAPI', new FetchPINsAndValidateAccessCodeAPIAction()],
    ['validateAccessCodeAPI', new FetchPINsAndValidateAccessCodeAPIAction()],
    ['selectLegalAdvice', new RespondToClaimAction()],
    ['inputDefendantDetails', new RespondToClaimAction()],
    ['enterDateOfBirthDetails', new RespondToClaimAction()],
    ['inputErrorValidation', new RespondToClaimAction()],
    ['selectLegalAdvice', new RespondToClaimAction()],
    ['confirmDefendantDetails', new RespondToClaimAction()],
    ['selectCorrespondenceAddressKnown', new RespondToClaimAction()],
    ['selectCorrespondenceAddressUnKnown', new RespondToClaimAction()],
    ['selectContactByTelephone', new RespondToClaimAction()],
    ['selectContactByTextMessage', new RespondToClaimAction()],
    ['selectNoticeDetails', new RespondToClaimAction()],
    ['enterNoticeDateKnown', new RespondToClaimAction()],
    ['enterNoticeDateUnknown', new RespondToClaimAction()],
    ['disputeClaimInterstitial', new RespondToClaimAction()],
    ['readPaymentInterstitial', new RespondToClaimAction()],
    ['repaymentsMade', new RespondToClaimAction()],
    ['selectLandlordRegistered', new RespondToClaimAction()],
    ['selectWrittenTerms', new RespondToClaimAction()],
    ['enterTenancyStartDetailsUnKnown', new RespondToClaimAction()],
    ['triggerFunctionalTests', new TriggerPageFunctionalTestsAction()],
    ['repaymentsAgreed', new RespondToClaimAction()],
    ['selectTenancyStartDateKnown', new RespondToClaimAction()],
    ['disputingOtherPartsOfTheClaim', new RespondToClaimAction()],
    ['tenancyOrContractTypeDetails', new RespondToClaimAction()],
    ['selectLandlordLicensed', new RespondToClaimAction()],
    ['selectContactPreferenceEmailOrPost', new RespondToClaimAction()],
    ['selectIfAnyOtherAdultsLiveInYourHouse', new RespondToClaimAction()],
    ['selectAlternativeAccommodation', new RespondToClaimAction()],
    ['readYourHouseholdAndCircumstances', new RespondToClaimAction()],
    ['doYouHaveAnyDependantChildren', new RespondToClaimAction()],
    ['doYouHaveAnyOtherDependants', new RespondToClaimAction()],
    ['rentArrears', new RespondToClaimAction()],
    ['yourCircumstances', new RespondToClaimAction()],
    ['exceptionalHardship', new RespondToClaimAction()],
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
