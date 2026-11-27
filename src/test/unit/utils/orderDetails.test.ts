import { ORDER_DOES, orderDetailsRequest, orderDetailsRows, validateOrderDetails } from '@utils/orderDetails';

const OUTRIGHT_BY = {
  'order-does': 'outright',
  'outright-possession': 'by',
  'outright-date-day': '4',
  'outright-date-month': '12',
  'outright-date-year': '2026',
  'outright-grounds': 'mandatory',
  'outright-transfer': 'no',
};

describe('orderDetails: the time possession is ordered by in a free-form order', () => {
  it('records the time the order states, with no default', () => {
    expect(orderDetailsRequest(OUTRIGHT_BY).possessionTime).toBeUndefined();
    expect(orderDetailsRequest({ ...OUTRIGHT_BY, 'outright-time': '4pm' })).toEqual(
      expect.objectContaining({ possessionDate: '2026-12-04', possessionTime: '16:00' })
    );
    expect(
      orderDetailsRequest({
        'order-does': 'suspended',
        'suspended-date-day': '1',
        'suspended-date-month': '2',
        'suspended-date-year': '2027',
        'suspended-time': '10:30',
      })
    ).toEqual(expect.objectContaining({ possessionDate: '2027-02-01', possessionTime: '10:30' }));
  });

  it('records no time for possession forthwith', () => {
    expect(
      orderDetailsRequest({ ...OUTRIGHT_BY, 'outright-possession': 'forthwith', 'outright-time': '16:00' })
        .possessionTime
    ).toBeUndefined();
  });

  it('refuses a time that is not one, and accepts a blank one', () => {
    expect(validateOrderDetails(OUTRIGHT_BY)).toEqual([]);
    expect(validateOrderDetails({ ...OUTRIGHT_BY, 'outright-time': '25:00' })).toEqual([
      { id: 'outright-time', message: 'Enter a valid time possession is ordered by, like 16:00' },
    ]);
  });

  it('shows the time with the date on the check answers', () => {
    expect(orderDetailsRows({ ...OUTRIGHT_BY, 'outright-time': '16:00' })).toContainEqual([
      'Possession',
      'On or before 4pm on 4 December 2026',
    ]);
  });
});

describe('orderDetails: what court staff record a free-form order does', () => {
  const SUSPENDED = {
    'order-does': 'suspended',
    'suspended-date-day': '1',
    'suspended-date-month': '2',
    'suspended-date-year': '2027',
  };

  it('calls an order none of the others describes a general order', () => {
    expect(ORDER_DOES.find(option => option.value === 'other')?.text).toBe('General order');
    expect(orderDetailsRows({ 'order-does': 'other' })).toEqual([['What does the order do?', 'General order']]);
  });

  it('asks only when possession is ordered by for suspended possession', () => {
    expect(validateOrderDetails(SUSPENDED)).toEqual([]);
    expect(orderDetailsRows(SUSPENDED)).toEqual([
      ['What does the order do?', 'Suspended possession'],
      ['Possession on or before', '1 February 2027'],
    ]);
    expect(orderDetailsRequest(SUSPENDED)).toEqual({ kind: 'SUSPENDED_POSSESSION', possessionDate: '2027-02-01' });
  });
});
