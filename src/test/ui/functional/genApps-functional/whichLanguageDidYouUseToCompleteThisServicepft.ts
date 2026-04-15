import { feedback } from '../../data/page-data';
import { whichLanguageDidYouUseToCompleteThisService } from '../../data/page-data/genApps-page-data';
import { performAction, performValidation } from '../../utils/controller';

export async function whichLanguageDidYouUseToCompleteThisServiceErrorValidation(): Promise<void> {
  await performAction('inputErrorValidationGenApp', {

  });
  }
  export async function whichLanguageDidYouUseToCompleteThisServiceNavigationTests(): Promise<void> {
    await performValidation('pageNavigation', whichLanguageDidYouUseToCompleteThisService.feedbackLink, {
      element: feedback.tellUsWhatYouThinkParagraph,
      pageSlug: whichLanguageDidYouUseToCompleteThisService.pageSlug,
    });
  }

