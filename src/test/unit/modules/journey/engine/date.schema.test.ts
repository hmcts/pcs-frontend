/* eslint-disable jest/no-conditional-expect */

import { DateTime } from 'luxon';

import { buildDateInputSchema } from '../../../../../main/modules/journey/engine/date.schema';

describe('buildDateInputSchema – unit', () => {
  it('flags missing parts when required', () => {
    const schema = buildDateInputSchema(
      {
        type: 'date',
        label: { text: 'Date of birth' },
      } as any,
      {
        required: true,
        messages: {
          missingParts: (missing: string[]) => `Need ${missing.join(',')}`,
        },
      }
    );
    const res = schema.safeParse({ day: '', month: '', year: '' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues).toHaveLength(1);
    }
  });

  it('validates numeric parts', () => {
    const schema = buildDateInputSchema({
      type: 'date',
      label: { text: 'DOB' },
    } as any);
    const res = schema.safeParse({ day: 'aa', month: 'bb', year: 'cccc' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const codes = res.error.issues.map((i: any) => i.path[0]);
      expect(codes).toEqual(['day', 'month', 'year']);
    }
  });

  it('accepts a real date', () => {
    const schema = buildDateInputSchema({
      type: 'date',
      label: { text: 'DOB' },
    } as any);
    const res = schema.safeParse({ day: '15', month: '06', year: '2000' });
    expect(res.success).toBe(true);
  });

  it('enforces mustBePast', () => {
    const schema = buildDateInputSchema(
      {
        type: 'date',
        label: { text: 'DOB' },
      } as any,
      { mustBePast: true }
    );
    const future = DateTime.now().plus({ days: 1 });
    const res = schema.safeParse({
      day: future.toFormat('dd'),
      month: future.toFormat('MM'),
      year: future.toFormat('yyyy'),
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i: any) => i.message.includes('past'))).toBe(true);
    }
  });

  it('enforces mustBeBetween range', () => {
    const start = DateTime.fromISO('2024-01-01');
    const end = DateTime.fromISO('2024-12-31');
    const schema = buildDateInputSchema(
      {
        type: 'date',
        label: { text: 'Period' },
      } as any,
      { mustBeBetween: { start, end } }
    );
    const outside = DateTime.fromISO('2023-12-31');
    const res = schema.safeParse({
      day: outside.toFormat('dd'),
      month: outside.toFormat('MM'),
      year: outside.toFormat('yyyy'),
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain('between');
    }
  });
});
