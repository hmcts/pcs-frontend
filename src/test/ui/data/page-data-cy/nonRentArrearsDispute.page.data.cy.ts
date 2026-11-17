import { generateRandomString } from '../../utils/common/string.utils';

export const nonRentArrearsDispute = {
  mainHeader: `Gwrthwynebu rhannau eraill o’r hawliad`,
  partOfClaimParagraph: `Dylech`,
  // Need to fix this as part of HDPI-5786
  //toSeeIfParagraph: `to see if there’s any other parts of the claim that are incorrect or you disagree with.`,
  viewTheClaimLink: `wirio’r hawliad (yn agor mewn tab newydd)`,
  titleGovServiceHiddenNewTab: `GOV.UK - The best place to find government services and information`,
  thisIncludesParagraph: `Mae hyn yn cynnwys:`,
  groundsForPossessionList: `${process.env.CLAIMANT_NAME} seiliau dros feddiannu (eu rhesymau dros wneud yr hawliad)`,
  // Need to fix this as part of HDPI-5786
  //anyDocumentsList: `unrhyw ddogfennau maent wedi eu huwchlwytho i gefnogi eu hawliad`,
  //anyOtherList: `unrhyw wybodaeth arall a roddwyd ganddynt fel rhan o’u hawliad`,
  doYouWantToDisputeQuestion: `A ydych eisiau gwrthwynebu unrhyw rannau eraill o’r hawliad?`,
  explainPartOfClaimHiddenTextLabel: `Eglurwch pa rannau o’r hawliad nad ydych yn cytuno â nhw`,
  explainClaimTextInput: `Example - Do not agree with claim 1`,
  yesRadioOption: `Ydy`,
  noRadioOption: `Nac ydy`,
  saveForLaterButton: `Cadw at hwyrach ymlaen`,
  saveAndContinueButton: `Cadw a pharhau`,
  backLink: `Yn ôl`,
  emojiTextInput: `👉 😄`,
  emojiExplainPartsOfClaimErrorMessage: `Dylai Eglurwch pa rannau o’r hawliad nad ydych yn cytuno â nhw ond cynnwys llythrennau a i z, a nodau arbennig fel cysylltnod, bylchau a chollnod`,
  detailsCharLimitInputText: generateRandomString(6501),
  tooManyCharacterHiddenHintText: `Mae gennych 1 nod yn ormod`,
  youHave6500CharactersHiddenHintText: `Mae gennych 6500 nod ar ôl`,
  thereIsAProblemErrorMessageHeader: `Mae yna broblem`,
  selectIfYouWantToDisputeErrorMessage: `Dewiswch a ydych eisiau gwrthwynebu unrhyw rannau eraill o’r hawliad`,
  partsOfClaimDoNotAgreeErrorMessage: `Nodwch y rhannau o’r hawliad nad ydych yn cytuno â nhw`,
  charLimitErrorMessage: `Rhaid i’r disgrifiad fod yn 6500 llythyren neu lai`,
};
