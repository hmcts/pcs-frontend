export const axe_exclusions = [
  '#correspondenceAddressConfirm-2', //page: correspondenceAddress, element: 'No', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#confirmRepaymentsMade', //page: repaymentsMade, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  '#contactByTelephone', //page: contactByTelephone, element: 'Yes', element_type: radioOption, reason_for_exclusion: 'aria-expanded' attribute is expected for this radio button
  'a[href$="dashboard"]', //page: landlordRegistered, element: cancel link, element_type: anchor, reason_for_exclusion: 'link-name' - cancel text not passed to template
];
