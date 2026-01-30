import { Page } from '@playwright/test';

import { noticeDateKnown } from '../../../data/page-data/noticeDateKnown.page.data';
import { noticeDateUnknown } from '../../../data/page-data/noticeDateUnknown.page.data';
import { noticeDetails } from '../../../data/page-data/noticeDetails.page.data';
import { performAction, performValidation } from '../../controller';
import { IAction, actionData, actionRecord } from '../../interfaces';


export class RespondToClaimAction implements IAction {
  async execute(page: Page, action: string, fieldName: actionData | actionRecord): Promise<void> {
    const actionsMap = new Map<string, () => Promise<void>>([
      ['selectNoticeDetails', () => this.selectNoticeDetails(fieldName)],
      ['enterNoticeDateKnown', () => this.enterNoticeDateKnown(fieldName as actionRecord)]
    ]);
    const actionToPerform = actionsMap.get(action);
    if (!actionToPerform) {
      throw new Error(`No action found for '${action}'`);
    }
    await actionToPerform();
  }

  private async selectNoticeDetails(noticeGivenOption: actionData): Promise<void> {
    await performAction('clickRadioButton', {
      question: noticeDetails.didClaimantGiveYouQuestion,
      option: noticeGivenOption,
    });
    // add back link navigation step??
    await performAction('clickButton', noticeDetails.saveAndContinueButton);
  }

  private async enterNoticeDateKnown(noticeData: actionRecord): Promise<void> {
    await performValidation('text',{
      'text': noticeDateKnown.noticeGivenDateLabel,
      'elementType': 'inlineText'
    });
    if (noticeData.day && noticeData.month && noticeData.year) {
      await performAction('inputText', noticeDateKnown.dayTextLabel, noticeData.day);
      await performAction('inputText', noticeDateKnown.monthTextLabel, noticeData.month);
      await performAction('inputText', noticeDateKnown.yearTextLabel, noticeData.year);
    }
    await performAction('clickButton', noticeDateKnown.saveAndContinueButton);
  }

  private async enterNoticeDateUnknown(noticeData: actionRecord): Promise<void> {
    await performValidation('text',{
      'text': noticeDateUnknown.didNotProvideNoticeLabel,
      'elementType': 'inlineText'
    });
    if (noticeData.day && noticeData.month && noticeData.year) {
      await performAction('inputText', noticeDateKnown.dayTextLabel, noticeData.day);
      await performAction('inputText', noticeDateKnown.monthTextLabel, noticeData.month);
      await performAction('inputText', noticeDateKnown.yearTextLabel, noticeData.year);
    }
    await performAction('clickButton', noticeDateKnown.saveAndContinueButton);
  }
}
