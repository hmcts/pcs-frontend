import { Logger } from '@hmcts/nodejs-logging';
import type { Response } from 'express';

const logger = Logger.getLogger('safeRedirect');

/**
 * Safely redirects to a URL with validation to prevent open redirect vulnerabilities (CWE-601).
 *
 * This function validates that the target URL is:
 * 1. A relative path (starts with '/')
 * 2. Not a protocol-relative URL (doesn't start with '//')
 * 3. Not an absolute URL (doesn't contain '://')
 * 4. Matches one of the allowed path prefixes
 *
 * If validation fails, redirects to the fallback URL instead and logs a security warning.
 *
 * @param res - Express Response object
 * @param target - The target URL to redirect to (should be validated)
 * @param fallback - Fallback URL if target is invalid (default: '/')
 * @param allowedPrefixes - Array of allowed path prefixes (default: ['/'])
 * @returns void
 *
 * @example
 * // Redirect to dashboard with validation
 * safeRedirect303(res, '/dashboard/1234567890123456', '/', ['/dashboard']);
 *
 * @example
 * // Blocks malicious redirects
 * safeRedirect303(res, 'http://evil.com', '/'); // Redirects to '/' instead
 * safeRedirect303(res, '//evil.com', '/'); // Redirects to '/' instead
 */
export function safeRedirect303(
  res: Response,
  target: unknown,
  fallback = '/',
  allowedPrefixes: string[] = ['/']
): void {
  // Type check: target must be a string
  if (typeof target !== 'string') {
    logger.warn('safeRedirect303: Invalid target type, using fallback', {
      targetType: typeof target,
      fallback,
    });
    res.redirect(303, fallback);
    return;
  }

  // Security validation: Must be an internal relative path
  // Blocks: http://evil.com, https://evil.com, //evil.com, javascript:alert(1)
  const isRelative = target.startsWith('/') && !target.startsWith('//') && !target.includes('://');

  if (!isRelative) {
    logger.warn('safeRedirect303: Blocked non-relative URL redirect attempt', {
      attempted: target,
      fallback,
    });
    res.redirect(303, fallback);
    return;
  }

  // Allowlist validation: Must match one of the allowed prefixes
  const isAllowed = allowedPrefixes.some(prefix => target.startsWith(prefix));

  if (!isAllowed) {
    logger.warn('safeRedirect303: Blocked redirect to disallowed path', {
      attempted: target,
      allowedPrefixes,
      fallback,
    });
    res.redirect(303, fallback);
    return;
  }

  // All validations passed - safe to redirect
  res.redirect(303, target);
}
