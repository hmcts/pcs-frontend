import type { CuiRaFlags } from '../../../../main/services/cuiRa/cuiRa.interface';
import { toCcdFlags } from '../../../../main/services/cuiRa/flagMapping';

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
