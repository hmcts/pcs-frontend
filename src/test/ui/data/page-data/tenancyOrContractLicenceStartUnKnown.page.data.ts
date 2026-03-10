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

export const tenancyStartDateUnKnown = {
  mainHeader: 'Tenancy, occupation contract or licence start date',
  forExampleParagraph: 'For example, 27 9 2022',
  dayTextLabel: 'Day',
  monthTextLabel: 'Month',
  yearTextLabel: 'Year',
  dayInputText: randomDOB.day.toString(),
  monthInputText: randomDOB.month.toString(),
  yearInputText: randomDOB.year.toString(),
  saveForLaterButton: 'Save for later',
  saveAndContinueButton: 'Save and continue',
  thereIsAProblemErrorMessageHeader: 'There is a problem',
  tenancyStartDateMustIncludeDay: 'Your tenancy start date must include a day',
  tenancyStartDateMustIncludeMonth: 'Your tenancy start date must include a month',
  tenancyStartDateMustIncludeYear: 'Your tenancy start date must include a year',
  tenancyStartDateMustBeRealDate: 'Tenancy start date must be a real date',
  backLink: 'Back',
};
