import fs, { promises as fsPromises } from 'fs';
import path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import type { Express, NextFunction, Request, Response } from 'express';
type ExpressRequest = Request;
import i18next, { type InitOptions, type TFunction } from 'i18next';
import Backend from 'i18next-fs-backend';
import { LanguageDetector, handle as i18nextHandle } from 'i18next-http-middleware';
import type { Environment } from 'nunjucks';
import { z } from 'zod';
import { makeZodI18nMap } from 'zod-i18n-map';

import { pluralPossessive, possessive } from './formatters';

function firstExistingPath(paths: string[]): string | null {
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Finds the locales directory. Prioritizes public/locales for production.
 */
export async function findLocalesDir(): Promise<string | null> {
  const candidates = [
    process.env.LOCALES_DIR || '',
    path.resolve(__dirname, '../../public/locales'),
    path.resolve(__dirname, '../../../public/locales'),
    path.resolve(process.cwd(), 'src/main/public/locales'),
    path.resolve(__dirname, '../../assets/locales'),
    path.resolve(__dirname, '../../../assets/locales'),
    path.resolve(process.cwd(), 'src/main/assets/locales'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fsPromises.access(candidate);
      return candidate;
    } catch {
      // Path not found, try next
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

export const allowedLanguages = ['en', 'cy'] as const;
export type AllowedLang = (typeof allowedLanguages)[number];

// Common translation keys that should be available on all pages
export const COMMON_TRANSLATION_KEYS = [
  'serviceName',
  'phase',
  'feedback',
  'back',
  'languageToggle',
  'contactUsForHelp',
  'contactUsForHelpText',
] as const;

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

/** Creates a fallback translation function. */
export function createFallbackTFunction(): TFunction {
  return ((key: string | string[], defaultValue?: string) =>
    Array.isArray(key) ? key[0] : (defaultValue ?? key)) as unknown as TFunction;
}

/** Validates and returns the language from the request. */
export function getValidatedLanguage(req: Request): AllowedLang {
  const i18nLang = req.language;
  if (i18nLang && allowedLanguages.includes(i18nLang.toLowerCase() as AllowedLang)) {
    return i18nLang.toLowerCase() as AllowedLang;
  }

  const raw =
    (typeof req.query?.lang === 'string' && req.query.lang) ||
    (Array.isArray(req.query?.lang) && typeof req.query.lang[0] === 'string' && req.query.lang[0]) ||
    (typeof req.body?.lang === 'string' && req.body.lang) ||
    '';
  const normalized = raw.toLowerCase().trim();
  return allowedLanguages.includes(normalized as AllowedLang) ? (normalized as AllowedLang) : 'en';
}

/** Gets the language from the request. */
export function getRequestLanguage(req: Request): AllowedLang {
  const lang = req.language as string | undefined;
  if (lang && allowedLanguages.includes(lang as AllowedLang)) {
    return lang as AllowedLang;
  }
  return getValidatedLanguage(req);
}

/** Gets the translation function for a request. */
export function getTranslationFunction(req: Request, namespaces: string[] = ['common']): TFunction {
  if (!req.i18n) {
    return createFallbackTFunction();
  }

  const lang = getRequestLanguage(req);
  const fixedT = req.i18n.getFixedT(lang, namespaces);
  return fixedT || (req.t as TFunction) || createFallbackTFunction();
}

/** Gets common translation keys as an object. */
export function getCommonTranslations(t: TFunction): Record<string, unknown> {
  const translations: Record<string, unknown> = {};
  for (const key of COMMON_TRANSLATION_KEYS) {
    const value = t(key);
    if (value !== key) {
      translations[key] = value;
    }
  }
  return translations;
}

/** Populates common translation keys into res.locals. */
export function populateCommonTranslations(req: Request, res: Response, t: TFunction): void {
  const translations = getCommonTranslations(t);
  for (const [key, value] of Object.entries(translations)) {
    if (!res.locals[key]) {
      res.locals[key] = value;
    }
  }
}

/** Sets up Nunjucks globals for i18n. */
export function setupNunjucksGlobals(env: Environment | undefined, globals: Record<string, unknown>): void {
  if (!env) {
    return;
  }
  for (const [key, value] of Object.entries(globals)) {
    env.addGlobal(key, value);
  }
}

/** Creates i18next configuration. */
function createI18nextConfig(localesDir: string, namespaces: string[]): InitOptions {
  return {
    fallbackLng: 'en',
    preload: ['en', 'cy'],
    ns: namespaces,
    defaultNS: 'common',
    fallbackNS: ['common'],
    backend: { loadPath: path.join(localesDir, '{{lng}}/{{ns}}.json') },
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
  };
}

export class I18n {
  private readonly logger = Logger.getLogger('i18n');

  public enableFor(app: Express): void {
    const candidates = [
      process.env.LOCALES_DIR || '',
      path.resolve(__dirname, '../../public/locales'),
      path.resolve(__dirname, '../../../public/locales'),
      path.resolve(process.cwd(), 'src/main/public/locales'),
      path.resolve(__dirname, '../../assets/locales'),
      path.resolve(__dirname, '../../../assets/locales'),
      path.resolve(process.cwd(), 'src/main/assets/locales'),
    ].filter(Boolean);

    const localesDir = firstExistingPath(candidates);

    const candidateRoots = candidates.map(p => ` - ${p}`).join('\n');
    this.logger.info(`[i18n] candidate locale roots:\n${candidateRoots}`);

    if (!localesDir) {
      this.logger.error('[i18n] No locales directory found. Set LOCALES_DIR or create src/main/public/locales.');
    }

    const ns = localesDir ? discoverNamespaces(localesDir, 'en') : ['common'];
    const config = createI18nextConfig(localesDir || '', ns);

    i18next
      .use(Backend)
      .use(LanguageDetector)
      .init(config, err => {
        if (err) {
          this.logger.error('[i18n] init error', err);
        } else {
          this.logger.info('[i18n] initialised OK');
        }
      });

    // Register custom formatters
    pluralPossessive(i18next);
    possessive(i18next);

    app.use(i18nextHandle(i18next));

    app.use((req: I18nRequest & { session?: SessionWithUser }, res: Response, next: NextFunction) => {
      const lang = getRequestLanguage(req);

      if (typeof req.i18n?.changeLanguage === 'function') {
        req.i18n.changeLanguage(lang);
      }

      const t: TFunction = typeof req.t === 'function' ? req.t : createFallbackTFunction();

      res.locals.lang = lang;
      res.locals.t = t;

      setupNunjucksGlobals(req.app.locals?.nunjucksEnv, { lang, t });

      next();
    });

    z.setErrorMap(makeZodI18nMap({ t: i18next.t }));
  }
}
