import fs from 'fs';
import path from 'path';

import { Logger } from '@hmcts/nodejs-logging';

const logger = Logger.getLogger('loadTranslations');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TranslationContent = Record<string, any>;

function findLocalesDir(): string | null {
  const candidates = [
    process.env.LOCALES_DIR || '',
    path.resolve(__dirname, '../../public/locales'),
    path.resolve(__dirname, '../../../public/locales'),
    path.resolve(process.cwd(), 'src/main/public/locales'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export const loadTranslations = (lang: string, namespaces: string[]): TranslationContent => {
  const translations: TranslationContent = {};
  const localesDir = findLocalesDir();

  if (!localesDir) {
    logger.error('No locales directory found. Translations will be empty.');
    return translations;
  }

  const basePath = path.join(localesDir, lang);

  for (const ns of namespaces) {
    try {
      const filePath = path.join(basePath, `${ns}.json`);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(fileContent);
      Object.assign(translations, parsed);
    } catch (error) {
      logger.error(`Failed to load translation for: ${lang}/${ns} with error ${error}`);
    }
  }

  return translations;
};
