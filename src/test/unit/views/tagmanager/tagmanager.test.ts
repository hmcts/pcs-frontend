import path from 'path';

import nunjucks from 'nunjucks';

const viewsRoot = path.resolve(__dirname, '../../../../main/views');
const govukRoot = path.resolve(path.dirname(require.resolve('govuk-frontend/dist/govuk/template.njk')), '..');

const environment = new nunjucks.Environment(new nunjucks.FileSystemLoader([viewsRoot, govukRoot], { noCache: true }), {
  autoescape: true,
});

const t = (key: string): string => `t(${key})`;
const enabled = { enabled: true, gtmContainerId: 'GTM-TEST123' };
const disabled = { ...enabled, enabled: false };

function render(
  template: string,
  tracking?: typeof enabled,
  cspNonce = 'test-nonce-123',
  analyticsConsent = true
): string {
  return environment.render(template, { t, cspNonce, tracking, analyticsConsent });
}

describe.each(['tagmanager/head.njk', 'tagmanager/body.njk', 'cookies-banner.njk'])('%s', template => {
  it('renders nothing when tracking is disabled', () => {
    expect(render(template, disabled).trim()).toBe('');
    expect(render(template).trim()).toBe('');
  });
});

describe('tagmanager/head.njk', () => {
  it('loads Google Tag Manager with the container ID and the CSP nonce', () => {
    const html = render('tagmanager/head.njk', enabled);

    expect(html).toContain('<script nonce="test-nonce-123">');
    expect(html).toContain('https://www.googletagmanager.com/gtm.js?id=');
    expect(html).toContain('\'dataLayer\',"GTM-TEST123")');
  });

  it('leaves the nonce off when there is none', () => {
    expect(render('tagmanager/head.njk', enabled, '')).toContain('<script>');
  });

  it('loads Google Tag Manager straight away once the user has accepted analytics cookies', () => {
    expect(render('tagmanager/head.njk', enabled)).toContain('window.loadGoogleTagManager();');
  });

  it('only defines the loader, without calling it, before the user accepts analytics cookies', () => {
    const html = render('tagmanager/head.njk', enabled, 'test-nonce-123', false);

    expect(html).toContain('window.loadGoogleTagManager=function(){');
    expect(html).not.toContain('window.loadGoogleTagManager();');
  });

  it('loads the container once, however often the loader is called', () => {
    const script = render('tagmanager/head.njk', enabled, 'test-nonce-123', false).match(
      /<script[^>]*>([\s\S]*?)<\/script>/
    )?.[1];
    const inserted: { src: string }[] = [];
    const element = { setAttribute: jest.fn() } as unknown as { src: string };
    const fakeWindow: Record<string, unknown> = {};
    const fakeDocument = {
      getElementsByTagName: () => [{ parentNode: { insertBefore: (el: { src: string }) => inserted.push(el) } }],
      createElement: () => ({ ...element }),
      querySelector: () => null,
    };

    new Function('window', 'document', script as string)(fakeWindow, fakeDocument);
    (fakeWindow.loadGoogleTagManager as () => void)();
    (fakeWindow.loadGoogleTagManager as () => void)();

    expect(inserted).toHaveLength(1);
    expect(inserted[0].src).toBe('https://www.googletagmanager.com/gtm.js?id=GTM-TEST123');
  });
});

describe('tagmanager/body.njk', () => {
  it('renders the Google Tag Manager noscript fallback once the user has accepted analytics cookies', () => {
    expect(render('tagmanager/body.njk', enabled)).toContain(
      '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TEST123"'
    );
  });

  it('renders nothing before the user accepts analytics cookies', () => {
    expect(render('tagmanager/body.njk', enabled, 'test-nonce-123', false).trim()).toBe('');
  });
});

describe('cookies-banner.njk', () => {
  it('renders a hidden cookie banner with the classes @hmcts/cookie-manager expects', () => {
    const html = render('cookies-banner.njk', enabled);

    expect(html).toMatch(/class="govuk-cookie-banner cookie-banner"[^>]*hidden/);
    for (const className of [
      'cookie-banner-message',
      'cookie-banner-accept-button',
      'cookie-banner-reject-button',
      'cookie-banner-accept-message',
      'cookie-banner-reject-message',
      'cookie-banner-hide-button',
    ]) {
      expect(html).toContain(className);
    }
    expect(html).toContain('t(cookieBanner.buttons.accept)');
    expect(html).toContain('t(cookieBanner.buttons.hide)');
  });

  it('links to the cookies page from the banner and the confirmation messages', () => {
    const html = render('cookies-banner.njk', enabled);

    expect(html).toContain('t(cookieBanner.buttons.viewCookies)');
    expect(html).toContain('href="/cookies"');
    expect(html.match(/t\(cookieBanner\.message\.changeSettings\)/g)).toHaveLength(2);
  });
});
