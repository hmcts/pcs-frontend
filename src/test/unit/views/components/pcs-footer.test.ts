import path from 'path';

import nunjucks from 'nunjucks';

const viewsRoot = path.resolve(__dirname, '../../../../main/views');
const govukTemplatePath = require.resolve('govuk-frontend/dist/govuk/template.njk');
const govukRoot = path.resolve(path.dirname(govukTemplatePath), '..');
const cftMacroPath = path.dirname(require.resolve('@hmcts-cft/cft-ui-component-lib/nunjucks/xui-header/macro.njk'));
const cftRoot = path.resolve(cftMacroPath, '..');

const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([viewsRoot, govukRoot, cftRoot], { noCache: true }),
  { autoescape: true }
);

const footerTemplate = `
  {% from "components/pcs-footer.njk" import pcsFooter %}
  {{ pcsFooter(isLegalRepresentative, footerModel) }}
`;

const legalRepresentativeFooterModel = {
  navigation: {
    items: [{ text: 'Legal representative footer link', href: '/legal-representative-footer-link' }],
  },
  copyright: {
    text: 'Crown copyright',
    href: 'https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/',
  },
  openInNewWindowText: 'Opens in a new window',
};

const citizenFooterLinks = ['/accessibility', '/cookies', '/privacy-policy', '/terms-and-conditions', '/get-help'];

function renderFooter(isLegalRepresentative: boolean): string {
  return environment.renderString(footerTemplate, {
    isLegalRepresentative,
    footerModel: legalRepresentativeFooterModel,
  });
}

describe('pcs footer', () => {
  it('displays the HMCTS footer when legal representative is true', () => {
    const html = renderFooter(true);

    expect(html).toContain('ui-component-lib-footer');
    expect(html).toContain('Legal representative footer link');
    expect(html).toContain('href="/legal-representative-footer-link"');
  });

  it('displays the citizen footer links when legal representative is false', () => {
    const html = renderFooter(false);

    citizenFooterLinks.forEach(link => {
      expect(html).toContain(`href="${link}"`);
    });
    expect(html).not.toContain('ui-component-lib-footer');
  });

  it('uses the translated content licence text in the citizen footer', () => {
    const html = environment.renderString(
      '{% from "components/pcs-footer.njk" import pcsFooter %}{{ pcsFooter(false, footerModel, licence) }}',
      { footerModel: legalRepresentativeFooterModel, licence: '<a href="/licence">Translated licence</a> text' }
    );

    expect(html).toContain('<a href="/licence">Translated licence</a> text');
    expect(html).not.toContain('All content is available under the');
  });

  it('falls back to the GOV.UK content licence text when none is passed', () => {
    const html = renderFooter(false);

    expect(html).toContain('All content is available under the');
  });
});
