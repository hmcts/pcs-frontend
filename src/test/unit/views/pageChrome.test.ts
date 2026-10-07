import * as path from 'path';

import * as nunjucks from 'nunjucks';

import cyCommon from '../../../main/assets/locales/cy/common.json';
import enCommon from '../../../main/assets/locales/en/common.json';

const locales: Record<string, Record<string, unknown>> = { en: enCommon, cy: cyCommon };

function translator(lang: string) {
  return (key: string, fallback?: unknown) => {
    const value = key
      .split('.')
      .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], locales[lang]);
    return typeof value === 'string' ? value : typeof fallback === 'string' ? fallback : key;
  };
}

const env = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.join(__dirname, '..', '..', '..', 'main', 'views'),
    path.dirname(require.resolve('govuk-frontend/package.json')) + '/dist',
    path.resolve(path.dirname(require.resolve('@hmcts-cft/cft-ui-component-lib/nunjucks/xui-header/macro.njk')), '..'),
    path.resolve(path.dirname(require.resolve('@ministryofjustice/frontend/moj/template.njk')), '..'),
  ])
);

function render(template: string, lang: string): string {
  return env.render(template, {
    t: translator(lang),
    lang,
    sessionTimeout: {},
    footerModel: {},
  });
}

describe.each(['template.njk', 'journeyTemplate.njk', 'stepsTemplate.njk'])('%s page chrome', template => {
  it('shows the skip link and footer in Welsh', () => {
    const html = render(template, 'cy');

    expect(html).toContain('Neidio i’r prif gynnwys');
    expect(html).toContain('Drwydded Llywodraeth Agored v3.0');
    expect(html).toContain('© Hawlfraint y Goron');
    expect(html).not.toContain('Skip to main content');
    expect(html).not.toContain('Crown copyright');
  });

  it('keeps the skip link and footer in English', () => {
    const html = render(template, 'en');

    expect(html).toContain('Skip to main content');
    expect(html).toContain('Open Government Licence v3.0');
    expect(html).toContain('© Crown copyright');
  });
});
