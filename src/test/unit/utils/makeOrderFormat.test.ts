import { formatTimeEstimate, parseTime, parseTimeEstimate } from '@utils/makeOrderFormat';

describe('parseTime', () => {
  it.each([
    ['10:30am', { hours: 10, minutes: 30 }],
    ['2 p.m.', { hours: 14, minutes: 0 }],
    ['14:30', { hours: 14, minutes: 30 }],
    ['09.15', { hours: 9, minutes: 15 }],
    ['12am', { hours: 0, minutes: 0 }],
  ])('reads %s as a time of day', (raw, time) => {
    expect(parseTime(raw)).toEqual(time);
  });

  it.each(['25:00', '13pm', '0:30am', '1030', 'after lunch', ''])('does not read %j as a time of day', raw => {
    expect(parseTime(raw)).toBeUndefined();
  });
});

describe('a hearing time estimate in days, hours and minutes', () => {
  const typed = (days: string, hours: string, minutes: string) => ({ days, hours, minutes });

  it('reads whole numbers, any left blank as nought', () => {
    expect(parseTimeEstimate(typed('3', '4', '30'))).toEqual({ days: 3, hours: 4, minutes: 30 });
    expect(parseTimeEstimate(typed('', '', '45'))).toEqual({ days: 0, hours: 0, minutes: 45 });
  });

  it('needs some time, whole numbers and minutes under an hour', () => {
    expect(parseTimeEstimate(typed('', '', ''))).toBeUndefined();
    expect(parseTimeEstimate(typed('0', '0', '0'))).toBeUndefined();
    expect(parseTimeEstimate(typed('', '1.5', ''))).toBeUndefined();
    expect(parseTimeEstimate(typed('', '', '60'))).toBeUndefined();
  });

  it('words it as the order gives it, leaving out what is nought', () => {
    expect(formatTimeEstimate({ days: 3, hours: 4, minutes: 30 })).toBe('3 days, 4 hours and 30 minutes');
    expect(formatTimeEstimate({ days: 1, hours: 0, minutes: 30 })).toBe('1 day and 30 minutes');
    expect(formatTimeEstimate({ days: 0, hours: 1, minutes: 0 })).toBe('1 hour');
  });
});
