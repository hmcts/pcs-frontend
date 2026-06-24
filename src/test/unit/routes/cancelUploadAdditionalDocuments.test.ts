import type { Request, Response } from 'express';

import { cancelUploadJourney } from '../../../main/routes/cancelUploadAdditionalDocuments';

jest.mock('../../../main/routes/dashboard', () => ({
  getDashboardUrl: (ref?: string | number) => (ref ? `/dashboard/${ref}` : null),
}));

function buildReq(overrides: Partial<Request> = {}): Request {
  return {
    params: { caseReference: '1234567890123456' },
    session: {},
    ...overrides,
  } as unknown as Request;
}

function buildRes(): { res: Response; redirect: jest.Mock } {
  const redirect = jest.fn();
  const res = { redirect } as unknown as Response;
  return { res, redirect };
}

describe('cancelUploadJourney', () => {
  it('clears session uploaded docs for the case and redirects to the dashboard', () => {
    const req = buildReq({
      session: {
        uploadedDocs: {
          '1234567890123456': [{ id: 'doc-1', value: { foo: 'bar' } }],
          '9999999999999999': [{ id: 'other', value: {} }],
        },
      } as unknown as Request['session'],
    });
    const { res, redirect } = buildRes();

    cancelUploadJourney(req, res);

    expect(req.session.uploadedDocs?.['1234567890123456']).toBeUndefined();
    expect(req.session.uploadedDocs?.['9999999999999999']).toBeDefined();
    expect(redirect).toHaveBeenCalledWith(302, '/dashboard/1234567890123456');
  });

  it('clears journey form data for all upload-additional-documents steps', () => {
    const req = buildReq({
      session: {
        formData: {
          'confirm-if-these-documents-relate-to-an-application': { relatedApplicationId: 'abc' },
          'upload-your-documents': { documents: ['a.pdf'] },
          'check-your-answers': { something: true },
          'other-journey-step': { keepMe: true },
        },
      } as unknown as Request['session'],
    });
    const { res, redirect } = buildRes();

    cancelUploadJourney(req, res);

    expect(req.session.formData?.['confirm-if-these-documents-relate-to-an-application']).toBeUndefined();
    expect(req.session.formData?.['upload-your-documents']).toBeUndefined();
    expect(req.session.formData?.['check-your-answers']).toBeUndefined();
    expect(req.session.formData?.['other-journey-step']).toEqual({ keepMe: true });
    expect(redirect).toHaveBeenCalledWith(302, '/dashboard/1234567890123456');
  });

  it('falls back to /dashboard when caseReference is missing', () => {
    const req = buildReq({ params: {} as Request['params'], session: {} as Request['session'] });
    const { res, redirect } = buildRes();

    cancelUploadJourney(req, res);

    expect(redirect).toHaveBeenCalledWith(302, '/dashboard');
  });
});
