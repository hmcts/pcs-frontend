import * as fs from 'fs';
import * as path from 'path';

import * as nunjucks from 'nunjucks';

const resolveRoot = (file: string, levelsUp = 1) =>
  path.resolve(path.dirname(require.resolve(file)), ...Array(levelsUp).fill('..'));

const mainRoot = path.resolve(__dirname, '../../../main');

// The same search paths as the Nunjucks module, plus govuk-frontend for govuk/template.njk.
const createViewEnv = (): nunjucks.Environment => {
  const env = new nunjucks.Environment(
    new nunjucks.FileSystemLoader([
      path.join(mainRoot, 'views'),
      path.join(mainRoot, 'steps'),
      resolveRoot('govuk-frontend/dist/govuk/template.njk'),
      resolveRoot('@hmcts-cft/cft-ui-component-lib/nunjucks/xui-header/macro.njk'),
      resolveRoot('@ministryofjustice/frontend/moj/template.njk'),
    ]),
    { autoescape: true }
  );
  env.addFilter('date', (value: unknown) => value);
  return env;
};

const env = createViewEnv();

const renderLayout = (template: string, welshEnabled: boolean) =>
  env.render(template, {
    welshEnabled,
    t: (key: string) => key,
    languageToggle: '<a href="?lang=cy" class="govuk-link language">Cymraeg</a>',
  });

describe.each(['template.njk', 'stepsTemplate.njk', 'journeyTemplate.njk'])('%s language toggle', template => {
  it('shows the toggle when Welsh is enabled', () => {
    expect(renderLayout(template, true)).toContain('govuk-language-toggle');
  });

  it('hides the toggle when Welsh is switched off', () => {
    const html = renderLayout(template, false);

    expect(html).not.toContain('govuk-language-toggle');
    expect(html).not.toContain('?lang=cy');
  });
});

const readLocale = (lang: string, file: string) =>
  JSON.parse(fs.readFileSync(path.join(mainRoot, 'assets/locales', lang, file), 'utf8'));

// Legal-rep content is the citizen file with the legal-rep file merged over it, as at runtime.
const content = (lang: string, isLegalRepresentative: boolean) => ({
  ...readLocale(lang, 'respondToClaim/startNow.json'),
  ...(isLegalRepresentative ? readLocale(lang, 'respondToClaim/legalrep/startNow.json') : {}),
});

const render = (isLegalRepresentative: boolean, welshEnabled = true) =>
  env
    .render('respond-to-claim/start-now/startNow.njk', {
      ...content('en', isLegalRepresentative),
      isLegalRepresentative,
      welshEnabled,
      t: (key: string) => key,
    })
    .replace(/\s+/g, ' ');

const WELSH_SENTENCE =
  'This service is also available <a href="?lang=cy" class="govuk-link language">in Welsh (Cymraeg)</a>.';

describe('respond-to-claim start page', () => {
  it('tells a citizen the service is available in Welsh, in its own paragraph after the fee text', () => {
    const html = render(false);

    expect(html).toContain(
      `within 14 days of receiving the claim pack in the post.</p> <p class="govuk-body">${WELSH_SENTENCE}</p>`
    );
    expect(html.split(WELSH_SENTENCE)).toHaveLength(2);
    expect(html).toContain('You’ll be asked to provide or confirm details, such as:');
  });

  it('tells a legal representative the service is available in Welsh, without the citizen details line', () => {
    const html = render(true);

    expect(html.split(WELSH_SENTENCE)).toHaveLength(2);
    expect(html).not.toContain('provide or confirm details');
  });

  it.each([
    ['a citizen', false],
    ['a legal representative', true],
  ])('does not tell %s the service is available in Welsh when Welsh is switched off', (_who, isLegalRepresentative) => {
    const html = render(isLegalRepresentative, false);

    expect(html).not.toContain('Welsh (Cymraeg)');
    expect(html).not.toContain('?lang=cy');
  });

  it.each(['en', 'cy'])('keeps the citizen and legal-rep %s files in step', lang => {
    expect(readLocale(lang, 'respondToClaim/legalrep/startNow.json').provideDetailsInfo).toBe('');
    expect(readLocale(lang, 'respondToClaim/startNow.json').description).not.toContain('<p');
  });
});
