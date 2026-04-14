jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
}));

import { step } from '../../../../main/steps/respond-to-claim/contact-preferences-telephone';

type ContactPreferencesTelephoneStep = {
  getInitialFormData: (req: {
    res?: {
      locals?: {
        validatedCase?: {
          defendantResponsesContactByPhone?: string;
          defendantContactDetailsPartyPhoneNumber?: string;
        };
      };
    };
  }) => Record<string, unknown>;
};

describe('respond-to-claim contact-preferences-telephone step', () => {
  describe('getInitialFormData', () => {
    const testedStep = step as unknown as ContactPreferencesTelephoneStep;
    const makeReq = (contactByPhone?: string, phoneNumber?: string) => ({
      res: {
        locals: {
          validatedCase: {
            defendantResponsesContactByPhone: contactByPhone,
            defendantContactDetailsPartyPhoneNumber: phoneNumber,
          },
        },
      },
    });

    it.each([
      ['YES', 'yes'],
      ['NO', 'no'],
    ])('returns contactByTelephone=%s when CCD contactByPhone has %s', (ccdValue, formValue) => {
      const result = testedStep.getInitialFormData(makeReq(ccdValue));
      expect(result).toMatchObject({ contactByTelephone: formValue });
    });

    it('returns empty when CCD has phoneNumber but contactByPhone is undefined', () => {
      const result = testedStep.getInitialFormData(makeReq(undefined, '01234567890'));
      expect(result).toEqual({});
    });

    it('returns both contactByTelephone and phoneNumber when CCD has both', () => {
      const result = testedStep.getInitialFormData(makeReq('YES', '01234567890'));
      expect(result).toEqual({
        contactByTelephone: 'yes',
        'contactByTelephone.phoneNumber': '01234567890',
      });
    });

    it('returns empty object when CCD has neither contactByPhone nor phoneNumber', () => {
      const result = testedStep.getInitialFormData(makeReq(undefined, undefined));
      expect(result).toEqual({});
    });
  });
});
