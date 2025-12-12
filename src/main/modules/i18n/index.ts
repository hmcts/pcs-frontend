import fs from 'fs';
import path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import type { Express, Request as ExpressRequest, NextFunction, Response } from 'express';
import i18next, { type TFunction } from 'i18next';
import Backend from 'i18next-fs-backend';
import { LanguageDetector, handle as i18nextHandle } from 'i18next-http-middleware';
import { z } from 'zod/v4';

import { makeZodI18nMap } from './zod-error-map';

function firstExistingPath(paths: string[]): string | null {
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

export type I18nRequest = ExpressRequest & {
  t: TFunction;
  i18n: typeof i18next;
  language: string;
  cookies?: Record<string, string>;
};

type SessionWithUser = {
  user?: Record<string, unknown>;
};

const allowedLanguages = ['en', 'cy'] as const;
type AllowedLang = (typeof allowedLanguages)[number];

function discoverNamespaces(localesDir: string, lang = 'en'): string[] {
  try {
    const langDir = path.join(localesDir, lang);
    return fs
      .readdirSync(langDir)
      .filter(f => f.endsWith('.json'))
      .map(f => path.basename(f, '.json'));
  } catch {
    return ['common'];
  }
}

export class I18n {
  private readonly logger = Logger.getLogger('i18n');

  public enableFor(app: Express): void {
    const candidates = [
      process.env.LOCALES_DIR || '',
      path.resolve(__dirname, '../../public/locales'),
      path.resolve(__dirname, '../../../public/locales'),
    ].filter(Boolean);

    const localesDir = firstExistingPath(candidates);

    const candidateRoots = candidates.map(p => ` - ${p}`).join('\n');
    this.logger.info(`[i18n] candidate locale roots:\n${candidateRoots}`);

    if (!localesDir) {
      this.logger.error('[i18n] No locales directory found. Set LOCALES_DIR or create src/main/public/locales.');
    }

    const ns = localesDir ? discoverNamespaces(localesDir, 'en') : ['common'];

    i18next
      .use(Backend)
      .use(LanguageDetector)
      .init(
        {
          fallbackLng: 'en',
          preload: ['en', 'cy'],
          ns,
          defaultNS: 'common',
          fallbackNS: ['common'],
          backend: { loadPath: path.join(localesDir || '', '{{lng}}/{{ns}}.json') },
          detection: {
            order: ['querystring', 'cookie', 'session'],
            lookupQuerystring: 'lang',
            lookupCookie: 'lang',
            lookupSession: 'lang',
            caches: ['cookie'],
          },
          debug: false,
          saveMissing: false,
          interpolation: { escapeValue: false },
          returnEmptyString: false,
        },
        err => {
          if (err) {
            this.logger.error('[i18n] init error', err);
          } else {
            this.logger.info('[i18n] initialised OK');
          }
        }
      );

    // Attach i18next express middleware
    app.use(i18nextHandle(i18next));

    // Language enforcement + expose to templates/Nunjucks
    app.use((req: I18nRequest & { session?: SessionWithUser }, res: Response, next: NextFunction) => {
      const detected = req.language as string | undefined;
      const lang: AllowedLang = allowedLanguages.includes(detected as AllowedLang) ? (detected as AllowedLang) : 'en';

      if (typeof req.i18n?.changeLanguage === 'function') {
        req.i18n.changeLanguage(lang);
      }

      // Keeps TFunction type; returns defaultValue (or key) if missing
      const fallbackT: TFunction = ((key: string | string[], defaultValue?: string) =>
        Array.isArray(key) ? key[0] : (defaultValue ?? key)) as unknown as TFunction;
      const t: TFunction = typeof req.t === 'function' ? req.t : fallbackT;

      res.locals.lang = lang;
      res.locals.t = t;

      const nunjucksEnv = req.app.locals?.nunjucksEnv;
      if (nunjucksEnv) {
        nunjucksEnv.addGlobal('lang', lang);
        nunjucksEnv.addGlobal('t', t);
      }

      // Configure zod v4 with custom error map using i18next
      const zodErrorMap = makeZodI18nMap({
        t,
      });
      z.config({ customError: zodErrorMap });

      next();
    });
  }
}
