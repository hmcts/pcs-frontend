const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

// Returns a date relative to today as zero-padded day, month, and year parts.
export function getRelativeDate(daysOffset: number = 0): {
  day: string;
  month: string;
  year: string;
} {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);

  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear()),
  };
}

// Builds a readable date only when the supplied parts form a valid calendar date.
export function formatDateFromParts(day?: unknown, month?: unknown, year?: unknown): string | undefined {
  const dayNumber = Number(String(day ?? '').trim());
  const monthNumber = Number(String(month ?? '').trim());
  const yearNumber = Number(String(year ?? '').trim());

  if (!Number.isInteger(dayNumber) || !Number.isInteger(monthNumber) || !Number.isInteger(yearNumber)) {
    return undefined;
  }

  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || yearNumber < 1) {
    return undefined;
  }

  const date = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));
  if (
    date.getUTCFullYear() !== yearNumber ||
    date.getUTCMonth() !== monthNumber - 1 ||
    date.getUTCDate() !== dayNumber
  ) {
    return undefined;
  }

  return `${dayNumber} ${monthNames[monthNumber - 1]} ${yearNumber}`;
}

const getOrdinal = (value: number): string => {
  if (value >= 11 && value <= 13) {
    return 'th';
  }

  switch (value % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

export function getCurrentFormattedDate(): string {
  const date = new Date();
  const day = date.getDate();
  return `${day}${getOrdinal(day)} ${date.toLocaleString('en-GB', {
    month: 'long',
  })} ${date.getFullYear()}`;
}
