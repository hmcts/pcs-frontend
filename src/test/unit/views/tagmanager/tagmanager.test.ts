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

function render(template: string, tracking?: typeof enabled, cspNonce = 'test-nonce-123'): string {
  return environment.render(template, { t, cspNonce, tracking });
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
});

describe('tagmanager/body.njk', () => {
  it('renders the Google Tag Manager noscript fallback', () => {
    expect(render('tagmanager/body.njk', enabled)).toContain(
      '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TEST123"'
    );
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

  it('leaves out the View cookies link, as the ticket asks', () => {
    const html = render('cookies-banner.njk', enabled);

    expect(html).not.toContain('href="/cookies"');
    expect(html).not.toContain('viewCookies');
  });
});
