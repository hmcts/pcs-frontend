const getFormattedDate = (): string =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(new Date())
    .replace(',', '');

export const checkYourAnswers = {
  mainHeader: 'Check your answers',

  uploadedDocumentsKey: 'Uploaded documents',
  relatedApplicationKey: 'Related application',

  getRelatedApplicationAdjournValue: () =>
    `Yes, the documents I’m uploading relate to the application to adjourn the hearing - submitted on ${getFormattedDate()}`,
  relatedApplicationNoValue: 'No, the documents I’m uploading relate to the main claim or counterclaim',

  changeLink: 'Change',
  submitButton: 'Submit',
  cancelLink: 'Cancel',
};
