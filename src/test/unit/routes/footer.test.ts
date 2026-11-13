import nodePath from 'path';

import config from 'config';
import type { Application, Request, RequestHandler, Response } from 'express';
import nunjucks from 'nunjucks';

import { legalRepresentativeHeaderMiddleware } from '../../../main/middleware';

import footerPagesRoutes from '@routes/footer';

jest.mock('config', () => ({
  get: jest.fn(),
}));

jest.mock('../../../main/middleware', () => ({
  legalRepresentativeHeaderMiddleware: jest.fn(),
}));

const footerPages = [
  ['/accessibility', 'footer/accessibility', '/accessibility'],
  ['/privacy-policy', 'footer/privacy-policy', '/privacy-policy'],
  ['/cookies', 'footer/cookies', '/cookies'],
  ['/terms-and-conditions', 'footer/terms-and-conditions', '/legacy-terms-and-conditions'],
  ['/get-help', 'footer/get-help', '/get-help'],
] as const;

const viewsRoot = nodePath.resolve(__dirname, '../../../main/views');
const govukTemplatePath = require.resolve('govuk-frontend/dist/govuk/template.njk');
const govukRoot = nodePath.resolve(nodePath.dirname(govukTemplatePath), '..');
const cftMacroPath = nodePath.dirname(require.resolve('@hmcts-cft/cft-ui-component-lib/nunjucks/xui-header/macro.njk'));
const cftRoot = nodePath.resolve(cftMacroPath, '..');
const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([viewsRoot, govukRoot, cftRoot], { noCache: true }),
  { autoescape: true }
);

const legalRepresentativeFooterModel = {
  navigation: {
    items: [{ text: 'Legal representative footer link', href: '/legal-representative-footer-link' }],
  },
};

function buildApp(): Application {
  return {
    get: jest.fn(),
    use: jest.fn(),
  } as unknown as Application;
}

describe('footer page routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (config.get as jest.Mock).mockReturnValue('https://manage-case.test');
  });

  it('registers the legal representative header middleware for every footer path', () => {
    const app = buildApp();

    footerPagesRoutes(app);

    expect(app.use).toHaveBeenCalledWith(
      footerPages.map(([path]) => path),
      legalRepresentativeHeaderMiddleware
    );
  });

  it.each(footerPages)('renders %s for citizen users', async (path, template) => {
    const app = buildApp();
    const fixedTranslate = jest.fn((key: string) => `translated:${key}`);
    const getFixedT = jest.fn().mockReturnValue(fixedTranslate);
    const loadNamespaces = jest.fn().mockResolvedValue(undefined);
    const req = { language: 'en', i18n: { getFixedT, loadNamespaces } } as unknown as Request;
    const res = { locals: { isLegalRepresentative: false }, render: jest.fn(), redirect: jest.fn() } as unknown as Response;
    const fallbackRes = { locals: { isLegalRepresentative: false }, render: jest.fn(), redirect: jest.fn() } as unknown as Response;

    footerPagesRoutes(app);

    const route = (app.get as jest.Mock).mock.calls.find(([registeredPath]) => registeredPath === path);
    const handler = route[1] as RequestHandler;
    await handler(req, res, jest.fn());

    expect(loadNamespaces).toHaveBeenCalledWith([template]);
    expect(getFixedT).toHaveBeenCalledWith('en', template);
    expect(res.locals.t).toBe(fixedTranslate);
    expect(res.render).toHaveBeenCalledWith(template, {
      t: fixedTranslate,
      ns: template,
      isLegalRepresentative: false,
    });
    expect(res.redirect).not.toHaveBeenCalled();

    await handler({} as Request, fallbackRes, jest.fn());
    const viewModel = (fallbackRes.render as jest.Mock).mock.calls[0][1];
    expect(viewModel.t('footer.example')).toBe('footer.example');
  });

  it.each(footerPages)('redirects %s to EXUI for legal representatives', async (path, _template, exuiPath) => {
    const app = buildApp();
    const req = {} as Request;
    const res = {
      locals: { isLegalRepresentative: true },
      render: jest.fn(),
      redirect: jest.fn(),
    } as unknown as Response;

    footerPagesRoutes(app);

    const route = (app.get as jest.Mock).mock.calls.find(([registeredPath]) => registeredPath === path);
    const handler = route[1] as RequestHandler;
    await handler(req, res, jest.fn());

    expect(res.redirect).toHaveBeenCalledWith(`https://manage-case.test${exuiPath}`);
    expect(res.render).not.toHaveBeenCalled();
  });

  it('renders the citizen footer when the user is not a legal representative', async () => {
    const app = buildApp();
    const req = {} as Request;
    const res = { locals: {}, render: jest.fn(), redirect: jest.fn() } as unknown as Response;
    const next = jest.fn();

    (legalRepresentativeHeaderMiddleware as jest.Mock).mockImplementationOnce((_req, response, nextHandler) => {
      response.locals.isLegalRepresentative = false;
      nextHandler();
    });

    footerPagesRoutes(app);

    const middleware = (app.use as jest.Mock).mock.calls[0][1] as RequestHandler;
    middleware(req, res, next);

    const handler = (app.get as jest.Mock).mock.calls[0][1] as RequestHandler;
    await handler(req, res, next);

    expect(res.locals.isLegalRepresentative).toBe(false);
    expect(res.locals.footerModel).toBeUndefined();
    expect(res.render).toHaveBeenCalledWith('footer/accessibility', {
      t: expect.any(Function),
      ns: 'footer/accessibility',
      isLegalRepresentative: false,
    });
  });

  it('redirects to EXUI and sets HMCTS footer locals when legal representative is true', async () => {
    const app = buildApp();
    const req = {} as Request;
    const render = jest.fn();
    const redirect = jest.fn();
    const res = {
      locals: {},
      render,
      redirect,
    } as unknown as Response;
    const next = jest.fn();

    (legalRepresentativeHeaderMiddleware as jest.Mock).mockImplementationOnce((_req, response, nextHandler) => {
      response.locals.isLegalRepresentative = true;
      response.locals.footerModel = legalRepresentativeFooterModel;
      nextHandler();
    });

    footerPagesRoutes(app);

    const middleware = (app.use as jest.Mock).mock.calls[0][1] as RequestHandler;
    middleware(req, res, next);

    const handler = (app.get as jest.Mock).mock.calls[0][1] as RequestHandler;
    await handler(req, res, next);

    expect(redirect).toHaveBeenCalledWith('https://manage-case.test/accessibility');
    expect(render).not.toHaveBeenCalled();

    const html = environment.renderString(
      '{% from "components/pcs-footer.njk" import pcsFooter %}{{ pcsFooter(isLegalRepresentative, footerModel) }}',
      res.locals
    );
    expect(html).toContain('ui-component-lib-footer');
    expect(html).toContain('href="/legal-representative-footer-link"');
  });
});
