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

export const defendantDateOfBirth = {
  mainHeader: `Beth yw eich dyddiad geni? (Dewisol)`,
  forExampleParagraph: `Er enghraifft, 31 3 1980`,
  dayTextLabel: `Diwrnod`,
  monthTextLabel: `Mis`,
  yearTextLabel: `Blwyddyn`,
  dayInputText: randomDOB.day.toString(),
  monthInputText: randomDOB.month.toString(),
  yearInputText: randomDOB.year.toString(),
  backLink: `Yn ôl`,
  saveAndContinueButton: `Cadw a pharhau`,
  saveForLaterButton: `Cadw at hwyrach ymlaen`,
  feedbackLink: `adborth (yn agor mewn tab newydd)`,
  pageSlug: `defendant-date-of-birth`,
};
