import { getCurrentFormattedDate } from '../../utils/common/date.utils';

export const repaymentsAgreed = {
  getMainHeader: (claimantsName: string) =>
    `A ydych wedi dod i gytundeb gyda ${claimantsName} i ad-dalu’r ôl-ddyledion ers ${getCurrentFormattedDate()}?`,
  yesRadioOption: `Do`,
  noRadioOption: `Naddo`,
  detailsTextInput: `Agreed £1000 last year`,
  amNotSureRadioOption: `Nid wyf yn siŵr`,
  saveAndContinueButton: `Cadw a pharhau`,
  saveForLaterButton: `Cadw at hwyrach ymlaen`,
  giveDetailsHiddenTextLabel: `Rhowch fanylion faint rydych wedi cytuno i’w dalu, pa mor aml y byddwch yn talu a phryd wnaed y cytundeb`,
  youCanEnterUpToHiddenHintText: `Gallwch nodi hyd at 500 o nodau`,
  tooManyCharacterHiddenHintText: `Mae gennych 1 nod yn ormod`,
  backLink: `Yn ôl`,
  thereIsAProblemErrorMessageHeader: `Mae yna broblem`,
  getSelectAgreementErrorMessage: (claimantsName: string) =>
    `Dewiswch a ydych wedi dod i gytundeb gyda ${claimantsName} i ad-dalu’r ôl-ddyledion ers ${getCurrentFormattedDate()}`,
  mustBe500CharactersOrFewerErrorMessage: `Rhaid i fanylion y cytundeb ad-dalu fod yn 500 o nodau neu lai`,
  emojiTextInput: `👉 😄`,
  emojiErrorMessage: `Dylai Rhowch fanylion faint rydych wedi cytuno i’w dalu, pa mor aml y byddwch yn talu a phryd wnaed y cytundeb ond cynnwys llythrennau a i z, a nodau arbennig fel cysylltnod, bylchau a chollnod`,
};
