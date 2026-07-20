import { formatDateFromParts, getRelativeDate } from '../../../utils/common/date.utils';

const claimIssueDate = (): string => {
  const today = getRelativeDate();
  return formatDateFromParts(today.day, today.month, today.year) ?? '20 May 2025';
};

export const repaymentsAgreedLR = {
  mainHeader: 'Repayment agreement',
  hasDefendantComeToAgreementQuestion: (claimantsName: string) =>
    `Have you come to any agreement with ${claimantsName} to repay the arrears since ${claimIssueDate()}?`,
  yesRadioOption: `Yes`,
  noRadioOption: `No`,
  detailsTextInput: `Agreed £1000 last year`,
  defendantNotSureRadioOption: `Defendant is not sure`,
  saveAndContinueButton: `Save and continue`,
  saveForLaterButton: `Save for later`,
  youCanEnterUpToHiddenHintText: `You can enter up to 500 characters`,
  tooManyCharacterHiddenHintText: `You have 1 character too many`,
  backLink: `Back`,
  giveDetailsHiddenTextLabel: `Give details about how much they’ve agreed to pay and when`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  getSelectAgreementErrorMessage: (claimantsName: string) =>
    `Select if the defendant has come to any agreement with ${claimantsName} to repay the arrears since ${claimIssueDate()}`,
  mustBe500CharactersOrFewerErrorMessage: `Repayment agreement details must be 500 characters or less`,
  emojiTextInput: `👉 😄`,
  emojiErrorMessage: `Give details about how much the defendant agreed to pay, how often they will pay and when the agreement was made must only include letters a to z, and special characters such as hyphens, spaces and apostrophes`,
};
