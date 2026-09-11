#!/usr/bin/env node
/**
 * Verifies that EVERY entry of the Legal Rep "Respond to Claim" Welsh
 * translation tranche (HDPI-7427) has been applied to its locale file.
 *
 * Dataset: scripts/welsh-tranche1-legalrep.json
 *   [{ file, key, welsh, flatKey?, note? }, ...]
 *
 * For each entry it resolves the key inside
 *   src/main/assets/locales/cy/respondToClaim/legalrep/<file>
 * (supporting both nested keys and flat literal dotted keys) and checks the
 * current value exactly equals the expected Welsh string.
 *
 * Reports every entry as PASS / FAIL, plus a summary. Exits 1 if anything
 * fails or is still an untranslated 'cy'-prefixed placeholder.
 *
 * Usage: node scripts/verify-welsh-tranche1.js [--quiet]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'src/main/assets/locales/cy/respondToClaim/legalrep');
const DATASET = path.join(__dirname, 'welsh-tranche1-legalrep.json');
const QUIET = process.argv.includes('--quiet');

/**
 * Resolve a dotted key against an object, tolerating BOTH nested paths
 * (a.b.c -> obj.a.b.c) and flat literal keys that contain dots
 * (obj["a.b.c"] or obj.a["b.c"]). Returns { found, value }.
 */
function resolve(obj, key) {
  // Fast path: exact literal key at the top level.
  if (Object.prototype.hasOwnProperty.call(obj, key)) return { found: true, value: obj[key] };
  const parts = key.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    if (cur == null || typeof cur !== 'object') return { found: false };
    // Try the remaining segments as one literal key first (flat dotted key).
    const rest = parts.slice(i).join('.');
    if (Object.prototype.hasOwnProperty.call(cur, rest)) return { found: true, value: cur[rest] };
    if (!Object.prototype.hasOwnProperty.call(cur, parts[i])) return { found: false };
    cur = cur[parts[i]];
  }
  return { found: true, value: cur };
}

const fileCache = new Map();
function load(file) {
  if (!fileCache.has(file)) {
    const p = path.join(DIR, file);
    if (!fs.existsSync(p)) {
      fileCache.set(file, null);
    } else fileCache.set(file, JSON.parse(fs.readFileSync(p, 'utf8')));
  }
  return fileCache.get(file);
}

const entries = JSON.parse(fs.readFileSync(DATASET, 'utf8'));

const fails = [];
let pass = 0;
const filesSeen = new Set();

for (const e of entries) {
  filesSeen.add(e.file);
  const json = load(e.file);
  let status,
    detail = '';
  if (json === null) {
    status = 'FAIL';
    detail = 'file not found';
  } else {
    const { found, value } = resolve(json, e.key);
    if (!found) {
      status = 'FAIL';
      detail = 'key not found';
    } else if (typeof value !== 'string') {
      status = 'FAIL';
      detail = `value not a string (${typeof value})`;
    } else if (value !== e.welsh) {
      status = 'FAIL';
      detail = value.startsWith('cy')
        ? `still untranslated placeholder: ${JSON.stringify(value)}`
        : `mismatch\n     expected: ${JSON.stringify(e.welsh)}\n     actual:   ${JSON.stringify(value)}`;
    } else {
      status = 'PASS';
    }
  }
  if (status === 'PASS') {
    pass++;
    if (!QUIET) console.log(`PASS  ${e.file} :: ${e.key}${e.note ? `   (note: ${e.note})` : ''}`);
  } else {
    fails.push({ e, detail });
    console.log(`FAIL  ${e.file} :: ${e.key}\n     ${detail}`);
  }
}

console.log('\n============================================================');
console.log(`Tranche entries checked: ${entries.length}`);
console.log(`Files covered:           ${filesSeen.size}`);
console.log(`PASS:                    ${pass}`);
console.log(`FAIL:                    ${fails.length}`);
console.log('============================================================');

if (fails.length) {
  console.error(`\n${fails.length} entr${fails.length === 1 ? 'y' : 'ies'} NOT correctly applied.`);
  process.exit(1);
}
console.log('\nAll tranche entries verified as applied. ✅');
