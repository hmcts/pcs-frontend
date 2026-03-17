import type { AxiosInstance } from 'axios';
import Axios from 'axios';

import { createCaseApiData } from '../../ui/data/api-data';
import {
  caseInfo,
  CreateCaseAPIAction,
} from '../../ui/utils/actions/custom-actions/createCaseAPI.action';

jest.mock('axios');

describe('CreateCaseAPIAction', () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATA_STORE_URL_BASE = 'http://ccd.example.com';
    process.env.BEARER_TOKEN = 'bearer-token';
    process.env.SERVICE_AUTH_TOKEN = 'service-token';
    delete process.env.CASE_NUMBER;
    caseInfo.id = '';
    caseInfo.fid = '';
    caseInfo.state = '';

    (Axios.create as jest.Mock).mockReturnValue({
      get: mockGet,
      post: mockPost,
    } as Partial<AxiosInstance>);
  });

  it('creates a CCD case via the generated runtime client', async () => {
    mockGet.mockResolvedValue({
      data: {
        token: 'event-token',
        case_details: {
          case_data: {
            claimCreateFeeAmount: '£999999.99',
          },
        },
      },
    });
    mockPost.mockResolvedValue({
      data: {
        id: '1773696232722684',
        state: 'AWAITING_SUBMISSION_TO_HMCTS',
      },
    });

    const action = new CreateCaseAPIAction();
    await action.execute({} as never, 'createCaseAPI', createCaseApiData.createCasePayload);

    expect(mockGet).toHaveBeenCalledWith(
      'http://ccd.example.com/case-types/PCS/event-triggers/createPossessionClaim',
      expect.any(Object)
    );
    expect(mockPost).toHaveBeenCalledWith(
      'http://ccd.example.com/case-types/PCS/cases',
      expect.objectContaining({
        data: expect.objectContaining({
          claimCreateFeeAmount: '£404',
          claimCreateLegislativeCountry: 'England',
          claimCreatePropertyAddress: createCaseApiData.createCasePayload.propertyAddress,
        }),
        event: { id: 'createPossessionClaim' },
        event_token: 'event-token',
        ignore_warning: false,
      }),
      expect.any(Object)
    );
    expect(process.env.CASE_NUMBER).toBe('1773696232722684');
    expect(caseInfo.id).toBe('1773696232722684');
    expect(caseInfo.fid).toBe('1773-6962-3272-2684');
    expect(caseInfo.state).toBe('AWAITING_SUBMISSION_TO_HMCTS');
  });
});
