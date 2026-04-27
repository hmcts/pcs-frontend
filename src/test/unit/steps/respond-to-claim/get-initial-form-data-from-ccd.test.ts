import type { Request, Response } from 'express';

import { step as noticeReceivedDateWhenNotProvidedStep } from '../../../../main/steps/respond-to-claim/confirmation-of-notice-date-when-not-provided';
import { step as noticeReceivedDateWhenProvidedStep } from '../../../../main/steps/respond-to-claim/confirmation-of-notice-date-when-provided';
import { step as contactByEmailOrPostStep } from '../../../../main/steps/respond-to-claim/contact-preferences-email-or-post';
import { step as contactByTelephoneStep } from '../../../../main/steps/respond-to-claim/contact-preferences-telephone';
import { step as correspondenceAddressStep } from '../../../../main/steps/respond-to-claim/correspondence-address';
import { step as landlordLicensedStep } from '../../../../main/steps/respond-to-claim/landlord-licensed';
import { step as tenancyDateDetailsStep } from '../../../../main/steps/respond-to-claim/tenancy-date-details';

import type { CcdCase } from '@services/ccdCase.interface';
import { CcdCaseModel } from '@services/ccdCaseData.model';

jest.mock('../../../../main/modules/i18n', () => ({
  getTranslationFunction: jest.fn(() => jest.fn((key: string) => key)),
  loadStepNamespace: jest.fn(),
  getRequestLanguage: jest.fn(() => 'en'),
  getCommonTranslations: jest.fn(() => ({})),
  getStepTranslations: jest.fn(() => ({})),
}));

const createReqRes = (validatedCase: CcdCaseModel, sessionFormData: Record<string, unknown> = {}) => {
  const res = {
    render: jest.fn(),
    locals: {
      validatedCase,
    },
  } as unknown as Response;

  const req = {
    app: {
      locals: {
        nunjucksEnv: {
          render: jest.fn(() => '<div>test</div>'),
        },
      },
    },
    session: {
      formData: sessionFormData,
    },
    body: {},
    originalUrl: '/case/1771325608502536/respond-to-claim/test-step',
    path: '/case/1771325608502536/respond-to-claim/test-step',
    res,
  } as unknown as Request;

  return { req, res };
};

