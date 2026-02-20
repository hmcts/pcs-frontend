function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDateOfBirth() {
  const year = getRandomInt(1950, 2005);
  const month = getRandomInt(1, 12);
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = getRandomInt(1, daysInMonth);
  return { day, month, year };
}

const randomDOB = getRandomDateOfBirth();

export const dateOfBirth = {
  mainHeader: 'What’s your date of birth? (Optional)',
  respondToClaimParagraph: 'Respond to a property possession claim',
  forExampleParagraph: 'For example, 27 9 2022',
  dayTextLabel: 'Day',
  monthTextLabel: 'Month',
  yearTextLabel: 'Year',
  dayInputText: randomDOB.day.toString(),
  monthInputText: randomDOB.month.toString(),
  yearInputText: randomDOB.year.toString(),
  backLink: 'Back',
  saveAndContinueButton: 'Save and continue',
  saveForLaterButton: 'Save for later',
};
