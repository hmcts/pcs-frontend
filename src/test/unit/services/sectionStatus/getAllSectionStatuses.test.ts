import type { Request } from 'express';

import { getAllSectionStatuses } from '../../../../main/services/sectionStatus/getAllSectionStatuses';

import type { JourneyFlowConfig, SectionConfig } from '@modules/steps/stepFlow.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const reqStub = {} as Request;

const stub = (overrides: Partial<StepDefinition> = {}): StepDefinition =>
  ({
    url: '/',
    name: 'stub',
    view: 'stub.njk',
    stepDir: '/stub',
    getController: () => (() => undefined) as never,
    isAnswered: () => false,
    ...overrides,
  }) as StepDefinition;

const section = (overrides: Partial<SectionConfig>): SectionConfig => ({
  id: overrides.id ?? 's',
  titleKey: 't',
  steps: [],
  ...overrides,
});

describe('getAllSectionStatuses', () => {
  it('throws when called on a non-sectionalised flow', async () => {
    const flow: JourneyFlowConfig = { steps: {} };
    await expect(getAllSectionStatuses(flow, {}, reqStub)).rejects.toThrow(/no sections/);
  });

  it('resolves dependsOn in topological order (DONE deps unlock their dependents)', async () => {
    const flow: JourneyFlowConfig = {
      steps: {},
      sections: [
        section({ id: 'final', dependsOn: ['a', 'b'], steps: ['x'] }),
        section({ id: 'a', steps: ['x'] }),
        section({ id: 'b', steps: ['x'] }),
      ],
    };
    const registry = { x: stub({ isAnswered: () => true }) };
    const statuses = await getAllSectionStatuses(flow, registry, reqStub);
    expect(statuses.get('a')).toBe('DONE');
    expect(statuses.get('b')).toBe('DONE');
    expect(statuses.get('final')).toBe('DONE');
  });

  it('marks dependent NOT_AVAILABLE_YET when a dependency is still IN_PROGRESS', async () => {
    const flow: JourneyFlowConfig = {
      steps: {},
      sections: [section({ id: 'final', dependsOn: ['a'], steps: ['x'] }), section({ id: 'a', steps: ['x', 'y'] })],
    };
    const registry = {
      x: stub({ isAnswered: () => true }),
      y: stub({ isAnswered: () => false }),
    };
    const statuses = await getAllSectionStatuses(flow, registry, reqStub);
    expect(statuses.get('a')).toBe('IN_PROGRESS');
    expect(statuses.get('final')).toBe('NOT_AVAILABLE_YET');
  });

  it('treats NOT_APPLICABLE dependencies as satisfied', async () => {
    const flow: JourneyFlowConfig = {
      steps: {},
      sections: [
        section({ id: 'final', dependsOn: ['a', 'b'], steps: ['x'] }),
        section({ id: 'a', steps: ['x'], isApplicable: async () => false }),
        section({ id: 'b', steps: ['x'] }),
      ],
    };
    const registry = { x: stub({ isAnswered: () => true }) };
    const statuses = await getAllSectionStatuses(flow, registry, reqStub);
    expect(statuses.get('a')).toBe('NOT_APPLICABLE');
    expect(statuses.get('b')).toBe('DONE');
    // 'a' is NOT_APPLICABLE → treated as satisfied → 'final' depends only on 'b' which is DONE.
    expect(statuses.get('final')).toBe('DONE');
  });

  it('returns a status for every declared section', async () => {
    const flow: JourneyFlowConfig = {
      steps: {},
      sections: [section({ id: 'a', steps: ['x'] }), section({ id: 'b', steps: ['x'] })],
    };
    const registry = { x: stub() };
    const statuses = await getAllSectionStatuses(flow, registry, reqStub);
    expect(statuses.size).toBe(2);
    expect(statuses.has('a')).toBe(true);
    expect(statuses.has('b')).toBe(true);
  });

  it('preserves declaration order when no dependsOn pressure exists', async () => {
    const flow: JourneyFlowConfig = {
      steps: {},
      sections: [
        section({ id: 'first', steps: ['x'] }),
        section({ id: 'second', steps: ['x'] }),
        section({ id: 'third', steps: ['x'] }),
      ],
    };
    const registry = { x: stub() };
    const statuses = await getAllSectionStatuses(flow, registry, reqStub);
    expect(Array.from(statuses.keys())).toEqual(['first', 'second', 'third']);
  });
});
