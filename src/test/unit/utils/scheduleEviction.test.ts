import { DateTime } from 'luxon';

import {
  DATE_INVALID,
  DATE_IN_PAST,
  DATE_REQUIRED,
  type EvictionAnswers,
  NEW_ANSWERS,
  dateError,
  displayDateTime,
  evictionDateTime,
  evictionErrors,
  postedAnswers,
  requestDateTime,
} from '@utils/scheduleEviction';

const NOW = DateTime.fromISO('2027-06-25T10:30', { zone: 'Europe/London' });

function answers(day: string, month: string, year: string, hour: string, minute: string): EvictionAnswers {
  return { ...NEW_ANSWERS, day, month, year, hour, minute };
}

describe('scheduleEviction', () => {
  it('starts with the dispense with service question on No', () => {
    expect(NEW_ANSWERS.dispenseWithService).toBe('NO');
  });

  it('treats the dispense with service question as No when nothing is posted', () => {
    expect(postedAnswers({}).dispenseWithService).toBe('NO');
  });

  it('reads the posted answers', () => {
    expect(
      postedAnswers({
        'dispense-with-service': 'YES',
        'eviction-date-day': ' 25 ',
        'eviction-date-month': '6',
        'eviction-date-year': '2027',
        'eviction-date-hour': '16',
        'eviction-date-minute': '20',
      })
    ).toEqual({ dispenseWithService: 'YES', day: '25', month: '6', year: '2027', hour: '16', minute: '20' });
  });

  it('requires a date and time', () => {
    expect(dateError(NEW_ANSWERS, NOW)).toBe(DATE_REQUIRED);
  });

  it.each([
    ['a missing time', answers('25', '6', '2027', '', '')],
    ['a day that does not exist', answers('31', '6', '2027', '10', '00')],
    ['an hour past 23', answers('25', '6', '2027', '24', '00')],
    ['a minute past 59', answers('25', '6', '2027', '10', '60')],
    ['a five digit year', answers('25', '6', '20277', '10', '00')],
    ['a two digit year', answers('25', '6', '27', '10', '00')],
    ['letters', answers('25', 'June', '2027', '10', '00')],
  ])('refuses %s', (_, given) => {
    expect(dateError(given, NOW)).toBe(DATE_INVALID);
  });

  it.each([
    ['yesterday', answers('24', '6', '2027', '12', '00')],
    ['earlier today', answers('25', '6', '2027', '10', '29')],
  ])('refuses a date and time in the past: %s', (_, given) => {
    expect(dateError(given, NOW)).toBe(DATE_IN_PAST);
  });

  it.each([
    ['now', answers('25', '6', '2027', '10', '30')],
    ['later today', answers('25', '6', '2027', '17', '30')],
    ['a later day', answers('1', '7', '2027', '09', '00')],
  ])('takes today or a later date and time: %s', (_, given) => {
    expect(dateError(given, NOW)).toBeUndefined();
  });

  it('requires the date', () => {
    expect(evictionErrors(NEW_ANSWERS, NOW)).toEqual({ date: DATE_REQUIRED });
  });

  it('has no errors once the date is answered', () => {
    expect(evictionErrors(answers('25', '6', '2027', '17', '30'), NOW)).toBeUndefined();
  });

  it('sends pcs-api the UK date and time', () => {
    expect(requestDateTime(evictionDateTime(answers('5', '6', '2027', '9', '5'))!)).toBe('2027-06-05T09:05');
  });

  it('shows the day of the week, and the 24-hour clock with am or pm', () => {
    expect(displayDateTime(evictionDateTime(answers('25', '6', '2027', '16', '20'))!)).toBe(
      'Friday 25 June 2027 at 16:20pm'
    );
    expect(displayDateTime(evictionDateTime(answers('25', '6', '2027', '9', '05'))!)).toBe(
      'Friday 25 June 2027 at 09:05am'
    );
  });
});
