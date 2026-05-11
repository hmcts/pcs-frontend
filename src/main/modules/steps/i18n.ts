import { promises as fs } from 'fs';
import path from 'path';

import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { getUserType } from '../../steps/utils';
import {
  type AllowedLang,
  findLocalesDir,
  getRequestLanguage as getMainRequestLanguage,
  getTranslationFunction as getMainTranslationFunction,
} from '../i18n';

import { getStepContext } from './stepContext';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('i18n');

export type TranslationContent = Record<string, unknown>;

export type SupportedLang = AllowedLang;

const isDevelopment = process.env.NODE_ENV !== 'production';

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function mergeTranslations(
  baseTranslations: Record<string, unknown>,
  overrideTranslations: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...baseTranslations };

  for (const [key, value] of Object.entries(overrideTranslations)) {
    const existingValue = merged[key];

    if (isObject(existingValue) && isObject(value)) {
      merged[key] = mergeTranslations(existingValue, value);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function camelizeStepName(stepName: string): string {
  return stepName
    .split('-')
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

/**
 * i18next namespace for a step. Scoped by the journey folder so that two
 * journeys with the same step name (e.g. two `start-now` steps) get distinct
 * namespaces and don't share a single mutable bundle.
 */
export function getStepNamespace(stepName: string, journeyFolder?: string): string {
  const camel = camelizeStepName(stepName);
  return journeyFolder ? `${journeyFolder}__${camel}` : camel;
}

/** Filesystem path (without extension) for a step's translation file under locales/<lang>/. */
export function getStepTranslationPath(stepName: string, folder: string): string {
  return `${folder}/${camelizeStepName(stepName)}`;
}

function getStepTranslationPaths(req: Request, stepName: string, folder: string): string[] {
  const defaultPath = getStepTranslationPath(stepName, folder);
  const userType = getUserType(req);

  if (userType === 'citizen') {
    return [defaultPath];
  }

  return [defaultPath, `${folder}/${userType}/${camelizeStepName(stepName)}`];
}

function resolveStepName(req: Request, explicit?: string): string | undefined {
  return explicit ?? getStepContext(req)?.name;
}

function resolveJourneyFolder(req: Request, explicit?: string): string | undefined {
  return explicit ?? getStepContext(req)?.journey;
}

/**
 * Loads and registers a step's translations under a journey-scoped i18next
 * namespace. The early-return cache check is safe because the namespace is
 * unique per (journey, step), so the first request warms it and subsequent
 * requests skip the disk read.
 *
 * `stepName` and `folder` are optional — when omitted they're read from
 * `res.locals.step` (set by `withStepContext` middleware in registerSteps).
 */
export async function loadStepNamespace(req: Request, stepName?: string, folder?: string): Promise<void> {
  if (!req.i18n) {
    return;
  }

  const resolvedStepName = resolveStepName(req, stepName);
  const resolvedFolder = resolveJourneyFolder(req, folder);

  if (!resolvedStepName || !resolvedFolder) {
    return;
  }

  const stepNamespace = getStepNamespace(resolvedStepName, resolvedFolder);
  const lang = getMainRequestLanguage(req);

  if (req.i18n.getResourceBundle(lang, stepNamespace)) {
    return;
  }

  const localesDir = await findLocalesDir();
  if (!localesDir) {
    if (isDevelopment) {
      logger.warn(`Locales directory not found. Translation file for ${resolvedStepName} will not be loaded.`);
    }
    return;
  }

  try {
    let translations: Record<string, unknown> = {};

    for (const translationPath of getStepTranslationPaths(req, resolvedStepName, resolvedFolder)) {
      const filePath = path.join(localesDir, lang, `${translationPath}.json`);
      const resolvedPath = path.resolve(filePath);
      const resolvedLocalesDir = path.resolve(localesDir);

      if (!resolvedPath.startsWith(resolvedLocalesDir)) {
        if (isDevelopment) {
          logger.warn(`Invalid translation path detected: ${translationPath}`);
        }
        return;
      }

      try {
        await fs.access(resolvedPath);
        const fileContent = await fs.readFile(resolvedPath, 'utf8');
        translations = mergeTranslations(translations, JSON.parse(fileContent) as Record<string, unknown>);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('ENOENT')) {
          throw error;
        }
      }
    }

    if (Object.keys(translations).length === 0) {
      return;
    }

    req.i18n.addResourceBundle(lang, stepNamespace, translations, true, true);

    await new Promise<void>((resolve, reject) => {
      req.i18n!.loadNamespaces(stepNamespace, err => (err ? reject(err) : resolve()));
    });
  } catch (error) {
    if (isDevelopment) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('ENOENT')) {
        logger.error(`Failed to load translation file for ${resolvedStepName}:`, error);
      }
    }
  }
}

/**
 * Reads a step's translation bundle. `stepName` and `journeyFolder` are
 * optional — when omitted they're read from `res.locals.step`.
 */
export function getStepTranslations(req: Request, stepName?: string, journeyFolder?: string): TranslationContent {
  if (!req.i18n) {
    return {};
  }

  const resolvedStepName = resolveStepName(req, stepName);
  if (!resolvedStepName) {
    return {};
  }

  const resolvedFolder = resolveJourneyFolder(req, journeyFolder);
  const lang = getMainRequestLanguage(req);
  const resources = req.i18n.getResourceBundle(lang, getStepNamespace(resolvedStepName, resolvedFolder));
  return (resources as TranslationContent) || {};
}

/**
 * Translation function for a request. When `stepName` is omitted it's read
 * from `res.locals.step`; the journey folder is always read from
 * `res.locals.step` (which `withStepContext` populates per request).
 */
export function getTranslationFunction(
  req: Request,
  stepName?: string,
  namespaces: string[] = ['common'],
  journeyFolder?: string
): TFunction {
  if (!req.i18n) {
    return getMainTranslationFunction(req, namespaces);
  }

  const resolvedStepName = resolveStepName(req, stepName);
  const resolvedFolder = resolveJourneyFolder(req, journeyFolder);

  const lang = getMainRequestLanguage(req);
  const allNamespaces = resolvedStepName
    ? [getStepNamespace(resolvedStepName, resolvedFolder), ...namespaces]
    : namespaces;
  const fixedT = req.i18n.getFixedT(lang, allNamespaces);
  return fixedT || getMainTranslationFunction(req, namespaces);
}

/** Validates and warns about missing translation keys in development. */
export function validateTranslationKey(t: TFunction, key: string, context?: string): void {
  if (isDevelopment) {
    const translation = t(key);
    if (translation === key) {
      logger.warn(`Missing translation key: "${key}"${context ? ` in ${context}` : ''}`);
    }
  }
}
