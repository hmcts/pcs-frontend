import fs from 'fs';
import path from 'path';

import { Logger } from '@hmcts/nodejs-logging';

const logger = Logger.getLogger('ccdCaseService');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TranslationContent = Record<string, any>;

export const loadTranslations = (lang: string, namespaces: string[]): TranslationContent => {
  const translations: TranslationContent = {};
  const basePath = path.resolve(__dirname, '../../public/locales', lang);

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
