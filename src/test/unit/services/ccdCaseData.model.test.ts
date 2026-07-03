import { CcdCase, CcdCaseAddress, YesNoEnum, YesNoNotSureValue } from '@services/ccdCase.interface';
import { CcdCaseModel } from '@services/ccdCaseData.model';

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
      expect(arrayAddressModel.defendantContactDetailsPartyAddress).toBeUndefined();
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

    it('normalizes possessionNoticeReceived answers from CCD values', () => {
      const yesModel = buildModel({
        data: {
          possessionClaimResponse: {
            defendantResponses: {
              possessionNoticeReceived: ' YES ' as unknown as YesNoNotSureValue,
            },
          },
        },
      });
      const noModel = buildModel({
        data: {
          possessionClaimResponse: {
            defendantResponses: {
              possessionNoticeReceived: 'no' as unknown as YesNoNotSureValue,
            },
          },
        },
      });
      const notSureModel = buildModel({
        data: {
          possessionClaimResponse: {
            defendantResponses: {
              possessionNoticeReceived: 'IM_NOT_SURE' as unknown as YesNoNotSureValue,
            },
          },
        },
      });
      const customValueModel = buildModel({
        data: {
          possessionClaimResponse: {
            defendantResponses: {
              possessionNoticeReceived: '  maybe-later  ' as unknown as YesNoNotSureValue,
            },
          },
        },
      });
      const missingValueModel = buildModel();

      expect(yesModel.defendantResponsesPossessionNoticeReceived).toBe('yes');
      expect(noModel.defendantResponsesPossessionNoticeReceived).toBe('no');
      expect(notSureModel.defendantResponsesPossessionNoticeReceived).toBe('imNotSure');
      expect(customValueModel.defendantResponsesPossessionNoticeReceived).toBe('maybe-later');
      expect(missingValueModel.defendantResponsesPossessionNoticeReceived).toBeUndefined();
    });
  });

  describe('simple passthrough getters', () => {
    it('returns top-level CcdCaseData fields when present', () => {
      const model = buildModel({
        data: {
          rentArrears_Total: '500.00',
          noticeServed: 'YES',
          propertyAddress: address,
          claimGroundSummaries: [{ groundCode: 'X', groundLabel: 'X' } as never],
          userPcqIdSet: 'YES',
          legislativeCountry: 'England',
          tenancy_TypeOfTenancyLicence: 'ASSURED_TENANCY',
          occupationLicenceTypeWales: 'OTHER',
          possessionClaimResponse: { defendantResponses: { freeLegalAdvice: 'yes' } },
          submitDraftAnswers: 'YES',
          introGrounds_IntroductoryDemotedOrOtherGrounds: ['G1', 'G2'],
          secureGroundsWales_DiscretionaryGrounds: ['W1'],
        },
      });

      expect(model.rentArrears_Total).toBe('500.00');
      expect(model.noticeServed).toBe('YES');
      expect(model.propertyAddress).toEqual(address);
      expect(model.claimGroundSummaries).toHaveLength(1);
      expect(model.userPcqIdSet).toBe('YES');
      expect(model.legislativeCountry).toBe('England');
      expect(model.tenancy_TypeOfTenancyLicence).toBe('ASSURED_TENANCY');
      expect(model.occupationLicenceTypeWales).toBe('OTHER');
      expect(model.possessionClaimResponse).toEqual({ defendantResponses: { freeLegalAdvice: 'yes' } });
      expect(model.submitDraftAnswers).toBe('YES');
      expect(model.introGroundsIntroductoryDemotedOrOtherGrounds).toEqual(['G1', 'G2']);
      expect(model.secureGroundsWalesDiscretionaryGrounds).toEqual(['W1']);
    });

    it('returns undefined / empty arrays when those fields are missing', () => {
      const model = buildModel();

      expect(model.rentArrears_Total).toBeUndefined();
      expect(model.noticeServed).toBeUndefined();
      expect(model.propertyAddress).toBeUndefined();
      expect(model.claimGroundSummaries).toBeUndefined();
      expect(model.userPcqIdSet).toBeUndefined();
      expect(model.legislativeCountry).toBeUndefined();
      expect(model.tenancy_TypeOfTenancyLicence).toBeUndefined();
      expect(model.occupationLicenceTypeWales).toBeUndefined();
      expect(model.possessionClaimResponse).toBeUndefined();
      expect(model.submitDraftAnswers).toBeUndefined();
      expect(model.introGroundsIntroductoryDemotedOrOtherGrounds).toEqual([]);
      expect(model.secureGroundsWalesDiscretionaryGrounds).toEqual([]);
    });

    it('exposes defendantResponses passthroughs when populated', () => {
      const model = buildModel({
        data: {
          possessionClaimResponse: {
            defendantResponses: {
              tenancyStartDateConfirmation: 'YES',
              tenancyStartDate: '2024-01-15',
              freeLegalAdvice: 'yes',
              defendantNameConfirmation: 'YES',
              dateOfBirth: '1990-04-12',
              landlordLicensed: 'NO',
            },
          },
        },
      });

      expect(model.defendantResponsesTenancyStartDateConfirmation).toBe('YES');
      expect(model.defendantResponsesTenancyStartDate).toBe('2024-01-15');
      expect(model.defendantResponsesFreeLegalAdvice).toBe('yes');
      expect(model.defendantResponsesDefendantNameConfirmation).toBe('YES');
      expect(model.defendantResponsesDateOfBirth).toBe('1990-04-12');
      expect(model.defendantResponsesLandlordLicensed).toBe('NO');
    });

    it('returns undefined for defendantResponses passthroughs when responses are missing', () => {
      const model = buildModel();

      expect(model.defendantResponsesTenancyStartDateConfirmation).toBeUndefined();
      expect(model.defendantResponsesTenancyStartDate).toBeUndefined();
      expect(model.defendantResponsesFreeLegalAdvice).toBeUndefined();
      expect(model.defendantResponsesDefendantNameConfirmation).toBeUndefined();
      expect(model.defendantResponsesDateOfBirth).toBeUndefined();
      expect(model.defendantResponsesLandlordLicensed).toBeUndefined();
    });

    it('exposes defendantContactDetails.party fields when populated', () => {
      const model = buildModel({
        data: {
          possessionClaimResponse: {
            defendantContactDetails: {
              party: {
                emailAddress: 'a@example.com',
                phoneNumber: '07000000000',
                nameKnown: 'YES',
              },
            },
          },
        },
      });

      expect(model.defendantContactDetailsPartyEmailAddress).toBe('a@example.com');
      expect(model.defendantContactDetailsPartyPhoneNumber).toBe('07000000000');
    });

    it('returns undefined / empty for defendantContactDetails.party when missing', () => {
      const model = buildModel();

      expect(model.defendantContactDetailsPartyEmailAddress).toBeUndefined();
      expect(model.defendantContactDetailsPartyPhoneNumber).toBeUndefined();
    });
  });

  describe('claimantEnteredDefendantDetails — claim-time flags', () => {
    it('exposes addressKnown and addressSameAsProperty from the claimant snapshot', () => {
      const model = buildModel({
        data: {
          possessionClaimResponse: {
            claimantEnteredDefendantDetails: {
              addressKnown: 'YES',
              addressSameAsProperty: 'YES',
            },
          },
        },
      });

      expect(model.claimantEnteredDefendantDetailsAddressKnown).toBe('YES');
      expect(model.claimantEnteredDefendantDetailsAddressSameAsProperty).toBe('YES');
    });

    it('returns empty when the claimant snapshot is missing', () => {
      const model = buildModel();

      expect(model.claimantEnteredDefendantDetailsAddressKnown).toBe('');
      expect(model.claimantEnteredDefendantDetailsAddressSameAsProperty).toBe('');
    });
  });

  describe('notice date', () => {
    it.each([
      ['notice_PostedDate', '2024-05-02', '2024-05-02'],
      ['notice_DeliveredDate', '2024-05-02', '2024-05-02'],
      ['notice_HandedOverDateTime', '2024-05-02T14:30:00', '2024-05-02'],
      ['notice_EmailSentDateTime', '2024-05-02T00:30:00', '2024-05-02'],
      ['notice_OtherElectronicDateTime', '2024-05-02T23:45:00', '2024-05-02'],
      ['notice_OtherDateTime', '2024-05-02T12:00:00', '2024-05-02'],
    ])('returns %s truncated to YYYY-MM-DD', (field, raw, expected) => {
      const model = buildModel({ data: { [field]: raw } });
      expect(model.noticeDate).toBe(expected);
    });

    it('returns undefined when no notice date exists', () => {
      const model = buildModel();

      expect(model.noticeDate).toBeUndefined();
    });
  });
});
