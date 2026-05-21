import { caseReferenceDisplay } from '@modules/nunjucks/filters/caseReferenceDisplay';

describe('caseReferenceDisplay filter', () => {
  it('formats 16 digit case references with spaces', () => {
    expect(caseReferenceDisplay('1777570813792018')).toBe('1777 5708 1379 2018');
  });
});
