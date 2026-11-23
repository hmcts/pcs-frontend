export const confirmationOfNoticeGiven = {
  mainHeader: `Manylion yr hysbysiad`,
  noticeIsAFormalHintText: `Mae hysbysiad yn ddogfen ffurfiol gan eich landlord neu ddarparwr morgais yn dweud eu bod yn bwriadu cymryd camau cyfreithiol i ailfeddiannu’r eiddo, sy’n rhaid dilyn rhai gofynion cyfreithiol`,
  backLink: `Yn ôl`,
  getDidClaimantGiveYouQuestion(claimantName: string): string {
    return `A wnaeth ${claimantName} eich hysbysu am eu bwriad i ddechrau achos meddiannu?`;
  },
  imNotSureRadioOption: `Nid wyf yn siŵr`,
  noRadioOption: `Naddo`,
  orHintText: `neu`,
  saveAndContinueButton: `Cadw a pharhau`,
  saveForLaterButton: `Cadw at hwyrach ymlaen`,
  signOutLink: `Allgofnodi`,
  yesRadioOption: `Do`,
  thereIsAProblemErrorMessageHeader: `Mae problem`,
  selectIfNoticeOfIntentionGivenErrorMessage(claimantName: string): string {
    return `Dewiswch a wnaeth ${claimantName} eich hysbysu am eu bwriad i ddechrau achos meddiannu`;
  },
  feedbackLink: `adborth (yn agor mewn tab newydd)`,
  pageSlug: `confirmation-of-notice-given`,
};
