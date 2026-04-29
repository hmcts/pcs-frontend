export const journeys: Record<string, string[]> = {
  'journey1': [
    'choose-an-application',
    'ask-to-adjourn-the-court-hearing',
    'is-the-court-hearing-in-the-next-14-days',
    'do-you-need-help-paying-the-fee',
    'have-you-already-applied-for-help-with-fees',
    'have-the-other-parties-agreed-to-this-application',
    'what-order-do-you-want-the-court-to-make-and-why',
    'do-you-want-to-upload-documents-to-support-your-application',
    'upload-documents-to-support-your-application',
    'which-language-did-you-use-to-complete-this-service',
  ],
  'journey2': [
    // 'is-the-court-hearing-in-the-next-14-days',
    // 'do-you-need-help-paying-the-fee',
    'have-the-other-parties-agreed-to-this-application',
    'what-order-do-you-want-the-court-to-make-and-why',
    'do-you-want-to-upload-documents-to-support-your-application',
    'upload-documents-to-support-your-application',
    'which-language-did-you-use-to-complete-this-service',
  ],
  'journey3': [
    // 'is-the-court-hearing-in-the-next-14-days',
    // 'do-you-need-help-paying-the-fee',
    // 'have-you-already-applied-for-help-with-fees',
    'have-the-other-parties-agreed-to-this-application',
    'are-there-any-reasons-that-this-application-should-not-be-shared',
    'what-order-do-you-want-the-court-to-make-and-why',
    'do-you-want-to-upload-documents-to-support-your-application',
    'upload-documents-to-support-your-application',
    'which-language-did-you-use-to-complete-this-service',
  ],
  'Do you want to upload documents?': ['/documents/upload', '/documents/check'],
};

export const defaultJourney: string[] = ['/hearing/adjust-date'];
