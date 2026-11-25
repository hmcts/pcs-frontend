import { DateTime } from 'luxon';

/** What pcs-api sends when the schedule eviction event starts. */
export interface ScheduleEvictionStart {
  enforcementApplicationId: string;
  caseNumber: string;
  propertyAddress: string;
  caseName: string;
  claimantType?: string | null;
  claimantNames: string[];
  defendantNames: string[];
}

/** The bailiff's answers, kept as typed so the page can show them back. */
export interface EvictionAnswers {
  dispenseWithService?: 'YES' | 'NO';
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
}

export interface ScheduleEvictionSession {
  start: ScheduleEvictionStart;
  eventToken: string;
  answers: EvictionAnswers;
  scheduledFor?: string;
}

export const DATE_REQUIRED = 'Enter the date and time you want to schedule the eviction';
export const DATE_INVALID = 'Enter a real date and time for the eviction';
export const DATE_IN_PAST = 'The date and time of the eviction must be in the future';

export const NEW_ANSWERS: EvictionAnswers = {
  day: '',
  month: '',
  year: '',
  hour: '',
  minute: '',
};

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export function postedAnswers(body: Record<string, unknown>): EvictionAnswers {
  return {
    dispenseWithService:
      body['dispense-with-service'] === 'YES' || body['dispense-with-service'] === 'NO'
        ? body['dispense-with-service']
        : undefined,
    day: text(body['eviction-date-day']),
    month: text(body['eviction-date-month']),
    year: text(body['eviction-date-year']),
    hour: text(body['eviction-date-hour']),
    minute: text(body['eviction-date-minute']),
  };
}

/** The date and time in UK time, or undefined if the answers are not a real one. */
export function evictionDateTime({ day, month, year, hour, minute }: EvictionAnswers): DateTime | undefined {
  const dateTime = DateTime.fromFormat(`${day}/${month}/${year} ${hour}:${minute}`, 'd/M/yyyy H:m', {
    zone: 'Europe/London',
  });
  // Luxon accepts 24 as midnight the next day, so hours above 23 are rejected.
  if (!dateTime.isValid || Number(hour) > 23) {
    return undefined;
  }
  return dateTime;
}

export function dateError(answers: EvictionAnswers, now: DateTime = DateTime.now()): string | undefined {
  const { day, month, year, hour, minute } = answers;
  if (!day && !month && !year && !hour && !minute) {
    return DATE_REQUIRED;
  }
  const dateTime = evictionDateTime(answers);
  if (!dateTime) {
    return DATE_INVALID;
  }
  if (dateTime < now.startOf('minute')) {
    return DATE_IN_PAST;
  }
  return undefined;
}

export function requestDateTime(dateTime: DateTime): string {
  return dateTime.toFormat("yyyy-MM-dd'T'HH:mm");
}

/** As the pages show it, e.g. Friday 25 June 2027 at 16:20pm. */
export function displayDateTime(dateTime: DateTime): string {
  const amPm = dateTime.hour < 12 ? 'am' : 'pm';
  return `${dateTime.setLocale('en-GB').toFormat('cccc d LLLL yyyy')} at ${dateTime.toFormat('HH:mm')}${amPm}`;
}
