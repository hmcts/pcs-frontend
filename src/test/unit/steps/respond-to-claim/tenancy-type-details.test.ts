jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
}));

jest.mock('../../../../main/steps/utils/populateResponseToClaimPayloadmap', () => ({
  buildCcdCaseForPossessionClaimResponse: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/tenancy-type-details';
import { buildCcdCaseForPossessionClaimResponse } from '../../../../main/steps/utils/populateResponseToClaimPayloadmap';

type TestedStep = {
  stepName: string;
  customTemplate: string;
  beforeRedirect: (req: { body?: Record<string, unknown> }) => Promise<void>;
  extendGetContent: (
    req: {
      body?: Record<string, unknown>;
      session?: { formData?: Record<string, Record<string, unknown>> };
      res?: { locals?: { validatedCase?: { data?: Record<string, unknown> } } };
    },
    formContent: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
};

describe('respond-to-claim tenancy-type-details step', () => {
  const testedStep = step as unknown as TestedStep;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defines the expected step metadata', () => {
    expect(testedStep.stepName).toBe('tenancy-type-details');
    expect(testedStep.customTemplate).toBe('respond-to-claim/tenancy-type-details/tenancyTypeDetails.njk');
  });

  it.each([
    ['yes', 'YES'],
    ['no', 'NO'],
    ['notSure', 'NOT_SURE'],
    [undefined, null],
  ])('beforeRedirect maps %s to %s and submits it', async (tenancyTypeConfirm, tenancyTypeCorrect) => {
    await testedStep.beforeRedirect({
      body: tenancyTypeConfirm ? { tenancyTypeConfirm } : {},
    });

    expect(buildCcdCaseForPossessionClaimResponse).toHaveBeenCalledWith(
      expect.anything(),
      {
        defendantResponses: {
          tenancyTypeCorrect,
        },
      },
      false
    );
  });

  it('extendGetContent prefers request body values and replaces claimant name text', async () => {
    const content = await testedStep.extendGetContent(
      {
        body: {
          tenancyTypeConfirm: 'no',
          'tenancyTypeConfirm.correctType': 'Licence agreement',
        },
        session: { formData: { 'tenancy-type-details': { tenancyTypeConfirm: 'yes', correctType: 'Ignored' } } },
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
        detailsHeading: 'Details from Treetops Housing',
      }
    );

    expect(content).toEqual(
      expect.objectContaining({
        tenancyTypeConfirm: 'no',
        correctType: 'Licence agreement',
        organisationName: 'Acme Housing',
        insetText: 'Acme Housing gave these details.',
        detailsHeading: 'Details from Acme Housing',
      })
    );
  });

  it('extendGetContent falls back to alternate body and session values and appends the organisation name', async () => {
    const content = await testedStep.extendGetContent(
      {
        body: {
          correctType: 'Occupancy contract',
        },
        session: { formData: { 'tenancy-type-details': { tenancyTypeConfirm: 'notSure' } } },
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
        insetText: 'No replacement needed',
        detailsHeading: 'Details given by ',
      }
    );

    expect(content).toEqual(
      expect.objectContaining({
        tenancyTypeConfirm: 'notSure',
        correctType: 'Occupancy contract',
        organisationName: 'Delta Homes',
        insetText: 'No replacement needed',
        detailsHeading: 'Details given by Delta Homes:',
      })
    );
  });

  it('extendGetContent falls back to session subfield values and Unknown when claimant organisation is missing', async () => {
    const nonStringInset = { text: 'unchanged' };
    const nonStringHeading = { text: 'unchanged' };

    const content = await testedStep.extendGetContent(
      {
        body: {},
        session: {
          formData: {
            'tenancy-type-details': {
              tenancyTypeConfirm: 'yes',
              'tenancyTypeConfirm.correctType': 'Session tenancy',
            },
          },
        },
        res: {
          locals: {
            validatedCase: {
              data: {
                possessionClaimResponse: {},
              },
            },
          },
        },
      },
      {
        insetText: nonStringInset,
        detailsHeading: nonStringHeading,
      }
    );

    expect(content).toEqual(
      expect.objectContaining({
        tenancyTypeConfirm: 'yes',
        correctType: 'Session tenancy',
        organisationName: 'Unknown',
        insetText: nonStringInset,
        detailsHeading: nonStringHeading,
      })
    );
  });
});
