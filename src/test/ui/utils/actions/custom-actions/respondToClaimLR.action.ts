import { Page } from '@playwright/test';

import {
  confirmationOfNoticeGiven,
  doYouHaveAnyDependantChildren,
  nonRentArrearsDispute,
  noticeDateWhenNotProvided,
  tenancyDateUnknown,
} from '../../../data/page-data';
import { performAction, performActions, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';

import { RespondToClaimAction } from './respondToClaim.action';

export let claimantsName: string;
export class RespondToClaimLRAction extends RespondToClaimAction implements IAction {
  async execute(page: Page, action: string, fieldName?: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['selectNoticeDetailsLR', () => this.selectNoticeDetailsLR(fieldName as actionRecord)],
      ['enterTenancyStartDetailsUnKnownLR', () => this.enterTenancyStartDetailsUnKnownLR(fieldName as actionRecord)],
      ['disputingOtherPartsOfTheClaimLR', () => this.disputingOtherPartsOfTheClaimLR(fieldName as actionRecord)],
      ['enterNoticeDateUnknownLR', () => this.enterNoticeDateUnknownLR(fieldName as actionRecord)],
      ['doesTheDependantHaveChildrenLR', () => this.doesTheDependantHaveChildrenLR(fieldName as actionRecord)],
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async selectNoticeDetailsLR(noticeGivenData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: confirmationOfNoticeGiven.getLrDidClaimantGiveYouQuestion(`${process.env.CLAIMANT_NAME}`),
      option: noticeGivenData.option,
    });
    await performAction('clickButton', confirmationOfNoticeGiven.saveAndContinueButton);
  }

  private async enterTenancyStartDetailsUnKnownLR(tenancyStartData: actionRecord) {
    const getDidNotProvideParagraph = tenancyDateUnknown.getLrDidNotProvideParagraph(`${process.env.CLAIMANT_NAME}`);

    await performValidation('text', { elementType: 'paragraph', text: getDidNotProvideParagraph });
    if (tenancyStartData?.tsDay && tenancyStartData?.tsMonth && tenancyStartData?.tsYear) {
      await performActions(
        'Enter Date',
        ['inputText', tenancyDateUnknown.dayTextLabel, tenancyStartData.tsDay],
        ['inputText', tenancyDateUnknown.monthTextLabel, tenancyStartData.tsMonth],
        ['inputText', tenancyDateUnknown.yearTextLabel, tenancyStartData.tsYear]
      );
    }
    await performAction('clickButton', tenancyDateUnknown.saveAndContinueButton);
  }

  private async disputingOtherPartsOfTheClaimLR(doYouWantToDisputeOption: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: nonRentArrearsDispute.doesTheDefendantWantToDisputeHiddenQuestion,
      option: doYouWantToDisputeOption.disputeOption,
    });

    if (doYouWantToDisputeOption.disputeOption === 'Yes') {
      await performAction(
        'inputText',
        nonRentArrearsDispute.explainPartOfClaimHiddenTextLabel,
        doYouWantToDisputeOption.disputeInfo
      );
    }
    await performAction('clickButton', nonRentArrearsDispute.saveAndContinueButton);
  }

  private async enterNoticeDateUnknownLR(noticeData: actionRecord): Promise<void> {
    const noticeDateNotProvidedQuestion = `When did the defendant receive notice from ${process.env.CLAIMANT_NAME} (optional)?`;
    await performValidation('text', { elementType: 'legend', text: noticeDateNotProvidedQuestion });
    await performValidation('text', {
      elementType: 'paragraph',
      text: noticeDateWhenNotProvided.didNotProvideHiddenParagraph(),
    });
    if (noticeData?.day && noticeData?.month && noticeData?.year) {
      await performActions(
        'Enter Date',
        ['inputText', noticeDateWhenNotProvided.dayTextLabel, noticeData.day],
        ['inputText', noticeDateWhenNotProvided.monthTextLabel, noticeData.month],
        ['inputText', noticeDateWhenNotProvided.yearTextLabel, noticeData.year]
      );
    }
    await performAction('clickButton', noticeDateWhenNotProvided.saveAndContinueButton);
  }

  private async doesTheDependantHaveChildrenLR(dependantChildrenData: actionRecord): Promise<void> {
    await performAction('clickRadioButton', {
      question: doYouHaveAnyDependantChildren.lrMainHeaderHidden,
      option: dependantChildrenData.dependantChildrenOption,
    });

    if (dependantChildrenData.dependantChildrenOption === 'Yes') {
      await performAction(
        'inputText',
        doYouHaveAnyDependantChildren.giveDetailsHiddenLrTextLabel,
        dependantChildrenData.dependantChildrenInfo
      );
    }
    await performAction('clickButton', doYouHaveAnyDependantChildren.saveAndContinueButton);
  }
}
