import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { buildLanguageUsedRows } from '../../../../main/steps/respond-to-claim/end-of-journey-cya/buildLanguageUsedRows';

const t = ((key: string) => key) as TFunction;

const buildReq = (welshEnabled: boolean, languageUsed?: string) =>
  ({
    res: {
      locals: {
        welshEnabled,
        validatedCase: { id: '1234567812345678', defendantResponses: languageUsed ? { languageUsed } : {} },
      },
    },
  }) as unknown as Request;

describe('end-of-journey CYA language used row', () => {
  it('lets the user change their answer when the question is switched on', () => {
    const [row] = buildLanguageUsedRows(buildReq(true, 'WELSH'), t);

    expect(row.value.text).toBe('rows.languageUsed.options.WELSH');
    expect(row.actions?.items[0].href).toContain('language-used');
  });

  it('shows an earlier answer without a Change link when the question is switched off', () => {
    const [row] = buildLanguageUsedRows(buildReq(false, 'WELSH'), t);

    expect(row.value.text).toBe('rows.languageUsed.options.WELSH');
    expect(row.actions).toBeUndefined();
  });

  it('leaves the row out when the question is switched off and was never answered', () => {
    expect(buildLanguageUsedRows(buildReq(false), t)).toEqual([]);
  });
});
