import path from 'path';

import nunjucks from 'nunjucks';

const viewsRoot = path.resolve(__dirname, '../../../../main/views');
const govukRoot = path.resolve(path.dirname(require.resolve('govuk-frontend/dist/govuk/template.njk')), '..');
const cftRoot = path.resolve(
  path.dirname(require.resolve('@hmcts-cft/cft-ui-component-lib/nunjucks/xui-header/macro.njk')),
  '..'
);
const mojRoot = path.resolve(path.dirname(require.resolve('@ministryofjustice/frontend/moj/template.njk')), '..');

const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([viewsRoot, govukRoot, cftRoot, mojRoot], { noCache: true }),
  { autoescape: true }
);

function renderLayout(layout: string, enabled: boolean): string {
  return environment.renderString(`{% extends "${layout}" %}`, {
    t: (key: string) => key,
    cspNonce: 'test-nonce',
    tracking: { enabled, gtmContainerId: 'GTM-TEST123' },
    sessionTimeout: {},
    headerModel: {},
    footerModel: {},
  });
}

describe.each(['template.njk', 'stepsTemplate.njk', 'journeyTemplate.njk', 'public-template.njk', 'xui-layout.njk'])(
  '%s',
  layout => {
    it('renders the cookie banner once, straight after the GTM noscript and before the skip link', () => {
      const html = renderLayout(layout, true);
      const banner = html.indexOf('govuk-cookie-banner');

      expect(html.match(/class="govuk-cookie-banner /g)).toHaveLength(1);
      expect(banner).toBeGreaterThan(html.indexOf('googletagmanager.com/ns.html'));
      expect(banner).toBeLessThan(html.indexOf('govuk-skip-link'));
    });

    it('renders no cookie banner or GTM when tracking is disabled', () => {
      const html = renderLayout(layout, false);

      expect(html).not.toContain('govuk-cookie-banner');
      expect(html).not.toContain('googletagmanager');
    });
  }
);
