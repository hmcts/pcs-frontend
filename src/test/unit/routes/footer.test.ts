import type { Application, Request, RequestHandler, Response } from 'express';

import { legalRepresentativeHeaderMiddleware } from '../../../main/middleware';

import footerPagesRoutes from '@routes/footer';

jest.mock('../../../main/middleware', () => ({
  legalRepresentativeHeaderMiddleware: jest.fn(),
}));

const footerPages = [
  ['/accessibility', 'footer/accessibility', 'Accessibility Statement'],
  ['/privacy-policy', 'footer/privacy-policy', 'Privacy Policy'],
  ['/cookies', 'footer/cookies', 'Cookies'],
  ['/terms-and-conditions', 'footer/terms-and-conditions', 'Terms and Conditions'],
  ['/get-help', 'footer/get-help', 'Get Help'],
] as const;

function buildApp(): Application {
  return {
    get: jest.fn(),
    use: jest.fn(),
  } as unknown as Application;
}

describe('footer page routes', () => {
  it('registers the legal representative header middleware for every footer path', () => {
    const app = buildApp();

    footerPagesRoutes(app);

    expect(app.use).toHaveBeenCalledWith(
      footerPages.map(([path]) => path),
      legalRepresentativeHeaderMiddleware
    );
  });

  it.each(footerPages)('renders %s', (path, template, title) => {
    const app = buildApp();
    const translate = jest.fn((key: string) => `translated:${key}`);
    const req = { i18n: { t: translate } } as unknown as Request;
    const res = { render: jest.fn() } as unknown as Response;
    const fallbackRes = { render: jest.fn() } as unknown as Response;

    footerPagesRoutes(app);

    const route = (app.get as jest.Mock).mock.calls.find(([registeredPath]) => registeredPath === path);
    const handler = route[1] as RequestHandler;
    handler(req, res, jest.fn());

    expect(res.render).toHaveBeenCalledWith(template, {
      title,
      t: translate,
    });

    handler({} as Request, fallbackRes, jest.fn());
    const viewModel = (fallbackRes.render as jest.Mock).mock.calls[0][1];
    expect(viewModel.t('footer.example')).toBe('footer.example');
  });

  it('renders the citizen footer when the user is not a legal representative', () => {
    const app = buildApp();
    const req = {} as Request;
    const res = { locals: {}, render: jest.fn() } as unknown as Response;
    const next = jest.fn();

    (legalRepresentativeHeaderMiddleware as jest.Mock).mockImplementationOnce((_req, response, nextHandler) => {
      response.locals.isLegalRepresentative = false;
      nextHandler();
    });

    footerPagesRoutes(app);

    const middleware = (app.use as jest.Mock).mock.calls[0][1] as RequestHandler;
    middleware(req, res, next);

    const handler = (app.get as jest.Mock).mock.calls[0][1] as RequestHandler;
    handler(req, res, next);

    expect(res.locals.isLegalRepresentative).toBe(false);
    expect(res.locals.footerModel).toBeUndefined();
    expect(res.render).toHaveBeenCalledWith('footer/accessibility', {
      title: 'Accessibility Statement',
      t: expect.any(Function),
    });
  });
});
