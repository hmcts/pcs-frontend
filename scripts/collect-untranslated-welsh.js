#!/usr/bin/env node
/**
 * Collects every Welsh (cy) locale string still carrying the temporary "cy"
 * placeholder prefix (i.e. never translated — shown in the UI as "cyEnglish text").
 *
 * Detection is authoritative: a value is an untranslated placeholder when
 * stripping the "cy" prefix(es) yields exactly the matching English value. This
 * catches every variant — "cyView claim", "cy Your account" (space),
 * "cyevidence" (lowercase), and HTML-embedded "<p>cyImportant..." — with no
 * false positives on real Welsh words like "cyfeiriad" / "cymorth" (their
 * stripped form never equals the English).
 *
 * A regex fallback covers the rare key that has no English counterpart.
 *
 * Output: scripts/untranslated-welsh.csv (file,key,englishText) + stdout summary.
 * Usage: node scripts/collect-untranslated-welsh.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CY_ROOT = path.join(ROOT, 'src/main/assets/locales/cy');
const EN_ROOT = path.join(ROOT, 'src/main/assets/locales/en');

// Remove a "cy" placeholder prefix at value start OR after an HTML tag.
// The prefix precedes English text ("cyView", "cy Your"), or an HTML tag when
// the string opens with markup ("cy<a href=...>Read guidance</a>").
const stripPrefixes = s => s.replace(/(^|>)(\s*)cy ?(?=[A-Za-z<])/g, '$1$2');
// Fallback regex when there is no English counterpart to compare against.
const PLACEHOLDER = /(^|>)\s*cy(?: [A-Za-z]|[A-Z]|<)/;
const norm = s =>
  String(s)
    .replace(/[‘’′`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[  ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function walk(dir) {
  let out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (f.endsWith('.json')) out.push(p);
  }
  return out;
}
function flat(o, keyPrefix, out) {
  for (const k of Object.keys(o)) {
    const v = o[k];
    const key = keyPrefix ? `${keyPrefix}.${k}` : k;
    if (v && typeof v === 'object') flat(v, key, out);
    else out[key] = v;
  }
  return out;
}

const rows = [];
const perFile = {};
for (const file of walk(CY_ROOT)) {
  const rel = path.relative(ROOT, file);
  const enFile = path.join(EN_ROOT, path.relative(CY_ROOT, file));
  const en = fs.existsSync(enFile) ? flat(JSON.parse(fs.readFileSync(enFile, 'utf8')), '', {}) : {};
  const cy = flat(JSON.parse(fs.readFileSync(file, 'utf8')), '', {});
  const before = rows.length;
  for (const key of Object.keys(cy)) {
    const v = cy[key];
    if (typeof v !== 'string') continue;
    const stripped = stripPrefixes(v);
    let isPlaceholder = false,
      english = null;
    if (stripped !== v) {
      const enVal = en[key];
      if (enVal !== undefined && norm(stripped) === norm(enVal)) {
        isPlaceholder = true;
        english = enVal;
      } else if (PLACEHOLDER.test(v)) {
        isPlaceholder = true;
        english = stripped;
      } // fallback
    }
    if (isPlaceholder) rows.push({ file: rel, key, english });
  }
  const count = rows.length - before;
  if (count) perFile[rel] = count;
}

const csvEscape = s => `"${String(s).replace(/"/g, '""')}"`;
const csv = ['file,key,englishText', ...rows.map(r => [r.file, r.key, r.english].map(csvEscape).join(','))].join('\n');
fs.writeFileSync(path.join(__dirname, 'untranslated-welsh.csv'), csv + '\n');

console.log(`Total untranslated (cy-prefixed) strings: ${rows.length}`);
console.log(`Files affected: ${Object.keys(perFile).length}`);
console.log('\nPer file:');
Object.entries(perFile)
  .sort((a, b) => b[1] - a[1])
  .forEach(([f, c]) => console.log(`${String(c).padStart(4)}  ${f}`));
console.log('\nWritten: scripts/untranslated-welsh.csv');
