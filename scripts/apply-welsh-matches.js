#!/usr/bin/env node
/**
 * Cross-references the untranslated (cy-prefixed) strings collected by
 * collect-untranslated-welsh.js against ALL known translation sources and
 * auto-applies every whole-string match into the cy/*.json files.
 *
 * Dictionary sources (unioned; richer source wins on conflict):
 *   1. temp/apply-welsh-translations.js  — TRANSLATIONS literal (973 pairs, incl. grounds)
 *   2. temp/translated.csv               — clean CSV extract
 *
 * Matching order (whole-string only):
 *   1. same File + same Key            (CSV only — it carries keys)
 *   2. same File + same English text   (normalised)
 *   3. any File + same English text    (normalised)  — reuse across files
 *
 * Outputs:
 *   scripts/welsh-applied.csv
 *   scripts/welsh-needs-translation.csv
 *
 * Usage: node scripts/apply-welsh-matches.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CY_ROOT = path.join(ROOT, 'src/main/assets/locales/cy');
const CSV = path.join(ROOT, 'temp/translated.csv');
const APPLY_JS = path.join(ROOT, 'temp/apply-welsh-translations.js');
const UNTRANS_CSV = path.join(__dirname, 'untranslated-welsh.csv');

function parseCsv(text) {
  const rows = [];
  let row = [],
    field = '',
    inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const norm = s =>
  String(s)
    .replace(/[‘’′`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[  ]/g, ' ') // nbsp variants
    .replace(/\s+/g, ' ')
    .trim();

// --- Safely extract the TRANSLATIONS object literal from the apply script ---
function extractTranslations(jsText) {
  const marker = 'const TRANSLATIONS =';
  const start = jsText.indexOf(marker);
  if (start === -1) return {};
  let i = jsText.indexOf('{', start);
  let depth = 0,
    inStr = false,
    q = '',
    esc = false,
    end = -1;
  for (; i < jsText.length; i++) {
    const c = jsText[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === q) inStr = false;
    } else if (c === '"' || c === "'") {
      inStr = true;
      q = c;
    } else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const objText = jsText.slice(jsText.indexOf('{', start), end + 1);
  // Evaluate ONLY the literal — no side effects.
  return Function(`"use strict";return (${objText});`)();
}

const byFileKey = new Map();
const byFileEnglish = new Map();
const byEnglish = new Map();
const addFileEnglish = (relFile, english, welsh) => {
  if (welsh == null || welsh === '') return;
  byFileEnglish.set(`${relFile}|${norm(english)}`, welsh);
  if (!byEnglish.has(norm(english))) byEnglish.set(norm(english), welsh);
};

// Source 2 first (CSV) so source 1 (apply script) overrides
for (const r of parseCsv(fs.readFileSync(CSV, 'utf8')).slice(1)) {
  if (r.length < 4) continue;
  const [file, key, english, welsh] = r;
  const rel = file.replace(/^.*locales\/cy\//, '');
  if (welsh) byFileKey.set(`${rel}|${key}`, welsh);
  addFileEnglish(rel, english, welsh);
}
const TRANS = extractTranslations(fs.readFileSync(APPLY_JS, 'utf8'));
let apPairs = 0;
for (const [rel, pairs] of Object.entries(TRANS)) {
  for (const [english, welsh] of pairs) {
    addFileEnglish(rel, english, welsh);
    apPairs++;
  }
}
console.error(`Dictionary loaded: ${byEnglish.size} unique English strings (apply.js pairs: ${apPairs})`);

function lookup(rel, key, english) {
  const ne = norm(english);
  if (byFileKey.has(`${rel}|${key}`)) return { welsh: byFileKey.get(`${rel}|${key}`), via: 'file+key' };
  if (byFileEnglish.has(`${rel}|${ne}`)) return { welsh: byFileEnglish.get(`${rel}|${ne}`), via: 'file+english' };
  if (byEnglish.has(ne)) return { welsh: byEnglish.get(ne), via: 'english' };
  return null;
}

function setDeep(obj, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') return false;
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
  return true;
}

const untrans = parseCsv(fs.readFileSync(UNTRANS_CSV, 'utf8'))
  .slice(1)
  .filter(r => r.length >= 3);
const fileCache = new Map();
const loadFile = rel => {
  if (!fileCache.has(rel)) fileCache.set(rel, JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')));
  return fileCache.get(rel);
};

const applied = [],
  needs = [];
for (const [file, key, english] of untrans) {
  const rel = file.replace(/^.*locales\/cy\//, 'src/main/assets/locales/cy/');
  const relInCy = rel.replace('src/main/assets/locales/cy/', '');
  const hit = lookup(relInCy, key, english);
  if (hit && norm(hit.welsh) !== norm(english)) {
    const json = loadFile(rel);
    if (setDeep(json, key, hit.welsh)) {
      applied.push([relInCy, key, english, hit.welsh, hit.via]);
      continue;
    }
  }
  needs.push([relInCy, key, english]);
}

const touched = new Set(applied.map(a => 'src/main/assets/locales/cy/' + a[0]));
for (const rel of touched) fs.writeFileSync(path.join(ROOT, rel), JSON.stringify(fileCache.get(rel), null, 2) + '\n');

const esc = s => `"${String(s).replace(/"/g, '""')}"`;
fs.writeFileSync(
  path.join(__dirname, 'welsh-applied.csv'),
  ['File,Key,English,Welsh,MatchedVia', ...applied.map(r => r.map(esc).join(','))].join('\n') + '\n'
);
fs.writeFileSync(
  path.join(__dirname, 'welsh-needs-translation.csv'),
  ['File,Key,English (needs Welsh)', ...needs.map(r => r.map(esc).join(','))].join('\n') + '\n'
);

console.log(`Untranslated input:        ${untrans.length}`);
console.log(`Auto-applied matches:      ${applied.length}`);
console.log(`Still need translation:    ${needs.length}`);
console.log(`Files updated:             ${touched.size}`);
