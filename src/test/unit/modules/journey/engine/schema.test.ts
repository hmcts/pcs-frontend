const loggerMock = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };

jest.mock('@modules/logger', () => ({
  Logger: { getLogger: jest.fn(() => loggerMock) },
}));

jest.mock('@launchdarkly/node-server-sdk', () => ({ init: () => ({ variation: jest.fn() }) }));

import {
  type FieldConfig,
  JourneySchema,
  createFieldValidationSchema,
} from '../../../../../main/modules/journey/engine/schema';

describe('createFieldValidationSchema - branch coverage', () => {
  const mustFail = (fieldCfg: FieldConfig, value: unknown) => {
    expect(createFieldValidationSchema(fieldCfg).safeParse(value).success).toBe(false);
  };
  const mustPass = (fieldCfg: FieldConfig, value: unknown) => {
    const result = createFieldValidationSchema(fieldCfg).safeParse(value);
    expect(result.success).toBe(true);
    return result.data;
  };
  it('validates number min/max', () => {
    const cfg: FieldConfig = { type: 'number', validate: { min: 10, max: 20 } } as FieldConfig;
    mustFail(cfg, 5);
    expect(mustPass(cfg, 15)).toBe(15);
  });
  it('validates email pattern', () => {
    const cfg: FieldConfig = { type: 'email', validate: { required: true } } as FieldConfig;
    mustFail(cfg, 'bad');
    expect(mustPass(cfg, 'user@example.com')).toBe('user@example.com');
  });
  it('validates URL', () => {
    const cfg: FieldConfig = { type: 'url' } as FieldConfig;
    mustFail(cfg, 'notaurl');
    expect(mustPass(cfg, 'https://ex.com')).toBe('https://ex.com');
  });
  it('validates postcode', () => {
    const cfg: FieldConfig = { type: 'text', validate: { postcode: true } } as FieldConfig;
    mustFail(cfg, '123');
    expect(mustPass(cfg, 'SW1A 1AA')).toBe('SW1A 1AA');
  });
  it('validates checkbox selection', () => {
    const cfg: FieldConfig = { type: 'checkboxes', validate: { required: true }, items: ['A', 'B'] } as FieldConfig;
    mustFail(cfg, []);
    expect(mustPass(cfg, ['A'])).toEqual(['A']);
  });
  it('validates select options', () => {
    const cfg: FieldConfig = { type: 'select', items: ['One', 'Two'] } as FieldConfig;
    mustFail(cfg, 'Three');
    expect(mustPass(cfg, 'One')).toBe('One');
  });
});

describe('JourneySchema circular detection', () => {
  it('rejects circular journey', () => {
    const bad = {
      meta: { name: 'Bad', description: 'Circ' },
      steps: {
        a: { id: 'a', type: 'form', next: 'b', fields: { f: { type: 'text' } } },
        b: { id: 'b', type: 'form', next: 'a', fields: { f: { type: 'text' } } },
      },
    } as unknown;
    const res = JourneySchema.safeParse(bad);
    expect(res.success).toBe(false);
    if (!res.success) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(res.error.issues[0].message).toMatch(/circular/);
    }
  });
  it('accepts minimal valid journey', () => {
    const good = {
      meta: { name: 'Good', description: 'Ok' },
      steps: { start: { id: 'start', type: 'form', fields: { f: { type: 'text' } } } },
    } as unknown;
    expect(JourneySchema.safeParse(good).success).toBe(true);
  });
});
