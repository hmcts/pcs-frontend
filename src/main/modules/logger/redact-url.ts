import winston from 'winston';

const splatSymbol = Symbol.for('splat');

// Our URLs carry the OS Places key, OIDC authorization codes and postcodes. Every value goes,
// rather than a list of parameter names, so nothing depends on having named them in advance.
const QUERY_VALUE_PATTERN = /([?&])([^=&#?\s]+)=[^&#\s]+/g;

export function redactQueryValues(url: string): string {
  return url.replace(QUERY_VALUE_PATTERN, '$1$2=***');
}

// Span attributes are redacted separately, in a span processor. This covers the other route into
// App Insights: the winston transport exports a log record's fields as attributes verbatim, so a
// callback URL logged as `url` would ship the authorization code with it. Applied to every string
// on the record rather than to named fields, so a new call site cannot reopen the hole.
export const redactUrlsInLogRecord = winston.format(info => {
  for (const key of Object.keys(info)) {
    const value = info[key];
    if (typeof value === 'string') {
      info[key] = redactQueryValues(value);
    }
  }

  const splat = info[splatSymbol];
  if (Array.isArray(splat)) {
    info[splatSymbol] = splat.map(value => (typeof value === 'string' ? redactQueryValues(value) : value));
  }

  return info;
});
