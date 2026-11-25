import { applicationDecisions, claimOutcome } from '@utils/orderOutcome';

describe('orderOutcome', () => {
  it('names what the order decides about each application, leaving out those it does not deal with', () => {
    expect(
      applicationDecisions({
        'app-a-decision': 'grant',
        'app-b-decision': 'none',
        'app-c-decision': 'strike-out',
        'app-d-decision': 'list',
        'app-e-decision': 'other',
        'app-f-decision': 'dismiss',
        'outright-possession': 'forthwith',
      })
    ).toEqual([
      { genAppId: 'a', decision: 'GRANT' },
      { genAppId: 'c', decision: 'STRIKE_OUT' },
      { genAppId: 'd', decision: 'LIST' },
      { genAppId: 'e', decision: 'OTHER' },
      { genAppId: 'f', decision: 'DISMISS' },
    ]);
  });

  it('says what an outright possession order decides, from the judge answers', () => {
    expect(
      claimOutcome('OUTRIGHT_POSSESSION', {
        'outright-possession': 'by',
        'outright-by-date-day': '9',
        'outright-by-date-month': '12',
        'outright-by-date-year': '2026',
        'outright-grounds-type': 'discretionary',
        'outright-grounds-details': 'Ground 10',
        'outright-options': ['money-judgment', 'transfer-high-court'],
      })
    ).toEqual({
      kind: 'OUTRIGHT_POSSESSION',
      possessionForthwith: false,
      possessionDate: '2026-12-09',
      grounds: 'DISCRETIONARY',
      groundsDetails: 'Ground 10',
    });
    expect(claimOutcome('OUTRIGHT_POSSESSION', { 'outright-possession': 'forthwith' })).toEqual(
      expect.objectContaining({ possessionForthwith: true, possessionDate: undefined })
    );
  });

  it('says what a suspended possession order decides', () => {
    expect(
      claimOutcome('SUSPENDED_POSSESSION', {
        'suspended-by-date-day': '1',
        'suspended-by-date-month': '2',
        'suspended-by-date-year': '2027',
        'suspended-options': 'warrant-on-notice',
      })
    ).toEqual({
      kind: 'SUSPENDED_POSSESSION',
      possessionDate: '2027-02-01',
      warrantOnNotice: true,
    });
  });

  it.each([
    // An adjournment manages the case without deciding the claim.
    ['ADJOURNMENT', { 'adj-type': 'generally' }, { kind: 'NO_ORDER' }],
    [
      'STRIKE_OUT_DISMISSAL',
      { 'strike-subjects': 'claim', 'strike-claim-outcome': 'struck-out' },
      { kind: 'STRUCK_OUT' },
    ],
    [
      'STRIKE_OUT_DISMISSAL',
      { 'strike-subjects': ['claim', 'counterclaim'], 'strike-claim-outcome': 'dismissed' },
      { kind: 'DISMISSED' },
    ],
    // Striking out only the counterclaim makes no order on the claim.
    [
      'STRIKE_OUT_DISMISSAL',
      { 'strike-subjects': 'counterclaim', 'strike-counterclaim-outcome': 'dismissed' },
      { kind: 'NO_ORDER' },
    ],
    ['NO_ORDER_ON_CLAIM', {}, { kind: 'NO_ORDER' }],
  ])('says what a %s order decides about the claim', (orderType, formData, expected) => {
    expect(claimOutcome(orderType, formData)).toEqual(expected);
  });
});
