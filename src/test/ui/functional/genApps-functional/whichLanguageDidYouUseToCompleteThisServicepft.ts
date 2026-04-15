import { dashboard, feedback } from '../../data/page-data';
import { whichLanguageDidYouUseToCompleteThisService,
} from '../../data/page-data/genApps-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function whichLanguageDidYouUseToCompleteThisServiceErrorValidation(): Promise<void> {
  await performAction('inputErrorValidationGenApp', {
    validationType: whichLanguageDidYouUseToCompleteThisService.errorValidationType.one,
    inputArray: whichLanguageDidYouUseToCompleteThisService.errorValidationField.errorRadioOption,
    header: whichLanguageDidYouUseToCompleteThisService.thereIsAProblemErrorMessageHeader,
    question: whichLanguageDidYouUseToCompleteThisService.whichLanguageDidYouUseQuestion,
    option: whichLanguageDidYouUseToCompleteThisService.englishAndWelshRadioOption,
    button: whichLanguageDidYouUseToCompleteThisService.continueButton,
  });
}
export async function whichLanguageDidYouUseToCompleteThisServiceNavigationTests(): Promise<void> {
  await performValidation('pageNavigation', whichLanguageDidYouUseToCompleteThisService.feedbackLink, {
    element: feedback.tellUsWhatYouThinkParagraph,
    pageSlug: whichLanguageDidYouUseToCompleteThisService.pageSlug,
  });
  await performValidation('pageNavigation', whichLanguageDidYouUseToCompleteThisService.cancelLink, dashboard.mainHeader);
}
