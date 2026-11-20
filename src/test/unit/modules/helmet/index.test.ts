import config from 'config';
import type { Request, Response } from 'express';
import helmet from 'helmet';

import { cspNonceMiddleware, securityHeaders } from '@modules/helmet';

jest.mock('config', () => ({
  get: jest.fn(),
}));

jest.mock('helmet', () => jest.fn());

const helmetMock = helmet as unknown as jest.Mock;

type Directive = string | ((req: unknown, res: unknown) => string);
type Directives = Record<string, Directive[]>;

const validConfig: Record<string, string | boolean | undefined> = {
  'pcq.url': 'https://pcq.example.com',
  'oidc.issuer': 'https://idam.example.com/oauth2',
  'redirects.manageCaseReturnURL': 'https://manage.example.com/return',
  'cuiRa.url': 'https://cui-ra.example.com',
};

function useConfig(values: Record<string, string | boolean | undefined>): void {
  (config.get as jest.Mock).mockImplementation((key: string) => values[key]);
}

function helmetDirectives(): Directives {
  const options = helmetMock.mock.calls[0][0];
  return options.contentSecurityPolicy.directives;
}

function stringSources(directive: Directive[]): string[] {
  return directive.filter((source): source is string => typeof source === 'string');
}

describe('cspNonceMiddleware', () => {
  it('gives each response a different base64 nonce', () => {
    const first = { locals: {} } as Response;
    const second = { locals: {} } as Response;
    const next = jest.fn();

    cspNonceMiddleware({} as Request, first, next);
    cspNonceMiddleware({} as Request, second, next);

    expect(first.locals.cspNonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(second.locals.cspNonce).not.toEqual(first.locals.cspNonce);
    expect(next).toHaveBeenCalledTimes(2);
  });
});

describe('securityHeaders', () => {
  beforeEach(() => {
    (helmet as jest.MockedFunction<typeof helmet>).mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sets the nonce before the helmet headers', () => {
    useConfig(validConfig);

    const handlers = securityHeaders(false);

    expect(handlers).toHaveLength(2);
    expect(handlers[0]).toBe(cspNonceMiddleware);
    expect(handlers[1]).toBe(helmetMock.mock.results[0].value);
  });

  it('allows inline scripts carrying the response nonce', () => {
    useConfig(validConfig);
    securityHeaders(false);

    const nonceSource = helmetDirectives().scriptSrc.find(source => typeof source === 'function') as (
      req: unknown,
      res: unknown
    ) => string;

    expect(nonceSource({}, { locals: { cspNonce: 'abc123' } })).toBe("'nonce-abc123'");
  });

  it('allows Google Tag Manager and Google Analytics when tracking is enabled', () => {
    useConfig({ ...validConfig, 'tracking.enabled': true });
    securityHeaders(false);
    const directives = helmetDirectives();

    expect(stringSources(directives.scriptSrc)).toEqual(["'self'", '*.google-analytics.com', '*.googletagmanager.com']);
    expect(directives.imgSrc).toEqual(["'self'", '*.google-analytics.com', '*.googletagmanager.com']);
    expect(directives.connectSrc).toEqual([
      "'self'",
      '*.google-analytics.com',
      '*.googletagmanager.com',
      'www.google.com',
    ]);
    expect(directives.styleSrc).toEqual(["'self'", '*.googletagmanager.com']);
  });

  it.each([false, undefined])('leaves the Google Tag Manager sources out when tracking.enabled is %s', enabled => {
    useConfig({ ...validConfig, 'tracking.enabled': enabled });
    securityHeaders(false);
    const directives = helmetDirectives();

    expect(stringSources(directives.scriptSrc)).toEqual(["'self'", '*.google-analytics.com']);
    expect(directives.imgSrc).toEqual(["'self'", '*.google-analytics.com']);
    expect(directives.connectSrc).toEqual(["'self'"]);
    expect(directives.styleSrc).toEqual(["'self'"]);
  });

  it('adds unsafe-eval and unsafe-inline in development', () => {
    useConfig(validConfig);
    securityHeaders(true);

    expect(stringSources(helmetDirectives().scriptSrc)).toEqual(
      expect.arrayContaining(["'unsafe-eval'", "'unsafe-inline'"])
    );
  });

  it('keeps the rest of the policy', () => {
    useConfig(validConfig);
    securityHeaders(false);

    expect(helmet).toHaveBeenCalledWith(
      expect.objectContaining({
        contentSecurityPolicy: {
          directives: expect.objectContaining({
            defaultSrc: ["'none'"],
            fontSrc: ["'self'", 'data:'],
            objectSrc: ["'self'"],
            manifestSrc: ["'self'"],
            formAction: [
              "'self'",
              'https://pcq.example.com',
              'https://idam.example.com',
              'https://manage.example.com',
              'https://cui-ra.example.com',
            ],
          }),
        },
        referrerPolicy: { policy: 'origin' },
      })
    );
  });

  it.each([true, false])('leaves PCQ out of form-action when it has no URL (development: %s)', developmentMode => {
    useConfig({ ...validConfig, 'pcq.url': '' });
    securityHeaders(developmentMode);

    expect(helmetDirectives().formAction).toEqual([
      "'self'",
      'https://idam.example.com',
      'https://manage.example.com',
      'https://cui-ra.example.com',
    ]);
  });

  it.each(['oidc.issuer', 'redirects.manageCaseReturnURL', 'cuiRa.url'])('throws when %s is missing', key => {
    useConfig({ ...validConfig, [key]: undefined });

    expect(() => securityHeaders(false)).toThrow('Invalid URL');
  });

  it('throws when the IDAM issuer is malformed', () => {
    useConfig({ ...validConfig, 'oidc.issuer': 'not-a-valid-url' });

    expect(() => securityHeaders(false)).toThrow();
  });
});
