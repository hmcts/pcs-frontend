import {
  SectionConfigError,
  validateSectionConfig,
} from '../../../../main/services/sectionStatus/validateSectionConfig';

import type { JourneyFlowConfig, SectionConfig } from '@modules/steps/stepFlow.interface';

const section = (id: string, dependsOn?: string[]): SectionConfig => ({
  id,
  titleKey: id,
  steps: [],
  ...(dependsOn ? { dependsOn } : {}),
});

const flow = (sections?: SectionConfig[]): JourneyFlowConfig => ({
  journeyName: 'testJourney',
  steps: {},
  ...(sections ? { sections } : {}),
});

describe('validateSectionConfig', () => {
  it('is a no-op for flows without sections (legalrep shape)', () => {
    expect(() => validateSectionConfig(flow())).not.toThrow();
  });

  it('accepts a valid sections config', () => {
    const config = flow([section('a'), section('b'), section('c', ['a', 'b'])]);
    expect(() => validateSectionConfig(config)).not.toThrow();
  });

  it('throws on duplicate section ids', () => {
    const config = flow([section('a'), section('b'), section('a')]);
    expect(() => validateSectionConfig(config)).toThrow(SectionConfigError);
    expect(() => validateSectionConfig(config)).toThrow(/duplicate section id 'a'/);
  });

  it('throws on dependsOn referencing an unknown section id', () => {
    const config = flow([section('a'), section('b', ['nonExistent'])]);
    expect(() => validateSectionConfig(config)).toThrow(SectionConfigError);
    expect(() => validateSectionConfig(config)).toThrow(/section 'b' depends on unknown section 'nonExistent'/);
  });

  it('throws on self-reference', () => {
    const config = flow([section('a', ['a'])]);
    expect(() => validateSectionConfig(config)).toThrow(SectionConfigError);
    expect(() => validateSectionConfig(config)).toThrow(/section 'a' depends on itself/);
  });

  it('throws on a 2-node cycle (A → B → A)', () => {
    const config = flow([section('a', ['b']), section('b', ['a'])]);
    expect(() => validateSectionConfig(config)).toThrow(SectionConfigError);
    expect(() => validateSectionConfig(config)).toThrow(/cyclic dependency/);
  });

  it('throws on a 3-node cycle (A → B → C → A)', () => {
    const config = flow([section('a', ['b']), section('b', ['c']), section('c', ['a'])]);
    expect(() => validateSectionConfig(config)).toThrow(/cyclic dependency/);
  });

  it('error includes the journey name for diagnostics', () => {
    const config = flow([section('a'), section('a')]);
    expect(() => validateSectionConfig(config)).toThrow(/Journey 'testJourney'/);
  });

  it('accepts a complex acyclic graph (the respond-to-claim shape)', () => {
    const config = flow([
      section('startNowAndDetails'),
      section('personalDetails'),
      section('disputeAndTenancy'),
      section('payments'),
      section('situationAndCircumstances'),
      section('incomeAndExpenditure'),
      section('uploadFiles'),
      section('checkYourAnswersAndSubmit', [
        'startNowAndDetails',
        'personalDetails',
        'disputeAndTenancy',
        'payments',
        'situationAndCircumstances',
        'incomeAndExpenditure',
        'uploadFiles',
      ]),
    ]);
    expect(() => validateSectionConfig(config)).not.toThrow();
  });
});
