// src/main/modules/i18n/index.ts
import path from 'path';

import { Express } from 'express';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { LanguageDetector, handle } from 'i18next-http-middleware';

export class I18n {
  enableFor(app: Express): void {
    i18next
      .use(Backend)
      .use(LanguageDetector)
      .init({
        fallbackLng: 'en',
        preload: ['en', 'cy'],
        backend: {
          loadPath: path.join(__dirname, '../../assets/locales/{{lng}}/{{ns}}.json'),
        },
        detection: {
          order: ['querystring', 'cookie', 'session'],
          lookupQuerystring: 'lang',
          caches: ['cookie', 'session'],
        },
        debug: false,
        saveMissing: false,
        interpolation: {
          escapeValue: false,
        },
      });

    app.use(handle(i18next));
  }
}