describe('respond-to-claim getInitialFormData uses CCD', () => {
  it('prefills contact-preferences-telephone from validatedCase instead of session', async () => {
    const validatedCase = new CcdCaseModel({
      id: '1771325608502536',
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            contactByPhone: 'YES',
          },
          defendantContactDetails: {
            party: {
              phoneNumber: '07123456789',
            },
          },
        },
      },
    } as CcdCase);
    const { req, res } = createReqRes(validatedCase, {
      'contact-preferences-telephone': { contactByTelephone: 'no' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = (contactByTelephoneStep.getController as any)();
    await controller.get(req, res);

    const renderData = (res.render as jest.Mock).mock.calls[0][1];
    expect(renderData.fieldValues).toEqual(expect.objectContaining({ contactByTelephone: 'yes' }));
    expect(renderData.contactByTelephone).toBe('yes');
    expect(renderData['contactByTelephone.phoneNumber']).toBe('07123456789');
  });

  it('prefills contact-preferences-email-or-post from validatedCase instead of session', async () => {
    const validatedCase = new CcdCaseModel({
      id: '1771325608502536',
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            preferenceType: 'EMAIL',
          },
          defendantContactDetails: {
            party: {
              emailAddress: 'tenant@example.com',
            },
          },
        },
      },
    } as CcdCase);
    const { req, res } = createReqRes(validatedCase, {
      'contact-preferences-email-or-post': { contactByEmailOrPost: 'post' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = (contactByEmailOrPostStep.getController as any)();
    await controller.get(req, res);

    const renderData = (res.render as jest.Mock).mock.calls[0][1];
    expect(renderData.fieldValues).toEqual(expect.objectContaining({ contactByEmailOrPost: 'email' }));
    expect(renderData.contactByEmailOrPost).toBe('email');
    expect(renderData['contactByEmailOrPost.email']).toBe('tenant@example.com');
  });

  it('prefills tenancy-date-details from validatedCase defendant responses', async () => {
    const validatedCase = new CcdCaseModel({
      id: '1771325608502536',
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            tenancyStartDateCorrect: 'NO',
            tenancyStartDate: '2025-12-01',
          },
        },
      },
    } as CcdCase);
    const { req, res } = createReqRes(validatedCase);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = (tenancyDateDetailsStep.getController as any)();
    await controller.get(req, res);

    const renderData = (res.render as jest.Mock).mock.calls[0][1];
    expect(renderData.fieldValues).toEqual(expect.objectContaining({ confirmTenancyDate: 'no' }));
    const dateItems = renderData.fields[0].options[1].subFields.tenancyStartDate.component.items;
    expect(dateItems[0].value).toBe('1');
    expect(dateItems[1].value).toBe('12');
    expect(dateItems[2].value).toBe('2025');
  });

  it('prefills landlord-licensed from validatedCase instead of session', async () => {
    const validatedCase = new CcdCaseModel({
      id: '1771325608502536',
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            landlordLicensed: 'NOT_SURE',
          },
        },
      },
    } as CcdCase);
    const { req, res } = createReqRes(validatedCase, {
      'landlord-licensed': { confirmLandlordLicensed: 'yes' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = (landlordLicensedStep.getController as any)();
    await controller.get(req, res);

    const renderData = (res.render as jest.Mock).mock.calls[0][1];
    expect(renderData.fieldValues).toEqual(expect.objectContaining({ confirmLandlordLicensed: 'imNotSure' }));
    expect(renderData.confirmLandlordLicensed).toBe('imNotSure');
  });

  it('populates page heading from CCD without pre-selecting yes or filling address form', async () => {
    const validatedCase = {
      id: '1771325608502536',
      hasDefendantContactDetailsPartyAddress: true,
      defendantContactDetailsPartyAddressKnown: 'YES',
      defendantContactDetailsPartyAddress: {
        AddressLine1: '10 Second Avenue',
        PostTown: 'London',
        PostCode: 'W3 7RX',
      },
      data: {
        possessionClaimResponse: {
          claimantEnteredDefendantDetails: {
            address: {
              AddressLine1: '10 Second Avenue',
              PostTown: 'London',
              PostCode: 'W3 7RX',
            },
          },
        },
      },
    };
    const { req, res } = createReqRes(validatedCase as unknown as CcdCaseModel);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = (correspondenceAddressStep.getController as any)();
    await controller.get(req, res);

    const renderData = (res.render as jest.Mock).mock.calls[0][1];
    expect(renderData.fieldValues.correspondenceAddressConfirm).toBe('');
    expect(renderData.correspondenceAddressLine1).toBe('');
    expect(renderData.formattedAddressStr).toContain('10 Second Avenue');
  });

  it('defaults radio selection from CCD when no session value exists', async () => {
    const validatedCase = new CcdCaseModel({
      id: '1771325608502536',
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            correspondenceAddressConfirmation: 'NO',
          },
          defendantContactDetails: {
            party: {
              address: {
                AddressLine1: '22 Example Street',
                AddressLine2: 'Flat 3',
                PostTown: 'Cardiff',
                County: 'South Glamorgan',
                PostCode: 'CF10 1AA',
              },
            },
          },
        },
      },
    } as CcdCase);

    const { req, res } = createReqRes(validatedCase);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = (correspondenceAddressStep.getController as any)();
    await controller.get(req, res);

    const renderData = (res.render as jest.Mock).mock.calls[0][1];

    expect(renderData.fieldValues.correspondenceAddressConfirm).toBe('no');

    expect(renderData.correspondenceAddressLine1).toBe('22 Example Street');
    expect(renderData.correspondenceAddressLine2).toBe('Flat 3');
    expect(renderData.correspondenceTownOrCity).toBe('Cardiff');
    expect(renderData.correspondenceCounty).toBe('South Glamorgan');
    expect(renderData.correspondencePostcode).toBe('CF10 1AA');
  });

  it('prefills notice date from validatedCase respondent response instead of session', async () => {
    const validatedCase = new CcdCaseModel({
      id: '1771325608502536',
      data: {
        possessionClaimResponse: {
          defendantResponses: {
            noticeReceivedDate: '2024-09-27',
          },
        },
      },
    } as CcdCase);
    const { req, res } = createReqRes(validatedCase, {
      'confirmation-of-notice-date-when-not-provided': {
        noticeReceivedDate: { day: '1', month: '1', year: '2020' },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = (noticeReceivedDateWhenNotProvidedStep.getController as any)();
    await controller.get(req, res);

    const renderData = (res.render as jest.Mock).mock.calls[0][1];
    expect(renderData.fieldValues.noticeReceivedDate).toEqual({
      day: '27',
      month: '09',
      year: '2024',
    });
  });

  it('does not fall back to session values when CCD initial data intentionally returns empty object', async () => {
    const validatedCase = new CcdCaseModel({ id: '1771325608502536', data: {} } as CcdCase);
    const { req, res } = createReqRes(validatedCase, {
      'confirmation-of-notice-date-when-provided': {
        noticeReceivedDate: { day: '1', month: '1', year: '2020' },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = (noticeReceivedDateWhenProvidedStep.getController as any)();
    await controller.get(req, res);

    const renderData = (res.render as jest.Mock).mock.calls[0][1];
    expect(renderData.fieldValues.noticeReceivedDate).toEqual({
      day: '',
      month: '',
      year: '',
    });
  });
});
