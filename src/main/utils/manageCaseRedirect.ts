import { Logger } from '@modules/logger';

const logger = Logger.getLogger('manageCaseRedirect');

function trimTrailingSlashes(pathname: string): string {
  let end = pathname.length;
  while (end > 1 && pathname.charCodeAt(end - 1) === 47) {
    end -= 1;
  }
  return pathname.slice(0, end);
}

export function buildManageCaseDetailsRedirect(caseDetailsBaseUrl: string | null, caseId: unknown): string | undefined {
  if (!caseDetailsBaseUrl) {
    logger.warn('Unable to build Manage Case redirect: missing case details base URL');
    return undefined;
  }

  if (typeof caseId !== 'string' || !/^\d+$/.test(caseId)) {
    logger.warn('Unable to build Manage Case redirect: invalid case ID', { caseIdType: typeof caseId });
    return undefined;
  }

  try {
    const url = new URL(caseDetailsBaseUrl);
    const isAllowedProtocol = url.protocol === 'https:' || url.protocol === 'http:';
    if (!isAllowedProtocol) {
      logger.warn('Unable to build Manage Case redirect: invalid URL protocol', { protocol: url.protocol });
      return undefined;
    }

    if (!url.pathname.startsWith('/cases/case-details/')) {
      logger.warn('Unable to build Manage Case redirect: invalid URL path', { pathname: url.pathname });
      return undefined;
    }

    url.pathname = `${trimTrailingSlashes(url.pathname)}/${encodeURIComponent(caseId)}`;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    logger.warn('Unable to build Manage Case redirect: malformed case details base URL');
    return undefined;
  }
}
