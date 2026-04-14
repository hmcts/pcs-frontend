import { CcdCase, CcdCaseAddress, YesNoEnum } from '../../../main/interfaces/ccdCase.interface';
import { CcdCaseModel } from '../../../main/interfaces/ccdCaseData.model';

const buildModel = (overrides: Partial<CcdCase> = {}): CcdCaseModel => {
  const baseCase: CcdCase = {
    id: '1234567890123456',
    data: {},
  };

  return new CcdCaseModel({
    ...baseCase,
    ...overrides,
    data: overrides.data ?? baseCase.data,
  } as CcdCase);
};

const address: CcdCaseAddress = {
  AddressLine1: '10 Second Avenue',
  PostTown: 'London',
  PostCode: 'W3 7RX',
};

describe('CcdCaseModel', () => {
  describe('fallback getters', () => {
    it('returns safe defaults when case data is missing', () => {
      const model = new CcdCaseModel({} as CcdCase);

      expect(model.data).toEqual({});
      expect(model.id).toBe('');
      expect(model.claimIssueDate).toBe('');
      expect(model.defendantName).toBe('');
      expect(model.defendantAddress).toBe('');
      expect(model.claimantName).toBe('');
      expect(model.claimantEnteredDefendantDetails).toEqual({});
      expect(model.defendantContactDetailsParty).toEqual({});
    });
  });

  describe('tenancy start date', () => {
    it('prefers the tenancy licence date when both start dates exist', () => {
      const model = buildModel({
        data: {
          tenancy_TenancyLicenceDate: '2024-01-10',
          licenceStartDate: '2024-02-20',
        },
      });

      expect(model.tenancyStartDate).toBe('2024-01-10');
    });

    it('falls back to the Wales licence start date', () => {
      const model = buildModel({
        data: {
          licenceStartDate: '2024-02-20',
        },
      });

      expect(model.tenancyStartDate).toBe('2024-02-20');
    });

    it('treats blank or missing start dates as absent', () => {
      const blankStartDateModel = buildModel({
        data: {
          tenancy_TenancyLicenceDate: '   ',
        },
      });
      const missingStartDateModel = buildModel();

      expect(blankStartDateModel.hasTenancyStartDate).toBe(false);
      expect(missingStartDateModel.hasTenancyStartDate).toBe(false);
    });

    it('reports when a non-empty tenancy start date exists', () => {
      const model = buildModel({
        data: {
          licenceStartDate: '2024-02-20',
        },
      });

      expect(model.hasTenancyStartDate).toBe(true);
    });
  });

  describe('claimant and defendant names', () => {
    it('uses overridden claimant name when claimant correction is NO', () => {
      const model = buildModel({
        data: {
          claimantName: 'Possession Claims Solicitor Org',
          isClaimantNameCorrect: 'NO',
          overriddenClaimantName: 'John Doe',
        },
      });

      expect(model.claimantName).toBe('John Doe');
    });

    it('falls back to top-level claimant name when present', () => {
      const model = buildModel({
        data: {
          claimantName: 'Possession Claims Solicitor Org',
        },
      });

      expect(model.claimantName).toBe('Possession Claims Solicitor Org');
    });

    it('builds the claimant-entered defendant name from first and last name', () => {
      const model = buildModel({
        data: {
          possessionClaimResponse: {
            claimantEnteredDefendantDetails: {
              firstName: 'Alex',
              lastName: 'Tenant',
            },
            defendantContactDetails: {
              party: {
                firstName: 'Jordan',
                lastName: 'Resident',
              },
            },
          },
        },
      });

      expect(model.claimantEnteredDefendantDetailsName).toBe('Alex Tenant');
      expect(model.defendantContactDetailsPartyName).toBe('Jordan Resident');
    });

    it('returns the single available name part when only one exists', () => {
      const model = buildModel({
        data: {
          possessionClaimResponse: {
            claimantEnteredDefendantDetails: {
              firstName: 'Alex',
            },
            defendantContactDetails: {
              party: {
                lastName: 'Resident',
              },
            },
          },
        },
      });

      expect(model.claimantEnteredDefendantDetailsName).toBe('Alex');
      expect(model.defendantContactDetailsPartyName).toBe('Resident');
    });

    it('returns empty claimant-entered details when CCD does not provide them', () => {
      const model = buildModel({
        data: {},
      });

      expect(model.claimantEnteredDefendantDetailsNameKnown).toBe('');
      expect(model.claimantEnteredDefendantDetailsName).toBe('');
    });

    it('prefers top-level defendantName when available', () => {
      const model = buildModel({
        data: {
          defendantName: 'Jen Parker',
          possessionClaimResponse: {
            claimantEnteredDefendantDetails: {
              nameKnown: 'YES',
              firstName: 'Test',
              lastName: 'John',
            },
          },
        },
      });

      expect(model.claimantEnteredDefendantDetailsName).toBe('Jen Parker');
    });
  });

  describe('defendant contact address', () => {
    it('returns the defendant contact address only when it has the expected shape', () => {
      const model = buildModel({
        data: {
          possessionClaimResponse: {
            defendantContactDetails: {
              party: {
                addressKnown: 'YES',
                address,
              },
            },
          },
        },
      });

      expect(model.defendantContactDetailsPartyAddress).toEqual(address);
      expect(model.hasDefendantContactDetailsPartyAddress).toBe(true);
    });

    it('returns undefined when the address is missing or malformed', () => {
      const emptyObjectAddressModel = buildModel({
        data: {
          possessionClaimResponse: {
            defendantContactDetails: {
              party: {
                addressKnown: 'YES',
                address: {},
              },
            },
          },
        },
      });
      const arrayAddressModel = buildModel({
        data: {
          possessionClaimResponse: {
            defendantContactDetails: {
              party: {
                addressKnown: 'YES',
                address: [] as unknown as Record<string, never>,
              },
            },
          },
        },
      });

      expect(emptyObjectAddressModel.defendantContactDetailsPartyAddress).toBeUndefined();
      expect(emptyObjectAddressModel.hasDefendantContactDetailsPartyAddress).toBe(false);
      expect(arrayAddressModel.defendantContactDetailsPartyAddress).toBeUndefined();
      expect(arrayAddressModel.hasDefendantContactDetailsPartyAddress).toBe(false);
    });
  });

  describe('defendant response helpers', () => {
    it('exposes contact preference booleans from yes/no values', () => {
      const model = buildModel({
        data: {
          possessionClaimResponse: {
            defendantResponses: {
              contactByPhone: YesNoEnum.YES,
              contactByEmail: YesNoEnum.NO,
              contactByPost: YesNoEnum.YES,
              contactByText: YesNoEnum.NO,
            },
          },
        },
      });

      expect(model.isDefendantContactByPhone).toBe(true);
      expect(model.isDefendantContactByEmail).toBe(false);
      expect(model.isDefendantContactByPost).toBe(true);
      expect(model.isDefendantContactByText).toBe(false);
    });

    it('normalizes confirm notice given answers from CCD values', () => {
      const yesModel = buildModel({
        data: {
          possessionClaimResponse: {
            defendantResponses: {
              confirmNoticeGiven: ' YES ',
            },
          },
        },
      });
      const noModel = buildModel({
        data: {
          possessionClaimResponse: {
            defendantResponses: {
              confirmNoticeGiven: 'no',
            },
          },
        },
      });
      const notSureModel = buildModel({
        data: {
          possessionClaimResponse: {
            defendantResponses: {
              confirmNoticeGiven: 'IM_NOT_SURE',
            },
          },
        },
      });
      const customValueModel = buildModel({
        data: {
          possessionClaimResponse: {
            defendantResponses: {
              confirmNoticeGiven: '  maybe-later  ',
            },
          },
        },
      });
      const missingValueModel = buildModel();

      expect(yesModel.defendantResponsesConfirmNoticeGiven).toBe('yes');
      expect(noModel.defendantResponsesConfirmNoticeGiven).toBe('no');
      expect(notSureModel.defendantResponsesConfirmNoticeGiven).toBe('imNotSure');
      expect(customValueModel.defendantResponsesConfirmNoticeGiven).toBe('maybe-later');
      expect(missingValueModel.defendantResponsesConfirmNoticeGiven).toBeUndefined();
    });
  });

  describe('notice date', () => {
    it('uses the first available notice date in precedence order', () => {
      const handedOverModel = buildModel({
        data: {
          notice_NoticeHandedOverDateTime: '2024-05-01T09:30:00',
          notice_NoticePostedDate: '2024-05-02',
          notice_NoticeOtherElectronicDateTime: '2024-05-03T10:00:00',
        },
      });
      const postedModel = buildModel({
        data: {
          notice_NoticePostedDate: '2024-05-02',
          notice_NoticeOtherElectronicDateTime: '2024-05-03T10:00:00',
        },
      });
      const electronicModel = buildModel({
        data: {
          notice_NoticeOtherElectronicDateTime: '2024-05-03T10:00:00',
        },
      });

      expect(handedOverModel.noticeDate).toBe('2024-05-01T09:30:00');
      expect(postedModel.noticeDate).toBe('2024-05-02');
      expect(electronicModel.noticeDate).toBe('2024-05-03T10:00:00');
    });

    it('returns undefined when no notice date exists', () => {
      const model = buildModel();

      expect(model.noticeDate).toBeUndefined();
    });
  });
});
