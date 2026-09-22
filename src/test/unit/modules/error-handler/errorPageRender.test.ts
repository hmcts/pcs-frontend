import * as path from 'path';

import * as nunjucks from 'nunjucks';

/**
 * The error page is the one template that can be rendered for a request which
 * never reached the i18n middleware — body-parser failures are raised before it
 * — so it must not depend on anything that middleware sets up.
 *
 * The search paths mirror the deployed layout: webpack copies govuk-frontend's
 * templates into views/govuk, which has not happened in an unbuilt checkout, so
 * the govuk dist directory stands in for it here.
 */
describe('error page rendering', () => {
  let env: nunjucks.Environment;

  beforeAll(() => {
    const govukDist = path.dirname(require.resolve('govuk-frontend/dist/govuk/template.njk'));
    const cftNunjucks = path.dirname(require.resolve('@hmcts-cft/cft-ui-component-lib/nunjucks/xui-header/macro.njk'));
    const mojFrontend = path.dirname(require.resolve('@ministryofjustice/frontend/moj/template.njk'));
    env = new nunjucks.Environment(
      new nunjucks.FileSystemLoader([
        path.join(process.cwd(), 'src/main/views'),
        path.join(process.cwd(), 'src/main/steps'),
        path.resolve(govukDist, '..'),
        path.resolve(cftNunjucks, '..'),
        path.resolve(mojFrontend, '..'),
      ]),
      { autoescape: true }
    );
    env.addGlobal('govukRebrand', true);
  });

  const render = (locals: Record<string, unknown>): string =>
    env.render('error.njk', { errorPageKey: 'technicalError', message: 'boom', error: {}, ...locals });

  it('renders when t and lang are supplied', () => {
    expect(render({ t: (key: string) => key, lang: 'en' })).toContain('errorPages.technicalError.title');
  });

  it('fails without t, so the error handler must populate it', () => {
    expect(() => render({ lang: 'en' })).toThrow(/Unable to call/);
  });
});
