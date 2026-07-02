import { formatDateFromParts, getRelativeDate } from '../../utils/common/date.utils';

const claimIssueDate = (): string => {
  const today = getRelativeDate();
  return formatDateFromParts(today.day, today.month, today.year) ?? '20 May 2025';
};

export const repaymentsAgreed = {
  getMainHeader: (claimantsName: string) =>
    `Have you come to any agreement with ${claimantsName} to repay the arrears since ${claimIssueDate()}?`,
  yesRadioOption: `Yes`,
  noRadioOption: `No`,
  detailsTextInput: `Agreed £1000 last year`,
  amNotSureRadioOption: `I’m not sure`,
  saveAndContinueButton: `Save and continue`,
  saveForLaterButton: `Save for later`,
  giveDetailsHiddenTextLabel: `Give details about how much you’ve agreed to pay, how often you’ll pay and when the agreement was made`,
  lrGiveDetailsHiddenTextLabel: `Give details about how much they’ve agreed to pay and when`,
  youCanEnterUpToHiddenHintText: `You can enter up to 500 characters`,
  tooManyCharacterHiddenHintText: `You have 1 character too many`,
  backLink: `Back`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  getSelectAgreementErrorMessage: (claimantsName: string) =>
    `Select if you’ve come to any agreement with ${claimantsName} to repay the arrears since ${claimIssueDate()}`,
  mustBe500CharactersOrFewerErrorMessage: `Repayment agreement details must be 500 characters or less`,
  emojiTextInput: `👉 😄`,
  emojiErrorMessage: `Give details about how much you’ve agreed to pay, how often you’ll pay and when the agreement was made must only include letters a to z, and special characters such as hyphens, spaces and apostrophes`,
};
