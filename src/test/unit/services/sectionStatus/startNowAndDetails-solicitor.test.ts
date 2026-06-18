jest.mock('../../../../main/modules/steps/i18n', () => ({
  loadStepNamespace: jest.fn(),
  getStepTranslations: jest.fn(() => ({})),
  getTranslationFunction: jest.fn(() => (key: string) => key),
}));

jest.mock('../../../../main/modules/steps/flow', () => ({
  stepNavigation: { getBackUrl: jest.fn(async () => null), getNextStepUrl: jest.fn(async () => '/next') },
  createStepNavigation: jest.fn(() => ({
    getBackUrl: jest.fn(async () => null),
    getNextStepUrl: jest.fn(async () => '/next'),
  })),
}));

jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  buildDraftDefendantResponse: jest.fn(),
  saveDraftDefendantResponse: jest.fn(),
}));

import type { Request } from 'express';

import { getSectionStatus } from '../../../../main/services/sectionStatus';
import { step as freeLegalAdvice } from '../../../../main/steps/respond-to-claim/free-legal-advice';
import { sectionIdToBackendEnum } from '../../../../main/steps/respond-to-claim/sections.config';
import { step as solicitor } from '../../../../main/steps/respond-to-claim/solicitor';

import type { JourneyFlowConfig, SectionConfig } from '@modules/steps/stepFlow.interface';
import { CcdCaseModel } from '@services/ccdCaseData.model';

// Real startNowAndDetails shape: includes the CYA step so the section is CYA-gated.
const section: SectionConfig = {
  id: 'startNowAndDetails',
  titleKey: 'taskList.startNowAndDetails',
  steps: [
    'start-now',
    'free-legal-advice',
    'solicitor',
    'ask-your-solicitor-to-respond-to-the-claim',
    'check-your-answers-start-now-and-details',
  ],
};

const registry = { 'free-legal-advice': freeLegalAdvice, solicitor };
const flow: JourneyFlowConfig = { sections: [section], steps: {} };

const reqWith = (defendantResponses: Record<string, unknown>): Request =>
  ({
    res: {
      locals: {
        validatedCase: new CcdCaseModel({ id: '1', data: { possessionClaimResponse: { defendantResponses } } }),
      },
    },
  }) as unknown as Request;

const statusFor = (dr: Record<string, unknown>) => getSectionStatus(section, flow, registry, reqWith(dr), new Map());

describe('startNowAndDetails status reacts to the solicitor answer', () => {
  it('is AVAILABLE when nothing is answered', async () => {
    expect(await statusFor({})).toBe('AVAILABLE');
  });

  it('moves to IN_PROGRESS when ONLY the solicitor question is answered', async () => {
    // The point of the fix: hasSolicitor now counts towards the tile.
    expect(await statusFor({ hasSolicitor: 'NO' })).toBe('IN_PROGRESS');
  });

  it('stays IN_PROGRESS when all question steps answered but CYA not confirmed', async () => {
    expect(await statusFor({ freeLegalAdvice: 'YES', hasSolicitor: 'YES' })).toBe('IN_PROGRESS');
  });

  it('is DONE once the section CYA is confirmed (completedSections)', async () => {
    const enumValue = sectionIdToBackendEnum('startNowAndDetails');
    expect(await statusFor({ freeLegalAdvice: 'YES', hasSolicitor: 'YES', completedSections: [enumValue] })).toBe(
      'DONE'
    );
  });
});
