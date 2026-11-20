import { withTimeEstimateParts } from '@utils/makeOrderForm';

describe('withTimeEstimateParts: a time estimate saved before it was asked in days, hours and minutes', () => {
  it('gives a number of minutes or hours as hours and minutes', () => {
    expect(
      withTimeEstimateParts({ 'adj-time-estimate': '90', 'adj-time-estimate-unit': 'minutes', 'adj-type': 'x' })
    ).toEqual({ 'adj-time-estimate-hours': '1', 'adj-time-estimate-minutes': '30', 'adj-type': 'x' });
    expect(withTimeEstimateParts({ 'list-time-estimate': '2', 'list-time-estimate-unit': 'hours' })).toEqual({
      'list-time-estimate-hours': '2',
      'list-time-estimate-minutes': '',
    });
  });

  it('leaves an estimate already in parts, and anything else, as it is', () => {
    const parts = { 'adj-time-estimate-days': '1', 'adj-time-estimate-hours': '', 'adj-time-estimate-minutes': '' };
    expect(withTimeEstimateParts(parts)).toEqual(parts);
    expect(withTimeEstimateParts({ 'adj-time-estimate': '' })).toEqual({ 'adj-time-estimate': '' });
  });
});
