jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
}));

jest.mock('../../../../main/steps/utils/populateResponseToClaimPayloadmap', () => ({
  buildCcdCaseForPossessionClaimResponse: jest.fn(),
}));

import { buildCcdCaseForPossessionClaimResponse } from '../../../../main/steps/utils/populateResponseToClaimPayloadmap';
import { step } from '../../../../main/steps/respond-to-claim/tenancy-type-details';

type TenancyTypeDetailsStep = {
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
                claimantOrganisations?: Array<{ value?: string }>;
              };
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

  describe('beforeRedirect', () => {
    it.each([
      ['yes', 'YES'],
      ['no', 'NO'],
      ['notSure', 'NOT_SURE'],
      ['maybe', null],
      [undefined, null],
    ])('maps tenancyTypeConfirm=%s to tenancyTypeCorrect=%s', async (tenancyTypeConfirm, tenancyTypeCorrect) => {
      const req = tenancyTypeConfirm ? { body: { tenancyTypeConfirm } } : { body: {} };

      await testedStep.beforeRedirect(req);

      expect(buildCcdCaseForPossessionClaimResponse).toHaveBeenCalledWith(
        req,
        {
          defendantResponses: {
            tenancyTypeCorrect,
          },
        },
        false
      );
    });
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

    it('falls back to savedStepData["tenancyTypeConfirm.correctType"] when body values are missing', async () => {
      const content = await testedStep.extendGetContent(
        {
          body: {},
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

      expect(content.correctType).toBe('Session subfield value');
    });

    it('falls back to savedStepData.correctType last', async () => {
      const content = await testedStep.extendGetContent(
        {
          body: {},
          session: {
            formData: {
              'tenancy-type-details': {
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

      expect(content.correctType).toBe('Session direct value');
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

    it.each([
      ['missing claimantOrganisations', { possessionClaimResponse: {} }],
      ['missing claimant organisation value', { possessionClaimResponse: { claimantOrganisations: [{}] } }],
    ])('falls back to Unknown for orgName when %s', async (_label, caseData) => {
      const content = await testedStep.extendGetContent(
        {
          body: {},
          session: { formData: { 'tenancy-type-details': {} } },
          res: {
            locals: {
              validatedCase: {
                data: caseData,
              },
            },
          },
        },
        formContent
      );

      expect(content.organisationName).toBe('Unknown');
    });

    it('replaces Treetops Housing in insetText when insetText is a string', async () => {
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
          insetText: 'Treetops Housing gave these details.',
          detailsHeading: 'Details given by ',
        }
      );

      expect(content.insetText).toBe('Acme Housing gave these details.');
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

    it('replaces Treetops Housing in detailsHeading when detailsHeading contains it', async () => {
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
          detailsHeading: 'Details from Treetops Housing',
        }
      );

      expect(content.detailsHeading).toBe('Details from Acme Housing');
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
  });
});
