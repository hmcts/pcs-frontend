import { parseTime } from '@utils/makeOrderFormat';

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
