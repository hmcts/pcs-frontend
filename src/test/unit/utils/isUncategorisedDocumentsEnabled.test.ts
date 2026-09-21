import type { Request } from 'express';

jest.mock('@utils/getLaunchDarklyFlag', () => ({
  getLaunchDarklyFlag: jest.fn(),
}));

import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';
import { isUncategorisedDocumentsEnabled } from '@utils/isUncategorisedDocumentsEnabled';
import { ENABLE_UNCATEGORISED_DOCUMENTS, RELEASE_1_2_ENABLED } from '@utils/respondToClaimFlags';

const mockGetLaunchDarklyFlag = getLaunchDarklyFlag as jest.MockedFunction<typeof getLaunchDarklyFlag>;

const makeReq = (): Request => ({ session: { user: { uid: 'user-1' } } }) as unknown as Request;

describe('isUncategorisedDocumentsEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('evaluates both the release flag and the journey flag', async () => {
    mockGetLaunchDarklyFlag.mockResolvedValue(true);

    const req = makeReq();
    const result = await isUncategorisedDocumentsEnabled(req);

    expect(result).toBe(true);
    expect(mockGetLaunchDarklyFlag).toHaveBeenCalledWith(req, RELEASE_1_2_ENABLED, false);
    expect(mockGetLaunchDarklyFlag).toHaveBeenCalledWith(req, ENABLE_UNCATEGORISED_DOCUMENTS, false);
  });

  it('is disabled when the release flag is off', async () => {
    mockGetLaunchDarklyFlag.mockImplementation(async (_req, flagName) => flagName === ENABLE_UNCATEGORISED_DOCUMENTS);

    const result = await isUncategorisedDocumentsEnabled(makeReq());

    expect(result).toBe(false);
  });

  it('is disabled when the journey flag is off', async () => {
    mockGetLaunchDarklyFlag.mockImplementation(async (_req, flagName) => flagName === RELEASE_1_2_ENABLED);

    const result = await isUncategorisedDocumentsEnabled(makeReq());

    expect(result).toBe(false);
  });

  it('is disabled when both flags are off', async () => {
    mockGetLaunchDarklyFlag.mockResolvedValue(false);

    const result = await isUncategorisedDocumentsEnabled(makeReq());

    expect(result).toBe(false);
  });
});
