import { getCurrentFormattedDate } from '../../utils/common/date.utils';

export const repaymentsMade = {
  getmainHeader: (claimantName: string): string => {
    return `A ydych wedi talu unrhyw arian i ${claimantName} ers ${getCurrentFormattedDate()}?`;
  },
  yesRadioOption: `Do`,
  noRadioOption: `Naddo`,
  giveDetailsHiddenTextLabel: `Rhowch fanylion faint rydych wedi’i dalu a phryd`,
  detailsTextInput: `Paid £1000 last year`,
  saveAndContinueButton: `Cadw a pharhau`,
  detailsCharLimitInputText: `abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz1234567`,
  tooManyCharacterHiddenHintText: `Mae gennych %{count} nod yn ormod`,
  youHave500CharactersHiddenHintText: `Mae gennych 500 nod ar ôl`,
  thereIsAProblemErrorMessageHeader: `Mae yna broblem`,
  getSelectIfYouPaidAnyMoneyErrorMessage: (claimantName: string): string =>
    `Dewiswch a ydych wedi talu unrhyw arian i ${claimantName} ers ${getCurrentFormattedDate()}`,

  giveDetailsAboutHowMuchYouPaidErrorMessage: `Rhowch fanylion faint rydych wedi’i dalu a phryd`,
  mustBeUnderCharacterLimitErrorMessage: `Payment details must be 500 characters or less`,
  emojiTextInput: `👉 😄`,
  emojiErrorMessage: `Dylai Rhowch fanylion faint rydych wedi’i dalu a phryd ond cynnwys llythrennau a i z, a nodau arbennig fel cysylltnod, bylchau a chollnod`,
  saveForLaterButton: `Cadw at hwyrach ymlaen`,
  backLink: `Yn ôl`,
  feedbackLink: `adborth (yn agor mewn tab newydd)`,
  pageSlug: `repayments-made`,
};
