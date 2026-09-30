import express from 'express';
import { z } from 'zod';

import { I18n } from '@modules/i18n';

/**
 * i18n boot used to register a zod-i18n-map error map globally. That package
 * targets Zod 3 and reaches for a `defaultErrorMap` export Zod 4 removed, so
 * registering it made every subsequent validation error throw rather than
 * report. The step-config validations all run at import, before the map is
 * installed, and all pass, so the map was never invoked and this went unnoticed.
 */
describe('i18n boot', () => {
  it('leaves Zod able to report validation errors', () => {
    new I18n().enableFor(express());

    const result = z.string().safeParse(123);

    expect(result.success).toBe(false);
    expect(typeof result.error?.issues[0].message).toBe('string');
  });
});
