jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
}));

import { step } from '../../../../main/steps/respond-to-claim/contact-preferences-text-message';

type ContactPreferencesTextMessageStep = {
  getInitialFormData: (req: {
    res?: {
      locals?: {
        validatedCase?: {
          defendantResponsesContactByText?: string;
        };
      };
    };
  }) => Record<string, unknown>;
};

describe('respond-to-claim contact-preferences-text-message step', () => {
  describe('getInitialFormData', () => {
    const testedStep = step as unknown as ContactPreferencesTextMessageStep;
    const makeReq = (contactByText?: string) => ({
      res: {
        locals: {
          validatedCase: {
            defendantResponsesContactByText: contactByText,
          },
        },
      },
    });

    it.each([
      ['YES', 'yes'],
      ['NO', 'no'],
    ])('returns contactByTextMessage=%s when CCD has %s', (ccdValue, formValue) => {
      const result = testedStep.getInitialFormData(makeReq(ccdValue));
      expect(result).toEqual({ contactByTextMessage: formValue });
    });

    it('returns empty object when CCD has no contactByText', () => {
      const result = testedStep.getInitialFormData(makeReq(undefined));
      expect(result).toEqual({});
    });
  });
});
