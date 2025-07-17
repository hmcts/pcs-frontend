import path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import { Express } from 'express';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { LanguageDetector, handle } from 'i18next-http-middleware';

export class I18n {
  private readonly logger = Logger.getLogger('i18n');

  public enableFor(app: Express): void {
    i18next
      .use(Backend)
      .use(LanguageDetector)
      .init(
        {
          fallbackLng: 'en',
          preload: ['en', 'cy'],
          backend: {
            loadPath: path.resolve(__dirname, '../../assets/locales/{{lng}}/{{ns}}.json'),
          },
          detection: {
            order: ['querystring', 'cookie', 'session'],
            lookupQuerystring: 'lang',
            lookupCookie: 'lang',
            lookupSession: 'lang',
            caches: ['cookie'],
          },
          debug: false,
          saveMissing: false,
          interpolation: {
            escapeValue: false,
          },
        },
        err => {
          if (err) {
            this.logger.error('i18n init error', err);
            throw err;
          }

          // Register i18n middleware *after* init completes
          app.use(handle(i18next));
          this.logger.info('i18n module loaded');
        }
      );
  }
}
