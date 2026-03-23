import * as fs from 'fs';
import * as path from 'path';

/** Used by `test:crossbrowsergrid` only — loads `.env.sauce.local` then `.env` if vars are unset. */
export function loadSauceEnvFiles(rootDir: string): void {
  for (const name of ['.env.sauce.local', '.env']) {
    loadEnvFile(path.join(rootDir, name));
  }
}

function loadEnvFile(filePath: string): void {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  for (const line of content.split(/\r?\n/)) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    if (trimmed.toLowerCase().startsWith('export ')) {
      trimmed = trimmed.slice(7).trim();
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!value) {
      continue;
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
