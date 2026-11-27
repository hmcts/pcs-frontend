export const disputeClaimInterstitial = {
  getMainHeader: (claimantName: string): string => {
    const nameClaimant =
      claimantName.substring(claimantName.length - 1) === 's' ? `${claimantName}'` : `${claimantName}’s`;
    return nameClaimant + ' claim';
  },
  whenTheyMadeTheirClaimParagraph: `When they made their claim, they had to give information aboutPan wnaethant wneud eu hawliad, roedd yn rhaid iddynt roi gwybodaeth am:`,
  theTenancyList: `y denantiaeth, contract meddiannaeth neu gytundeb trwydded a lofnodwyd gennych i rentu eich eiddo`,
  theNoticeOfTheirIntentionList: `yr hysbysiad o’u bwriad i ddechrau achos meddiannu, os gwnaethant gyflwyno un i chi`,
  theirGroundsForPossessionList: `eu seiliau dros feddiannu (eu rhesymau dros wneud yr hawliad)`,
  ifAnyOfTheInformationParagraph: `Os bydd unrhyw wybodaeth a roddwyd ganddynt yn anghywir, gallwch ei chywiro.`,
  theClaimantParagraph: `Bydd yr hawlydd yn gallu gweld eich atebion.`,
  continueButton: `Parhau`,
  cancelLink: `Canslo`,
  cymraegLink: `English`,
  backLink: `Yn ôl`,
  feedbackLink: `Adborth (yn agor mewn tab newydd)`,
  pageSlug: `dispute-claim-interstitial`,
};
