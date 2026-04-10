import type { NextFunction, Request, Response } from 'express';

import { legalRepresentativeHeaderMiddleware } from '../../../main/middleware/legalRepresentativeHeaders';

const mockIsLegalRepresentativeUser = jest.fn();

jest.mock('../../../main/steps/utils', () => ({
  isLegalRepresentativeUser: (...args: unknown[]) => mockIsLegalRepresentativeUser(...args),
}));

const mockBuildHeaderModel = jest.fn();
const mockBuildFooterModel = jest.fn();

jest.mock('@hmcts-cft/cft-ui-component-lib', () => ({
  buildHeaderModel: (...args: unknown[]) => mockBuildHeaderModel(...args),
  buildFooterModel: () => mockBuildFooterModel()
}));

describe('legalRepresentativeHeaderMiddleware', () => {
  let res: Partial<Response>;
  let next: NextFunction;
  const invokeMiddleware = (req: Request): void => {
    (legalRepresentativeHeaderMiddleware as unknown as (request: Request, response: Response, nextFn: NextFunction) => void)(
      req,
      res as Response,
      next
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      locals: {},
    };
    next = jest.fn();
  });

  it('does not append extra headers for non-legalrep users', () => {
    mockIsLegalRepresentativeUser.mockReturnValue(false);
    const req = {} as unknown as Request;

    invokeMiddleware(req);

    expect(next).toHaveBeenCalled();
    expect(res.locals?.extraHeaders).toBeUndefined();
  });

  it('appends extra headers for legalrep users', () => {
    const headerModel = { name: 'header', assetsPath: '' };
    const footerModel = { name: 'footer' };
    mockIsLegalRepresentativeUser.mockReturnValue(true);
    mockBuildHeaderModel.mockReturnValue(headerModel);    
    mockBuildFooterModel.mockReturnValue(footerModel);
    const req = {} as unknown as Request;

    invokeMiddleware(req);

    expect(next).toHaveBeenCalled();
    expect(res.locals?.extraHeaders).toEqual({ 
      headerModel,
      footerModel,
      isLegalRepresentative: true
    });
  });

});
