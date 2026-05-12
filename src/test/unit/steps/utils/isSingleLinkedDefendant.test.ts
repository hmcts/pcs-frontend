import { Request } from 'express';

import { isSingleLinkedDefendant } from '../../../../main/steps/utils/isSingleLinkedDefendant';

import { CcdCaseModel } from '@services/ccdCaseData.model';

describe('isSingleLinkedDefendant', () => {
  it('should return true when all defendants equals 1', async () => {
    const mockReq = {
      res: {
        locals: {
          validatedCase: new CcdCaseModel({
            id: '',
            data: {
              allLinkedDefendants: [
                {
                  id: '',
                  value: {},
                },
              ],
            },
          }),
        },
      },
    } as unknown as Request;

    const result = await isSingleLinkedDefendant(mockReq);

    expect(result).toBe(true);
  });

  it('should return false when all defendants greater than 1', async () => {
    const mockReq = {
      res: {
        locals: {
          validatedCase: new CcdCaseModel({
            id: '',
            data: {
              allLinkedDefendants: [
                {
                  id: '',
                  value: {},
                },
                {
                  id: '',
                  value: {},
                },
              ],
            },
          }),
        },
      },
    } as unknown as Request;

    const result = await isSingleLinkedDefendant(mockReq);

    expect(result).toBe(false);
  });
});
