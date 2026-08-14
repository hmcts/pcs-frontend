#!/usr/bin/env node
// Finds remaining "needs translation" strings that differ from an existing
// translation ONLY by case (e.g. "Your name" vs "your name") — the reuse bug
// Ankita described. Read-only report.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

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
const norm = s =>
  String(s)
    .replace(/[‘’′`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[  ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const ci = s => norm(s).toLowerCase();

const dict = new Map(); // ci(en) -> {welsh, en}
const add = (en, cy) => {
  if (!cy) return;
  const k = ci(en);
  if (!dict.has(k)) dict.set(k, { welsh: cy, en: norm(en) });
};

for (const r of parseCsv(fs.readFileSync(path.join(ROOT, 'temp/translated.csv'), 'utf8')).slice(1))
  if (r.length >= 4) add(r[2], r[3]);

const js = fs.readFileSync(path.join(ROOT, 'temp/apply-welsh-translations.js'), 'utf8');
const s = js.indexOf('const TRANSLATIONS =');
let i = js.indexOf('{', s),
  d = 0,
  inS = false,
  q = '',
  esc = false,
  end = -1;
for (; i < js.length; i++) {
  const c = js[i];
  if (inS) {
    if (esc) esc = false;
    else if (c === '\\') esc = true;
    else if (c === q) inS = false;
  } else if (c === '"' || c === "'") {
    inS = true;
    q = c;
  } else if (c === '{') d++;
  else if (c === '}') {
    if (--d === 0) {
      end = i;
      break;
    }
  }
}
const obj = Function('return (' + js.slice(js.indexOf('{', s), end + 1) + ')')();
for (const pairs of Object.values(obj)) for (const [en, cy] of pairs) add(en, cy);

const needs = parseCsv(fs.readFileSync(path.join(ROOT, 'scripts/welsh-needs-translation.csv'), 'utf8'))
  .slice(1)
  .filter(r => r.length >= 3);

const caseOnly = [];
for (const [file, key, en] of needs) {
  const hit = dict.get(ci(en));
  if (hit && hit.en !== norm(en)) caseOnly.push([file, key, en, hit.en, hit.welsh]);
}

console.log('Remaining needs-translation strings:', needs.length);
console.log('Case-only reusable matches:', caseOnly.length);
console.log('');
caseOnly.forEach(r => {
  console.log(`${r[0]} :: ${r[1]}`);
  console.log(`   UI English:   "${r[2]}"`);
  console.log(`   dict English: "${r[3]}"  =>  "${r[4]}"`);
});
