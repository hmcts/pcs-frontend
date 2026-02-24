import { Logger } from '@hmcts/nodejs-logging';
import type { Response } from 'express';

const logger = Logger.getLogger('safeRedirect');

const INTERNAL_BASE = 'http://localhost'; // parsing anchor only

export function safeRedirect303(
  res: Response,
  target: unknown,
  fallback = '/',
  allowedPrefixes: string[] = ['/']
): void {
  if (typeof target !== 'string') {
    logger.warn('safeRedirect303: Non-string target');
    return res.redirect(303, fallback);
  }

  let decoded: string;

  try {
    decoded = decodeURIComponent(target.trim());
  } catch {
    logger.warn('safeRedirect303: Malformed encoding', { target });
    return res.redirect(303, fallback);
  }

  // Block CRLF injection
  if (/[\r\n]/.test(decoded)) {
    logger.warn('safeRedirect303: CRLF detected', { target });
    return res.redirect(303, fallback);
  }

  // Must be a single-slash relative path
  if (!decoded.startsWith('/') || decoded.startsWith('//')) {
    logger.warn('safeRedirect303: Non-relative path blocked', { target });
    return res.redirect(303, fallback);
  }

  try {
    const parsed = new URL(decoded, INTERNAL_BASE);

    // If origin changed, it was absolute
    if (parsed.origin !== INTERNAL_BASE) {
      logger.warn('safeRedirect303: External origin blocked', { target });
      return res.redirect(303, fallback);
    }

    const normalizedPath = parsed.pathname + parsed.search;

    // Optional allowlist support (keeps your existing behaviour)
    const isAllowed = allowedPrefixes.some(prefix => normalizedPath.startsWith(prefix));

    if (!isAllowed) {
      logger.warn('safeRedirect303: Prefix not allowed', {
        target,
        allowedPrefixes,
      });
      return res.redirect(303, fallback);
    }

    return res.redirect(303, normalizedPath);
  } catch {
    logger.warn('safeRedirect303: URL parsing failed', { target });
    return res.redirect(303, fallback);
  }
}
