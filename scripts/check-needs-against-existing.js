#!/usr/bin/env node
/**
 * Cross-references welsh-needs-translation.csv against EVERY already-translated
 * string in the repo (both previous tranches) — i.e. all en->cy key pairs where
 * the cy value is a real translation (not a "cy" placeholder).
 *
 * For each needs string it reports whether the same English text already has a
 * Welsh translation somewhere (exact match, or case-insensitive match — the
 * "Your name" vs "your name" reuse case).
 *
 * Output: scripts/needs-existing-matches.csv  (only the ones with a match)
 * Usage: node scripts/check-needs-against-existing.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const EN = path.join(ROOT, 'src/main/assets/locales/en');
const CY = path.join(ROOT, 'src/main/assets/locales/cy');

const norm = s =>
  String(s)
    .replace(/[‘’′`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[  ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const stripPrefixes = s => s.replace(/(^|>)(\s*)cy ?(?=[A-Za-z<])/g, '$1$2');
const isPlaceholder = (cyVal, enVal) => {
  const st = stripPrefixes(cyVal);
  return st !== cyVal && enVal !== undefined && norm(st) === norm(enVal);
};

function walk(d) {
  let o = [];
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) o = o.concat(walk(p));
    else if (f.endsWith('.json')) o.push(p);
  }
  return o;
}
function flat(o, p, out) {
  for (const k in o) {
    const v = o[k];
    const key = p ? p + '.' + k : k;
    if (v && typeof v === 'object') flat(v, key, out);
    else out[key] = v;
  }
  return out;
}
function parseCsv(t) {
  const r = [];
  let row = [],
    f = '',
    q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') {
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
      r.push(row);
      row = [];
      f = '';
    } else if (c !== '\r') f += c;
  }
  if (f.length || row.length) {
    row.push(f);
    r.push(row);
  }
  return r;
}

// Build dictionary of EXISTING translations (both tranches) from the live repo.
const exact = new Map(); // norm(en) -> {welsh, file, key}
const ci = new Map(); // norm(en).toLowerCase() -> {welsh, en, file, key}
for (const cf of walk(CY)) {
  const rel = path.relative(CY, cf);
  const ef = path.join(EN, rel);
  if (!fs.existsSync(ef)) continue;
  const en = flat(JSON.parse(fs.readFileSync(ef, 'utf8')), '', {});
  const cy = flat(JSON.parse(fs.readFileSync(cf, 'utf8')), '', {});
  for (const key of Object.keys(cy)) {
    const cv = cy[key],
      ev = en[key];
    if (typeof cv !== 'string' || typeof ev !== 'string') continue;
    if (isPlaceholder(cv, ev)) continue; // skip untranslated placeholders
    if (norm(cv) === norm(ev)) continue; // skip identical (untranslated, no prefix)
    const ne = norm(ev);
    if (ne && !exact.has(ne)) exact.set(ne, { welsh: cv, file: rel, key });
    const lc = ne.toLowerCase();
    if (lc && !ci.has(lc)) ci.set(lc, { welsh: cv, en: ne, file: rel, key });
  }
}

const needs = parseCsv(fs.readFileSync(path.join(__dirname, 'welsh-needs-translation.csv'), 'utf8'))
  .slice(1)
  .filter(r => r.length >= 3);

const matches = [];
for (const [file, key, english] of needs) {
  const ne = norm(english);
  let hit = null,
    how = null;
  if (exact.has(ne)) {
    hit = exact.get(ne);
    how = 'exact';
  } else if (ci.has(ne.toLowerCase())) {
    hit = ci.get(ne.toLowerCase());
    how = 'case-insensitive';
  }
  if (hit) matches.push([file, key, english, hit.welsh, how, `${hit.file}:${hit.key}`]);
}

const esc = s => `"${String(s).replace(/"/g, '""')}"`;
fs.writeFileSync(
  path.join(__dirname, 'needs-existing-matches.csv'),
  [
    'NeedsFile,NeedsKey,English,ExistingWelsh,MatchType,ExistingLocation',
    ...matches.map(r => r.map(esc).join(',')),
  ].join('\n') + '\n'
);

console.log(`Needs strings checked:                 ${needs.length}`);
console.log(`Distinct existing translations known:  ${exact.size}`);
console.log(`Needs strings that ALREADY have a Welsh translation elsewhere: ${matches.length}`);
const exactN = matches.filter(m => m[4] === 'exact').length;
console.log(`   exact matches:            ${exactN}`);
console.log(`   case-insensitive matches: ${matches.length - exactN}`);
console.log(`\nWritten: scripts/needs-existing-matches.csv`);
