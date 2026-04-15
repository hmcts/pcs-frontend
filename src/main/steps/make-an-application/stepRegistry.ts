import { step as applicationSubmitted } from './application-submitted';
import { step as areThereAnyReasonsThatThisApplicationShouldNotBeShared } from './are-there-any-reasons-that-this-application-should-not-be-shared';
import { step as askToMakeAnOrder } from './ask-the-court-to-make-an-order';
import { step as askToAdjourn } from './ask-to-adjourn-the-court-hearing';
import { step as askToSetAside } from './ask-to-set-aside-the-decision-to-evict-you';
import { step as checkYourAnswers } from './check-your-answers';
import { step as chooseAnApplication } from './choose-an-application';
import { step as doYouNeedHelpPayingTheFee } from './do-you-need-help-paying-the-fee';
import { step as doYouWanToUploadDocuments } from './do-you-want-to-upload-documents-to-support-your-application';
import { step as haveTheOtherPartiesAgreedToThisApplication } from './have-the-other-parties-agreed-to-this-application';
import { step as haveYouAlreadyAppliedForHelp } from './have-you-already-applied-for-help';
import { step as isTheCourtHearingInTheNext14Days } from './is-the-court-hearing-in-the-next-14-days';
import { step as uploadDocumentsToSupportYourApplication } from './upload-documents-to-support-your-application';
import { step as whatOrderDoYouWantTheCourtToMakeAndWhy } from './what-order-do-you-want-the-court-to-make-and-why';
import { step as whichLanguageDidYouUseToCompleteThisService } from './which-language-did-you-use-to-complete-this-service';
import { step as youNeedToApplyForHelpWithYourApplicationFee } from './you-need-to-apply-for-help-with-your-application-fee';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const stepRegistry: Record<string, StepDefinition> = {
  'choose-an-application': chooseAnApplication,
  'ask-to-adjourn-the-court-hearing': askToAdjourn,
  'ask-to-set-aside-the-decision-to-evict-you': askToSetAside,
  'ask-the-court-to-make-an-order': askToMakeAnOrder,
  'is-the-court-hearing-in-the-next-14-days': isTheCourtHearingInTheNext14Days,
  'do-you-need-help-paying-the-fee': doYouNeedHelpPayingTheFee,
  'have-you-already-applied-for-help': haveYouAlreadyAppliedForHelp,
  'you-need-to-apply-for-help-with-your-application-fee': youNeedToApplyForHelpWithYourApplicationFee,
  'have-the-other-parties-agreed-to-this-application': haveTheOtherPartiesAgreedToThisApplication,
  'are-there-any-reasons-that-this-application-should-not-be-shared':
    areThereAnyReasonsThatThisApplicationShouldNotBeShared,
  'what-order-do-you-want-the-court-to-make-and-why': whatOrderDoYouWantTheCourtToMakeAndWhy,
  'do-you-want-to-upload-documents-to-support-your-application': doYouWanToUploadDocuments,
  'upload-documents-to-support-your-application': uploadDocumentsToSupportYourApplication,
  'which-language-did-you-use-to-complete-this-service': whichLanguageDidYouUseToCompleteThisService,
  'check-your-answers': checkYourAnswers,
  'application-submitted': applicationSubmitted,
};
