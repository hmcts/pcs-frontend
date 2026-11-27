export const paymentInterstitial = {
  mainHeader: `Taliadau neu gytundebau ers gwneud yr hawliad`,
  youWillNowBeAskedParagraph: () =>
    `Gofynnir cwestiynau i chi nawr am unrhyw daliadau neu gytundebau a wnaed gennych ers i ${process.env.CLAIMANT_NAME} wneud eu hawliad.`,
  thisWillHelpParagraph: `Bydd hyn yn helpu barnwr i ddeall:`,
  ifAnyArrangementsList: `Os gwnaed unrhyw drefniadau’n barod i dalu’r arian sy’n ddyledus gennych mewn taliadau rhent (ôl-ddyledion rhent)`,
  ifYouHavePaidList: `Os ydych wedi talu rhywfaint neu’r cyfan o’r arian sy’n ddyledus gennych`,
  theClaimantParagraph: `Bydd yr hawlydd yn gallu gweld eich atebion.`,
  ifYouHavePaidSomeParagraph: `Os ydych wedi talu rhywfaint neu’r cyfan o’r arian sy’n ddyledus gennych, dylech ddod â thystiolaeth o hyn i’r gwrandawiad.`,
  continueButton: `Parhau`,
  cancelLink: `Canslo`,
  backLink: `Yn ôl`,
  feedbackLink: `adborth (yn agor mewn tab newydd)`,
  pageSlug: `payment-interstitial`,
};
