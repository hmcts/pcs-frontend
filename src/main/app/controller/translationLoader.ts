import fs from 'fs';
import path from 'path';

export const loadTranslationForPage = (page: string, lang: string): Record<string, string> => {
  const localesPath = path.resolve(__dirname, '../../assets/locales');
  const commonPath = path.join(localesPath, lang, 'common.json');
  const pagePath = path.join(localesPath, lang, `${page}.json`);

  const common = JSON.parse(fs.readFileSync(commonPath, 'utf-8'));
  const pageContent = JSON.parse(fs.readFileSync(pagePath, 'utf-8'));

  return { ...common, ...pageContent };
};
