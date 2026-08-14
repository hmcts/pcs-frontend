#!/usr/bin/env node
/**
 * Thorough Welsh (cy) locale audit. Read-only — changes nothing.
 *
 * Checks:
 *   1. Every cy/*.json parses as valid JSON
 *   2. en vs cy key parity (keys missing in cy, extra keys in cy)
 *   3. Remaining untranslated "cy"-prefixed placeholder values
 *   4. For each remaining placeholder: does a translation actually exist in any
 *      provided source? (temp/translated.csv + temp/apply-welsh-translations.js)
 *      -> anything found here is a FIXABLE MISS (should be 0)
 *   5. Values still identical to English (untranslated, no prefix)
 *   6. Stray artifacts: leftover "cy"-prefixes mid-string, malformed anchor tags
 *
 * Usage: node scripts/audit-welsh.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EN = path.join(ROOT, 'src/main/assets/locales/en');
const CY = path.join(ROOT, 'src/main/assets/locales/cy');
const CSV = path.join(ROOT, 'temp/translated.csv');
const APPLY_JS = path.join(ROOT, 'temp/apply-welsh-translations.js');

let FAIL = 0;
const section = t => console.log('\n' + '='.repeat(72) + '\n' + t + '\n' + '='.repeat(72));
const ok = m => console.log('  ✓ ' + m);
const bad = m => {
  console.log('  ✗ ' + m);
  FAIL++;
};

function walk(dir) {
  let out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (f.endsWith('.json')) out.push(p);
  }
  return out;
}
function flat(o, p = '', out = {}) {
  for (const k in o) {
    const v = o[k];
    const key = p ? p + '.' + k : k;
    if (v && typeof v === 'object') flat(v, key, out);
    else out[key] = v;
  }
  return out;
}
const norm = s =>
  String(s)
    .replace(/[‘’′`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[  ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ---------- 1. JSON validity ----------
section('1. JSON validity (cy)');
const cyFiles = walk(CY);
const parsed = {};
for (const f of cyFiles) {
  const rel = path.relative(CY, f);
  try {
    parsed[rel] = JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    bad(`${rel}: ${e.message}`);
  }
}
if (Object.keys(parsed).length === cyFiles.length) ok(`All ${cyFiles.length} cy JSON files valid`);

// ---------- 2. key parity en vs cy ----------
section('2. Key parity (en vs cy)');
let missingKeys = 0,
  extraKeys = 0,
  missingFiles = 0;
for (const ef of walk(EN)) {
  const rel = path.relative(EN, ef);
  const cf = path.join(CY, rel);
  if (!fs.existsSync(cf)) {
    bad(`cy file missing: ${rel}`);
    missingFiles++;
    continue;
  }
  const en = flat(JSON.parse(fs.readFileSync(ef, 'utf8')));
  const cy = flat(parsed[rel] || {});
  for (const k in en)
    if (!(k in cy)) {
      missingKeys++;
      if (missingKeys <= 25) console.log(`    missing in cy: ${rel} -> ${k}`);
    }
  for (const k in cy)
    if (!(k in en)) {
      extraKeys++;
      if (extraKeys <= 25) console.log(`    extra in cy:   ${rel} -> ${k}`);
    }
}
missingFiles === 0 && ok('No cy files missing');
missingKeys === 0 ? ok('No keys missing in cy') : bad(`${missingKeys} keys present in en but missing in cy`);
extraKeys === 0
  ? ok('No orphan keys in cy')
  : bad(`${extraKeys} keys in cy not present in en (possible key-name mismatch)`);

// ---------- build dictionary from provided sources ----------
function parseCsv(text) {
  const rows = [];
  let row = [],
    f = '',
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(f);
      f = '';
    } else if (c === '\n') {
      row.push(f);
      rows.push(row);
      row = [];
      f = '';
    } else if (c !== '\r') f += c;
  }
  if (f.length || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows;
}
const dict = new Set();
for (const r of parseCsv(fs.readFileSync(CSV, 'utf8')).slice(1)) if (r.length >= 4 && r[3]) dict.add(norm(r[2]));
try {
  const js = fs.readFileSync(APPLY_JS, 'utf8');
  const s = js.indexOf('const TRANSLATIONS =');
  let i = js.indexOf('{', s),
    depth = 0,
    inStr = false,
    q = '',
    esc = false,
    end = -1;
  for (; i < js.length; i++) {
    const c = js[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === q) inStr = false;
    } else if (c === '"' || c === "'") {
      inStr = true;
      q = c;
    } else if (c === '{') depth++;
    else if (c === '}') {
      if (--depth === 0) {
        end = i;
        break;
      }
    }
  }
  const obj = Function('return (' + js.slice(js.indexOf('{', s), end + 1) + ')')();
  for (const pairs of Object.values(obj)) for (const [en, cy] of pairs) if (cy) dict.add(norm(en));
} catch (e) {
  console.log('    (could not load apply.js dict: ' + e.message + ')');
}

// ---------- 3 & 4. remaining placeholders + fixable misses ----------
section('3. Remaining untranslated ("cy"-prefixed) placeholders');
const placeholders = [];
for (const rel in parsed) {
  const fl = flat(parsed[rel]);
  for (const k in fl)
    if (typeof fl[k] === 'string' && /^cy(?: [A-Za-z]|[A-Z])/.test(fl[k]))
      placeholders.push({ rel, k, english: fl[k].slice(2) });
}
console.log(`  Remaining placeholders: ${placeholders.length}`);

section('4. Fixable misses (placeholder that HAS a translation in a source)');
const misses = placeholders.filter(p => dict.has(norm(p.english)));
misses.length === 0
  ? ok('0 fixable misses — every remaining placeholder has NO translation in any provided source')
  : bad(`${misses.length} placeholders could still be translated:`);
misses.slice(0, 30).forEach(m => console.log(`    ${m.rel} -> ${m.k}`));

// ---------- 5. identical-to-english (untranslated, no prefix) ----------
section('5. Values identical to English (excluding legitimately-identical)');
let identical = 0;
for (const ef of walk(EN)) {
  const rel = path.relative(EN, ef);
  if (!parsed[rel]) continue;
  const en = flat(JSON.parse(fs.readFileSync(ef, 'utf8')));
  const cy = flat(parsed[rel]);
  for (const k in en) {
    if (typeof en[k] !== 'string') continue;
    const ev = en[k],
      cv = cy[k];
    if (
      cv === ev &&
      ev.trim() !== '' &&
      !/^[\d\s.,:£%\/#-]+$/.test(ev) &&
      !/currency|{{.*}}|<a |DOC|XLS|PPT|PDF|RTF|TXT|CSV|JPG|PNG|BMP|TIF|ALPHA|^Mr$|^Ms$|^Miss$|^Mrs$/.test(ev)
    ) {
      identical++;
      if (identical <= 20) console.log(`    ${rel} -> ${k}: "${ev.slice(0, 60)}"`);
    }
  }
}
identical === 0
  ? ok('No suspicious identical values')
  : console.log(`  (${identical} identical values — review manually; many may be intentional)`);

// ---------- 6. stray artifacts ----------
section('6. Stray artifacts (mid-string "cy" prefixes, malformed anchors)');
let artifacts = 0;
for (const rel in parsed) {
  const fl = flat(parsed[rel]);
  for (const k in fl) {
    const v = fl[k];
    if (typeof v !== 'string') continue;
    if (/^cy[A-Z]/.test(v)) continue; // pure placeholder — already counted in check 3
    if (/>cy[A-Z]/.test(v) || /\bcyMae|\bcyThis|\bcyThe\b/.test(v)) {
      artifacts++;
      console.log(`    prefix-in-string: ${rel} -> ${k}`);
    }
    if (/<a [^>]*[^>]$|<\/a[^>]|Saesneg\/a>|[^"']>\s*<\/a>/.test(v) && /<a /.test(v)) {
      // crude malformed-anchor heuristic
      const opens = (v.match(/<a /g) || []).length,
        closes = (v.match(/<\/a>/g) || []).length;
      if (opens !== closes) {
        artifacts++;
        console.log(`    unbalanced <a>: ${rel} -> ${k}`);
      }
    }
  }
}
artifacts === 0 ? ok('No stray artifacts found') : bad(`${artifacts} artifact(s) found`);

// ---------- summary ----------
section('SUMMARY');
console.log(`  cy files:                 ${cyFiles.length}`);
console.log(`  keys missing in cy:       ${missingKeys}`);
console.log(`  orphan keys in cy:        ${extraKeys}`);
console.log(`  remaining placeholders:   ${placeholders.length}`);
console.log(`  fixable misses:           ${misses.length}`);
console.log(`  suspicious identical:     ${identical}`);
console.log(`  stray artifacts:          ${artifacts}`);
console.log(
  '\n' +
    (FAIL === 0
      ? '  RESULT: PASS ✓  (nothing more auto-translatable from provided sources)'
      : `  RESULT: ${FAIL} check(s) need attention ✗`)
);
process.exit(FAIL === 0 ? 0 : 1);
