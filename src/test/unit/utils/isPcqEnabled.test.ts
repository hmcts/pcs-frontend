import type { Request } from 'express';

import { getLaunchDarklyFlag } from '../../../main/utils/getLaunchDarklyFlag';
import { isPcqEnabled } from '../../../main/utils/isPcqEnabled';

jest.mock('../../../main/utils/getLaunchDarklyFlag', () => ({
  getLaunchDarklyFlag: jest.fn(),
}));

const mockFlags = (flags: Record<string, boolean>) =>
  (getLaunchDarklyFlag as jest.Mock).mockImplementation((_req, name: string) => Promise.resolve(flags[name] ?? false));

// `getUserType` reads roles straight off the session, so build the request rather than mocking it.
const reqWithRoles = (roles: string[]) => ({ session: { user: { roles } } }) as unknown as Request;

describe('isPcqEnabled', () => {
  const req = reqWithRoles([]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads both flags, each defaulting to off', async () => {
    mockFlags({ 'release-1.3-enabled': true, 'cui-pcq-enabled': true });

    await expect(isPcqEnabled(req)).resolves.toBe(true);

    // Defaulting to false keeps the citizen on the normal journey if LaunchDarkly is unreachable.
    expect(getLaunchDarklyFlag).toHaveBeenCalledWith(req, 'release-1.3-enabled', false);
    expect(getLaunchDarklyFlag).toHaveBeenCalledWith(req, 'cui-pcq-enabled', false);
  });

  it('is off when the release flag is off, even with the feature flag on', async () => {
    mockFlags({ 'release-1.3-enabled': false, 'cui-pcq-enabled': true });

    await expect(isPcqEnabled(req)).resolves.toBe(false);
  });

  it('is off when the feature flag is off, even within an enabled release', async () => {
    // The point of the second flag: kill PCQ in one environment without pulling all of 1.3.
    mockFlags({ 'release-1.3-enabled': true, 'cui-pcq-enabled': false });

    await expect(isPcqEnabled(req)).resolves.toBe(false);
  });

  it('is off when both flags are off', async () => {
    mockFlags({});

    await expect(isPcqEnabled(req)).resolves.toBe(false);
  });

  it('is off for a legal representative even with both flags on', async () => {
    // PCQ asks about the answering user's own characteristics, so a solicitor must never be
    // sent — their answers would be filed against the defendant's party id.
    mockFlags({ 'release-1.3-enabled': true, 'cui-pcq-enabled': true });

    await expect(isPcqEnabled(reqWithRoles(['caseworker-pcs-solicitor']))).resolves.toBe(false);
  });

  it('short-circuits for a legal representative without reading the flags', async () => {
    mockFlags({ 'release-1.3-enabled': true, 'cui-pcq-enabled': true });

    await isPcqEnabled(reqWithRoles(['caseworker-pcs-solicitor']));

    expect(getLaunchDarklyFlag).not.toHaveBeenCalled();
  });

  it('still sends a citizen who holds other roles', async () => {
    // Only the solicitor role gates PCQ; an unrelated role must not block the questionnaire.
    mockFlags({ 'release-1.3-enabled': true, 'cui-pcq-enabled': true });

    await expect(isPcqEnabled(reqWithRoles(['citizen']))).resolves.toBe(true);
  });

  it('treats a missing session as a citizen', async () => {
    mockFlags({ 'release-1.3-enabled': true, 'cui-pcq-enabled': true });

    await expect(isPcqEnabled({} as Request)).resolves.toBe(true);
  });
});
