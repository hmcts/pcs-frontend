import * as path from 'path';

import * as nunjucks from 'nunjucks';

const root = path.resolve(__dirname, '../../../main');
const cftNunjucksRoot = path.resolve(
  path.dirname(require.resolve('@hmcts-cft/cft-ui-component-lib/nunjucks/xui-header/macro.njk')),
  '..'
);
const mojFrontendRoot = path.resolve(
  path.dirname(require.resolve('@ministryofjustice/frontend/moj/template.njk')),
  '..'
);

const env = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.join(root, 'views'),
    path.join(root, 'steps'),
    path.resolve(path.dirname(require.resolve('govuk-frontend/dist/govuk/template.njk')), '..'),
    cftNunjucksRoot,
    mojFrontendRoot,
  ]),
  { autoescape: true }
);
env.addFilter('date', (value: unknown) => value);

const render = (template: string, welshEnabled: boolean) =>
  env.render(template, {
    welshEnabled,
    t: (key: string) => key,
    languageToggle: '<a href="?lang=cy" class="govuk-link language">Cymraeg</a>',
  });

describe.each(['template.njk', 'stepsTemplate.njk', 'journeyTemplate.njk'])('%s language toggle', template => {
  it('shows the toggle when Welsh is enabled', () => {
    expect(render(template, true)).toContain('govuk-language-toggle');
  });

  it('hides the toggle when Welsh is switched off', () => {
    const html = render(template, false);

    expect(html).not.toContain('govuk-language-toggle');
    expect(html).not.toContain('?lang=cy');
  });
});
