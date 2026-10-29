// Status behaviour for the "Your support" (Reasonable Adjustments) task-list row. The row is a
// section whose only step is the triage page; its tag is driven by isCuiYourSupportEnabled
// (gates the whole row) and the triage step's isAnswered predicate (Available -> Done). We drive
// getSectionStatus directly (buildGroups/buildItem in the task-list controller are module-private).
const mockIsCuiYourSupportEnabled = jest.fn();
jest.mock('@utils/isCuiYourSupportEnabled', () => ({
  isCuiYourSupportEnabled: mockIsCuiYourSupportEnabled,
}));

import type { Request } from 'express';

import { flowConfig } from '../../../main/steps/respond-to-claim/flow.config';
import { respondToClaimSections } from '../../../main/steps/respond-to-claim/sections.config';
import { stepRegistry } from '../../../main/steps/respond-to-claim/stepRegistry';

import { getFirstVisibleStep, getSectionStatus } from '@services/sectionStatus';

const yourSupport = respondToClaimSections.find(section => section.id === 'yourSupport')!;

const makeReq = (possessionClaimResponse?: unknown): Request =>
  ({ res: { locals: { validatedCase: { id: '123', data: {}, possessionClaimResponse } } } }) as unknown as Request;

describe('yourSupport section status (task-list "Your support" row)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is NOT_APPLICABLE (row filtered out of the task list) when the feature flag is off', async () => {
    mockIsCuiYourSupportEnabled.mockResolvedValue(false);

    const status = await getSectionStatus(yourSupport, flowConfig, stepRegistry, makeReq(), new Map());

    expect(status).toBe('NOT_APPLICABLE');
  });

  it('is AVAILABLE when the flag is on and no adjustments have been captured yet', async () => {
    mockIsCuiYourSupportEnabled.mockResolvedValue(true);

    const status = await getSectionStatus(yourSupport, flowConfig, stepRegistry, makeReq(), new Map());

    expect(status).toBe('AVAILABLE');
  });

  it('is DONE when the flag is on and the defendant has captured adjustments (defendantFlags present)', async () => {
    mockIsCuiYourSupportEnabled.mockResolvedValue(true);
    const req = makeReq({ defendantFlags: { details: [{ id: 'f1', value: { name: 'Language interpreter' } }] } });

    const status = await getSectionStatus(yourSupport, flowConfig, stepRegistry, req, new Map());

    expect(status).toBe('DONE');
  });

  it('links the row to the triage page (its only, always-visible step)', () => {
    expect(getFirstVisibleStep(yourSupport, flowConfig, makeReq())).toBe('reasonable-adjustments-triage');
  });
});
