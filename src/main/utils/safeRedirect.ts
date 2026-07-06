import type { Response } from 'express';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('safeRedirect');

const INTERNAL_BASE = 'http://localhost'; // parsing anchor only

function getSafeRedirectPath(
  target: unknown,
  fallback: string,
  allowedPrefixes: string[],
  contextName: string
): string {
  if (typeof target !== 'string') {
    logger.warn(`${contextName}: Non-string target`);
    return fallback;
  }

  let decoded: string;

  try {
    decoded = decodeURIComponent(target.trim());
  } catch {
    logger.warn(`${contextName}: Malformed encoding`, { target });
    return fallback;
  }

  if (/[\r\n]/.test(decoded)) {
    logger.warn(`${contextName}: CRLF detected`, { target });
    return fallback;
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//')) {
    logger.warn(`${contextName}: Non-relative path blocked`, { target });
    return fallback;
  }

  try {
    const parsed = new URL(decoded, INTERNAL_BASE);

    if (parsed.origin !== INTERNAL_BASE) {
      logger.warn(`${contextName}: External origin blocked`, { target });
      return fallback;
    }

    const normalizedPath = parsed.pathname + parsed.search;

    const isAllowed = allowedPrefixes.some(prefix => normalizedPath.startsWith(prefix));

    if (!isAllowed) {
      logger.warn(`${contextName}: Prefix not allowed`, {
        target,
        allowedPrefixes,
      });
      return fallback;
    }

    return normalizedPath;
  } catch {
    logger.warn(`${contextName}: URL parsing failed`, { target });
    return fallback;
  }
}

export function safeRedirect303(
  res: Response,
  target: unknown,
  fallback = '/',
  allowedPrefixes: string[] = ['/']
): void {
  const path = getSafeRedirectPath(target, fallback, allowedPrefixes, 'safeRedirect303');
  return res.redirect(303, path);
}

export function safeRedirect307(
  res: Response,
  target: unknown,
  fallback = '/',
  allowedPrefixes: string[] = ['/']
): void {
  const path = getSafeRedirectPath(target, fallback, allowedPrefixes, 'safeRedirect307');
  return res.redirect(307, path);
}
