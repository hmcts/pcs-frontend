import type { CcdFlags, CuiRaFlags } from '../../../../main/services/cuiRa/cuiRa.interface';
import { toCcdFlags, toCuiRaFlags } from '../../../../main/services/cuiRa/flagMapping';

describe('toCcdFlags', () => {
  it('remaps each path item from { name } to { value } (CCD ListValue<String>) and keeps the id', () => {
    const flags = {
      partyName: 'John Doe',
      roleOnCase: 'Defendant',
      details: [
        {
          id: 'd1',
          value: {
            name: 'Language interpreter',
            flagCode: 'RA0042',
            status: 'Active',
            path: [{ id: 'p1', name: 'Reasonable adjustment' }, { name: 'Support with the case' }],
          },
        },
      ],
    } as unknown as CuiRaFlags;

    expect(toCcdFlags(flags)).toEqual({
      partyName: 'John Doe',
      roleOnCase: 'Defendant',
      details: [
        {
          id: 'd1',
          value: {
            name: 'Language interpreter',
            flagCode: 'RA0042',
            status: 'Active',
            path: [
              { id: 'p1', value: 'Reasonable adjustment' },
              { id: undefined, value: 'Support with the case' },
            ],
          },
        },
      ],
    });
  });

  it('carries all other flag-detail fields through unchanged', () => {
    const flags = {
      partyName: 'Jane',
      roleOnCase: 'Defendant',
      details: [
        {
          id: 'x',
          value: {
            name: 'Step free access',
            name_cy: 'Mynediad',
            subTypeValue: 'wheelchair',
            hearingRelevant: 'Yes',
            flagCode: 'RA0001',
            path: [],
          },
        },
      ],
    } as unknown as CuiRaFlags;

    const result = toCcdFlags(flags);
    expect(result.details[0].value).toMatchObject({
      name: 'Step free access',
      name_cy: 'Mynediad',
      subTypeValue: 'wheelchair',
      hearingRelevant: 'Yes',
      flagCode: 'RA0001',
      path: [],
    });
  });

  it('tolerates missing details / path collections', () => {
    expect(toCcdFlags({ partyName: 'A', roleOnCase: 'Defendant' } as unknown as CuiRaFlags)).toEqual({
      partyName: 'A',
      roleOnCase: 'Defendant',
      details: [],
    });
  });
});

describe('toCuiRaFlags', () => {
  it('remaps each path item from { value } back to { name } (cui-ra shape) and keeps the id', () => {
    const flags = {
      partyName: 'John Doe',
      roleOnCase: 'Defendant',
      details: [
        {
          id: 'd1',
          value: {
            name: 'Language interpreter',
            flagCode: 'RA0042',
            path: [{ id: 'p1', value: 'Reasonable adjustment' }, { value: 'Support with the case' }],
          },
        },
      ],
    } as unknown as CcdFlags;

    expect(toCuiRaFlags(flags)).toEqual({
      partyName: 'John Doe',
      roleOnCase: 'Defendant',
      details: [
        {
          id: 'd1',
          value: {
            name: 'Language interpreter',
            flagCode: 'RA0042',
            path: [
              { id: 'p1', name: 'Reasonable adjustment' },
              { id: undefined, name: 'Support with the case' },
            ],
          },
        },
      ],
    });
  });

  it('round-trips cui-ra -> ccd -> cui-ra without loss', () => {
    const original = {
      partyName: 'Jane',
      roleOnCase: 'Defendant',
      details: [{ id: 'x', value: { name: 'Step free', flagCode: 'RA0001', path: [{ id: 'p', name: 'Access' }] } }],
    } as unknown as CuiRaFlags;

    expect(toCuiRaFlags(toCcdFlags(original))).toEqual(original);
  });

  it('tolerates missing details / path collections', () => {
    expect(toCuiRaFlags({ partyName: 'A', roleOnCase: 'Defendant' } as unknown as CcdFlags)).toEqual({
      partyName: 'A',
      roleOnCase: 'Defendant',
      details: [],
    });
  });
});
