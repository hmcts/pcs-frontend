import * as fs from 'fs';
import * as path from 'path';

// Welsh copy uses the typographic apostrophe (i’r, mae’n) and ‘…’ quotation marks. A straight ' between
// two letters is always a typing slip; straight quotes are only valid inside HTML attributes.
const localesDir = path.join(__dirname, '..', '..', '..', '..', 'main', 'assets', 'locales', 'cy');
const STRAIGHT_IN_WORD = /[A-Za-zÀ-ÿŵŷŴŶ]'[A-Za-zÀ-ÿŵŷŴŶ]/;

function jsonFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? jsonFiles(full) : entry.name.endsWith('.json') ? [full] : [];
  });
}

function strings(value: unknown, key = ''): [string, string][] {
  if (typeof value === 'string') {
    return [[key, value]];
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => strings(v, key ? `${key}.${k}` : k));
  }
  return [];
}

describe('Welsh apostrophes', () => {
  it('uses ’ rather than a straight apostrophe inside words', () => {
    const offenders = jsonFiles(localesDir).flatMap(file =>
      strings(JSON.parse(fs.readFileSync(file, 'utf8')))
        .filter(([, text]) => STRAIGHT_IN_WORD.test(text))
        .map(([key]) => `${path.relative(localesDir, file)}: ${key}`)
    );

    expect(offenders).toEqual([]);
  });
});
