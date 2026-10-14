import * as path from 'path';

import * as nunjucks from 'nunjucks';

import cyCommon from '../../../main/assets/locales/cy/common.json';

const env = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.join(__dirname, '..', '..', '..', 'main', 'views'),
    path.dirname(require.resolve('govuk-frontend/package.json')) + '/dist',
  ])
);

const welsh = (key: string, fallback?: unknown): string => {
  const value = key
    .replace(/^common:/, '')
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], cyCommon);
  return typeof value === 'string' ? value : typeof fallback === 'string' ? fallback : key;
};

function render(errors: Record<string, { message: string }> = {}): string {
  return env.render('components/addressLookup.njk', {
    t: welsh,
    fieldConfig: { namePrefix: 'address' },
    errors,
  });
}

describe('shared address lookup component in Welsh', () => {
  it('gives the address finder its Welsh result messages', () => {
    const html = render();

    expect(html).toContain(`data-one-address-found="${cyCommon.addressLookup.oneFound}"`);
    expect(html).toContain(`data-many-addresses-found="${cyCommon.addressLookup.manyFound}"`);
    expect(html).toContain(`data-no-addresses-found="${cyCommon.addressLookup.noneFound}"`);
  });

  it('prefixes field errors with the Welsh error word', () => {
    const html = render({
      'address-addressLine1': { message: 'Line 1 error' },
      'address-town': { message: 'Town error' },
      'address-postcode': { message: 'Postcode error' },
    });

    expect(html.match(/govuk-visually-hidden">Gwall:/g)).toHaveLength(3);
    expect(html).not.toContain('visually-hidden">Error:');
  });
});
