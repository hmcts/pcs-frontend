import { Request } from 'express';

import { CcdCaseModel } from '@services/ccdCaseData.model';
import { isSingleLinkedDefendant } from '../../../../main/steps/utils/isSingleLinkedDefendant';

describe('isSingleLinkedDefendant', () => {
    it('should return true when all defendants equals 1', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: new CcdCaseModel({
              id: '',
              data: {
                allDefendants: [{
                  id: "",
                  value: {}
                }],
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
                allDefendants: [{
                  id: "",
                  value: {}
                },
                {
                  id: "",
                  value: {}
                }],
              },
            }),
          },
        },
      } as unknown as Request;

      const result = await isSingleLinkedDefendant(mockReq);

      expect(result).toBe(false);
    });

});
