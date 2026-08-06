export const axe_exclusions = [
  '#correspondenceAddressConfirm-2', //page: correspondenceAddress, element: 'No', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#confirmRepaymentsMade', //page: repaymentsMade, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#contactByTelephone', //page: contactByTelephone, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#nameConfirmation-2', //page: DefendantNameConfirmation, element: 'No', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#confirmTenancyDate-2', //page: tenancyStartDateKnown, element: 'No', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#disputeOtherParts', //page: nonRentArrearsDispute, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#tenancyTypeConfirm-2', //page: tenancyOccupationContractLicenseAgreement, element: 'No', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#repaymentsAgreed', //page: repaymentsAgreed, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#contactByEmailOrPost', //page: contactPreferenceEmailOrPost, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#confirmAlternativeAccommodation', // page: wouldYouHaveSomewhereElseToLiveIfYouHadToLeaveYourHome, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#confirmOtherAdults', //page: doAnyOtherAdultsLiveInYourHome, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#dependantChildren', //page: doYouHaveAnyDependantChildren, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#otherDependants', //page: doYouHaveAnyOtherDependants, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#rentArrears-2', //page: rentArrears, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#confirmOtherAdults', ////page: doYouHaveAnyOtherAdults, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#disputeOtherParts', //page: disputePartOfClaim, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#shareCircumstances', //page: yourCircumstances, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#exceptionalHardship', //page: exceptionalHardship, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#alreadyAppliedForHelp', //page : alreadyAppliedForHelp,element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#haveAppliedForUniversalCredit', //page : haveYouAppliedForUniversalCredit,element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#alreadyAppliedForHwf', //page : alreadyAppliedForHwf,element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#otherConsiderations', //page: otherConsiderations, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#alreadyAppliedForHwf', //page : alreadyAppliedForHelp,element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#reasonsAppShouldNotBeShared', //page : reasonsAppShouldNotBeShared,element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#isClaimAmountKnown-2', //page: claimAmountKnown, element: 'No', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#isClaimAmountKnown', //,page: claimAmountKnown, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#address-country', //page: yourAddress, element: 'Country', element_type: select, reason_for_exclusion: 'aria-expanded' attribute is expected for this select
  // page: make-order — every radio with a conditional reveal. Same upstream cause as all of the
  // above: govuk-frontend's Radios component sets `aria-expanded` on any radio that controls a
  // reveal (radios.mjs), and `aria-expanded` is not an allowed attribute on `role=radio`, so axe
  // flags `aria-allowed-attr` on each one.
  //
  // A selector rather than an id per radio. Make an order has twelve such radios, and a scan of the
  // page as first loaded only flags one of them — axe skips hidden elements, and the other eleven
  // sit in a closed tab panel or an unopened reveal. So an id list is not just tedious to maintain,
  // it is quietly incomplete: it grows every time a test clicks a tab or ticks a checkbox before the
  // audit runs, and the failure looks like a new accessibility defect rather than the same upstream
  // one. Twelve ids today, and one more for every reveal added.
  //
  // Scoped by `.pcs-make-order`, the class this page puts on <html>, so it excludes nothing on any
  // other page and the 26 entries above keep covering theirs. `aria-expanded` in the selector keeps
  // it to the radios that actually trip the rule, so a plain radio on this page is still audited.
  //
  // Worth knowing what this costs, here and in the 26 entries above: `exclude` drops the element
  // from the scan entirely rather than waiving the one rule, so those radios are also not checked
  // for labelling or contrast. Their labels are covered by the unit and browser checks on this page
  // instead. Narrowing it to the rule needs axe's `disableRules`, which the shared harness only
  // applies to the whole page.
  '.pcs-make-order .govuk-radios__input[aria-expanded]',
];
