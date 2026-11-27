import {
  DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG,
  whenLdFlag,
} from '../../../utils/actions/custom-actions/launchDarkly.action';

export const chooseAnApplication = {
  mainHeader: whenLdFlag(DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG, {
    on: `Choose your application`,
    off: `Choose an application`,
  }),
  caption: whenLdFlag(DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG, {
    on: `Stop or delay an eviction`,
    off: `Make an application`,
  }),
  postOnlyNoticeParagraph: whenLdFlag(DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG, {
    on: null,
    off: `You cannot apply to suspend (stop or delay) the eviction online. You must apply by post:`,
  }),
  postOnlyGuidanceLink: whenLdFlag(DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG, {
    on: null,
    off: `read the guidance explaining how to suspend the eviction (GOV.UK, opens in a new tab)`,
  }),
  postOnlyFillInFormLink: whenLdFlag(DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG, {
    on: null,
    off: `fill in the N244a form`,
  }),
  postOnlyFindCourtLink: whenLdFlag(DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG, { on: null, off: `find your local court` }),
  postOnlySendFormListItem: whenLdFlag(DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG, {
    on: null,
    off: `send the completed form to the court, or deliver it by hand`,
  }),
  whatDoYouWantToApplyForQuestion: `What do you want to apply for?`,
  adjournTheHearingRadioOption: `Ask to adjourn the hearing (move it to a later time or date)`,
  youCanApplyToChangeHintText: `You can apply to change the court hearing until a later time or date`,
  setAsideRadioOption: `Ask the court to set aside (cancel) a decision the court has made`,
  youCanAskTheCourtToSetAsideHintText: `You can ask the court to set aside its order if you have good reason. For example, if you were unable to attend the court hearing because you were ill`,
  somethingElseRadioOption: `Something else`,
  suspendApplicationRadioOption: whenLdFlag(DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG, {
    on: `Ask the court to suspend (stop or delay) the eviction`,
    off: null,
  }),
  suspendApplicationHintText: whenLdFlag(DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG, {
    on: `You can ask the court to ‘suspend the eviction’. This means stopping or delaying the eviction.`,
    off: null,
  }),
  makeAnApplicationForSomethingHintText: `Make an application for something that is not listed above`,
  continueButton: `Continue`,
  cancelLink: `Cancel`,
  feedbackLink: `feedback (opens in new tab)`,
  pageSlug: `choose-an-application`,
  thereIsAProblemErrorMessageHeader: `There is a problem`,
  errorValidationType: { one: `radioOptions`, two: `textField`, three: `checkBox` },
  errorValidationField: {
    errorRadioOption: {
      type: `none`,
      input: ``,
      errMessage: whenLdFlag(DEFENDANT_GENERAL_APPLICATIONS_R2_FLAG, {
        on: `Please select an application`,
        off: `Choose what you want to apply for`,
      }),
    },
  },
};
