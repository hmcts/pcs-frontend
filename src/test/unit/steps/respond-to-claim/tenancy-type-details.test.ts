jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
}));

jest.mock('../../../../main/steps/utils/populateResponseToClaimPayloadmap', () => ({
  getDraftDefendantResponse: jest.fn(() => ({
    defendantResponses: {},
    defendantContactDetails: { party: {} },
  })),
  saveDraftDefendantResponse: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/tenancy-type-details';
import { saveDraftDefendantResponse } from '../../../../main/steps/utils/populateResponseToClaimPayloadmap';

type TenancyTypeDetailsStep = {
  getInitialFormData: (req: {
    res?: {
      locals?: {
        validatedCase?: {
          data?: {
            possessionClaimResponse?: {
              defendantResponses?: { tenancyTypeCorrect?: string; tenancyType?: string };
            };
          };
        };
      };
    };
  }) => Record<string, unknown>;
  beforeRedirect: (req: { body?: Record<string, unknown> }) => Promise<void>;
  extendGetContent: (
    req: {
      body?: Record<string, unknown>;
      session?: { formData?: Record<string, Record<string, unknown>> };
      res?: {
        locals?: {
          validatedCase?: {
            data?: {
              possessionClaimResponse?: {
                claimantOrganisations?: { value?: string }[];
                defendantResponses?: { tenancyTypeCorrect?: string; tenancyType?: string };
              };
              tenancy_TypeOfTenancyLicence?: string;
              tenancy_DetailsOfOtherTypeOfTenancyLicence?: string;
            };
          };
        };
      };
    },
    formContent: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
};

describe('respond-to-claim tenancy-type-details step', () => {
  const testedStep = step as unknown as TenancyTypeDetailsStep;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInitialFormData', () => {
    const makeReq = (tenancyTypeCorrect?: string, tenancyType?: string) => ({
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: { tenancyTypeCorrect, tenancyType },
              },
            },
          },
        },
      },
    });

    it.each([
      ['YES', 'yes'],
      ['NO', 'no'],
      ['NOT_SURE', 'notSure'],
    ])('returns tenancyTypeConfirm=%s when CCD has %s', (ccdValue, formValue) => {
      const result = testedStep.getInitialFormData(makeReq(ccdValue));
      expect(result).toMatchObject({ tenancyTypeConfirm: formValue });
    });

    it('also returns correctType when CCD value is NO and tenancyType is set', () => {
      const result = testedStep.getInitialFormData(makeReq('NO', 'Assured shorthold'));
      expect(result).toEqual({
        tenancyTypeConfirm: 'no',
        'tenancyTypeConfirm.correctType': 'Assured shorthold',
      });
    });

    it('returns empty object when CCD has no tenancyTypeCorrect', () => {
      const result = testedStep.getInitialFormData(makeReq(undefined));
      expect(result).toEqual({});
    });

    it('returns empty object when tenancyTypeCorrect is an unrecognised value', () => {
      const result = testedStep.getInitialFormData(makeReq('UNKNOWN'));
      expect(result).toEqual({});
    });
  });

  describe('beforeRedirect', () => {
    it.each([
      ['yes', 'YES'],
      ['no', 'NO'],
      ['notSure', 'NOT_SURE'],
    ])('maps tenancyTypeConfirm=%s to tenancyTypeCorrect=%s', async (tenancyTypeConfirm, tenancyTypeCorrect) => {
      const req = { body: { tenancyTypeConfirm } };

      await testedStep.beforeRedirect(req);

      expect(saveDraftDefendantResponse).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          defendantResponses: expect.objectContaining({
            tenancyTypeCorrect,
          }),
        })
      );
    });

    it.each([['maybe'], [undefined]])(
      'saves with fields deleted when tenancyTypeConfirm=%s',
      async tenancyTypeConfirm => {
        const req = tenancyTypeConfirm ? { body: { tenancyTypeConfirm } } : { body: {} };

        await testedStep.beforeRedirect(req);

        expect(saveDraftDefendantResponse).toHaveBeenCalledWith(req, {
          defendantResponses: {},
          defendantContactDetails: { party: {} },
        });
      }
    );
  });

  describe('extendGetContent', () => {
    const formContent = {
      insetText: 'Treetops Housing gave these details.',
      detailsHeading: 'Details from Treetops Housing',
    };

    it('uses tenancyTypeConfirm from body over savedStepData', async () => {
      const content = await testedStep.extendGetContent(
        {
          body: { tenancyTypeConfirm: 'no' },
          session: { formData: { 'tenancy-type-details': { tenancyTypeConfirm: 'yes' } } },
          res: {
            locals: {
              validatedCase: {
                data: {
                  possessionClaimResponse: {
                    claimantOrganisations: [{ value: 'Acme Housing' }],
                  },
                },
              },
            },
          },
        },
        formContent
      );

      expect(content).toEqual(
        expect.objectContaining({
          tenancyTypeConfirm: 'no',
          organisationName: 'Acme Housing',
        })
      );
    });

    it('uses correctType from req.body["tenancyTypeConfirm.correctType"] first', async () => {
      const content = await testedStep.extendGetContent(
        {
          body: {
            'tenancyTypeConfirm.correctType': 'Body subfield value',
            correctType: 'Body direct value',
          },
          session: {
            formData: {
              'tenancy-type-details': {
                'tenancyTypeConfirm.correctType': 'Session subfield value',
                correctType: 'Session direct value',
              },
            },
          },
          res: {
            locals: {
              validatedCase: {
                data: {
                  possessionClaimResponse: {
                    claimantOrganisations: [{ value: 'Acme Housing' }],
                  },
                },
              },
            },
          },
        },
        formContent
      );

      expect(content.correctType).toBe('Body subfield value');
    });

    it('falls back to req.body.correctType when subfield body value is missing', async () => {
      const content = await testedStep.extendGetContent(
        {
          body: {
            correctType: 'Body direct value',
          },
          session: {
            formData: {
              'tenancy-type-details': {
                'tenancyTypeConfirm.correctType': 'Session subfield value',
                correctType: 'Session direct value',
              },
            },
          },
          res: {
            locals: {
              validatedCase: {
                data: {
                  possessionClaimResponse: {
                    claimantOrganisations: [{ value: 'Acme Housing' }],
                  },
                },
              },
            },
          },
        },
        formContent
      );

      expect(content.correctType).toBe('Body direct value');
    });

    it('uses claimant organisation name when claimantOrganisations[0].value exists', async () => {
      const content = await testedStep.extendGetContent(
        {
          body: {},
          session: { formData: { 'tenancy-type-details': {} } },
          res: {
            locals: {
              validatedCase: {
                data: {
                  possessionClaimResponse: {
                    claimantOrganisations: [{ value: 'Acme Housing' }],
                  },
                },
              },
            },
          },
        },
        formContent
      );

      expect(content.organisationName).toBe('Acme Housing');
    });

    it('leaves insetText unchanged when it is not a string', async () => {
      const insetText = { text: 'unchanged' };

      const content = await testedStep.extendGetContent(
        {
          body: {},
          session: { formData: { 'tenancy-type-details': {} } },
          res: {
            locals: {
              validatedCase: {
                data: {
                  possessionClaimResponse: {
                    claimantOrganisations: [{ value: 'Acme Housing' }],
                  },
                },
              },
            },
          },
        },
        {
          insetText,
          detailsHeading: 'Details given by ',
        }
      );

      expect(content.insetText).toBe(insetText);
    });

    it('appends orgName and colon when detailsHeading does not contain Treetops Housing', async () => {
      const content = await testedStep.extendGetContent(
        {
          body: {},
          session: { formData: { 'tenancy-type-details': {} } },
          res: {
            locals: {
              validatedCase: {
                data: {
                  possessionClaimResponse: {
                    claimantOrganisations: [{ value: 'Delta Homes' }],
                  },
                },
              },
            },
          },
        },
        {
          insetText: 'No change',
          detailsHeading: 'Details given by ',
        }
      );

      expect(content.detailsHeading).toBe('Details given by Delta Homes:');
    });

    it('leaves detailsHeading unchanged when it is not a string', async () => {
      const detailsHeading = { text: 'unchanged' };

      const content = await testedStep.extendGetContent(
        {
          body: {},
          session: { formData: { 'tenancy-type-details': {} } },
          res: {
            locals: {
              validatedCase: {
                data: {
                  possessionClaimResponse: {
                    claimantOrganisations: [{ value: 'Acme Housing' }],
                  },
                },
              },
            },
          },
        },
        {
          insetText: 'No change',
          detailsHeading,
        }
      );

      expect(content.detailsHeading).toBe(detailsHeading);
    });

    describe('tenancyTypeAgreementType', () => {
      it.each([
        ['ASSURED_TENANCY', 'an assured'],
        ['SECURE_TENANCY', 'a secure'],
        ['INTRODUCTORY_TENANCY', 'an introductory'],
        ['FLEXIBLE_TENANCY', 'a flexible'],
        ['DEMOTED_TENANCY', 'a demoted'],
        ['OTHER', 'other'],
      ])('maps tenancy_TypeOfTenancyLicence=%s to tenancyTypeAgreementType=%s', async (licenceType, expectedText) => {
        const content = await testedStep.extendGetContent(
          {
            body: {},
            res: {
              locals: {
                validatedCase: {
                  data: {
                    possessionClaimResponse: { claimantOrganisations: [{ value: 'Acme Housing' }] },
                    tenancy_TypeOfTenancyLicence: licenceType,
                  },
                },
              },
            },
          },
          { detailsHeading: 'Details given by ', tenancyType: 'standard tenancy text' }
        );

        expect(content.tenancyTypeAgreementType).toBe(expectedText);
      });
    });

    describe('tenancyType content for OTHER type', () => {
      it('builds sentence from tenancy_DetailsOfOtherTypeOfTenancyLicence when type is OTHER', async () => {
        const content = await testedStep.extendGetContent(
          {
            body: {},
            res: {
              locals: {
                validatedCase: {
                  data: {
                    possessionClaimResponse: { claimantOrganisations: [{ value: 'Acme Housing' }] },
                    tenancy_TypeOfTenancyLicence: 'OTHER',
                    tenancy_DetailsOfOtherTypeOfTenancyLicence: 'Rolling monthly agreement',
                  },
                },
              },
            },
          },
          {
            detailsHeading: 'Details given by ',
            tenancyType: 'should be replaced',
            tenancyTypeOther:
              'The claimant provided the following information about your tenancy, occupation contract or licence agreement type: Rolling monthly agreement',
          }
        );

        expect(content.tenancyType).toBe(
          'The claimant provided the following information about your tenancy, occupation contract or licence agreement type: Rolling monthly agreement'
        );
      });

      it('returns formContent.tenancyType unchanged when type is not OTHER', async () => {
        const content = await testedStep.extendGetContent(
          {
            body: {},
            res: {
              locals: {
                validatedCase: {
                  data: {
                    possessionClaimResponse: { claimantOrganisations: [{ value: 'Acme Housing' }] },
                    tenancy_TypeOfTenancyLicence: 'ASSURED_TENANCY',
                    tenancy_DetailsOfOtherTypeOfTenancyLicence: 'should be ignored',
                  },
                },
              },
            },
          },
          { detailsHeading: 'Details given by ', tenancyType: 'original tenancy text' }
        );

        expect(content.tenancyType).toBe('original tenancy text');
      });
    });
  });
});
