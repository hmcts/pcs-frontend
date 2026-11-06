import { todayInLondon } from '../../../../main/steps/make-a-claim/dates';

describe('todayInLondon', () => {
  it('is the date in England, not UTC, just after midnight in summer', () => {
    expect(todayInLondon(new Date('2026-06-30T23:30:00Z'))).toBe('2026-07-01');
  });

  it('is the same as UTC in winter', () => {
    expect(todayInLondon(new Date('2026-12-31T23:30:00Z'))).toBe('2026-12-31');
  });
});
