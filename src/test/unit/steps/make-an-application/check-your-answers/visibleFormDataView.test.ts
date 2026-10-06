import type { Request } from 'express';

import VisibleFormDataView from '../../../../../main/steps/make-an-application/check-your-answers/visibleFormDataView';

const LANGUAGE_STEP = 'which-language-did-you-use-to-complete-this-service';

const buildReq = (welshLanguageUsedEnabled: boolean, whichLanguage?: string) =>
  ({
    params: { caseReference: '1234567812345678' },
    session: {
      formData: {
        makeAnApplication: {
          '1234567812345678': whichLanguage ? { [LANGUAGE_STEP]: { whichLanguage } } : {},
        },
      },
    },
    res: {
      locals: {
        welshLanguageUsedEnabled,
        step: { journey: 'makeAnApplication' },
        validatedCase: { id: '1234567812345678' },
      },
    },
  }) as unknown as Request;

describe('VisibleFormDataView language used', () => {
  it.each(['ENGLISH', 'WELSH', 'ENGLISH_AND_WELSH'])(
    'uses the answer %s when welsh-language-used-enabled is on',
    whichLanguage => {
      const view = new VisibleFormDataView(buildReq(true, whichLanguage));

      expect(view.getWhichLanguageField()).toEqual({ stepName: LANGUAGE_STEP, fieldValue: whichLanguage });
      expect(view.getLanguageUsed()).toBe(whichLanguage);
    }
  );

  it('hides the language answer and records English when welsh-language-used-enabled is off', () => {
    const view = new VisibleFormDataView(buildReq(false, 'WELSH'));

    expect(view.getWhichLanguageField()).toBeUndefined();
    expect(view.getLanguageUsed()).toBe('ENGLISH');
  });
});
