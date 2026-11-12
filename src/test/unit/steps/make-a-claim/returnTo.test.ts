import type { Request } from 'express';

import { returnToOf, stepNameOfUrl, withReturnTo } from '../../../../main/steps/make-a-claim/returnTo';

const requestWith = (returnTo: unknown) => ({ query: { returnTo } }) as unknown as Request;

describe('returnToOf', () => {
  it.each([
    ['claimant-cya', 'claimant-cya'],
    ['check-your-answers', 'check-your-answers'],
    ['https://example.com', undefined],
    ['/case/1/make-a-claim/claimant-cya', undefined],
    [['arrears-cya', 'x'], 'arrears-cya'],
    [undefined, undefined],
  ])('reads %p as %p', (value, expected) => {
    expect(returnToOf(requestWith(value))).toBe(expected);
  });
});

describe('withReturnTo', () => {
  it('keeps the other query parameters and the fragment', () => {
    expect(withReturnTo('/case/1/make-a-claim/ground-reason?ground=GROUND_1#groundReason', 'tenancy-cya')).toBe(
      '/case/1/make-a-claim/ground-reason?ground=GROUND_1&returnTo=tenancy-cya#groundReason'
    );
  });

  it('replaces a returnTo already on the link', () => {
    expect(withReturnTo('/a/b?returnTo=claimant-cya', 'check-your-answers')).toBe('/a/b?returnTo=check-your-answers');
  });
});

describe('stepNameOfUrl', () => {
  it('is the last path segment', () => {
    expect(stepNameOfUrl('/case/1/make-a-claim/defendant-cya?returnTo=x')).toBe('defendant-cya');
  });
});
