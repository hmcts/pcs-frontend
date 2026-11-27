import winston from 'winston';

const splatSymbol = Symbol.for('splat');

// Our URLs carry the OS Places key, OIDC authorization codes and postcodes. Every value goes,
// rather than a list of parameter names, so nothing depends on having named them in advance.
const QUERY_VALUE_PATTERN = /([?&])([^=&#?\s]+)=[^&#\s]+/g;

export function redactQueryValues(url: string): string {
  return url.replace(QUERY_VALUE_PATTERN, '$1$2=***');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Returns a redacted copy rather than editing in place: the object belongs to the caller.
// `ancestors` guards against circular references only; the same object reached twice by
// different paths is redacted both times.
function redactValue(value: unknown, ancestors: Set<object> = new Set()): unknown {
  if (typeof value === 'string') {
    return redactQueryValues(value);
  }
  if (!Array.isArray(value) && !isPlainObject(value)) {
    return value;
  }
  if (ancestors.has(value)) {
    return '[Circular]';
  }
  ancestors.add(value);
  const redacted = Array.isArray(value)
    ? value.map(item => redactValue(item, ancestors))
    : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactValue(item, ancestors)]));
  ancestors.delete(value);
  return redacted;
}

// Span attributes are redacted separately, in a span processor. This covers the other route into
// App Insights: the winston transport exports a log record's fields as attributes verbatim, so a
// callback URL logged as `url` would ship the authorization code with it. Applied to every string
// on the record rather than to named fields, so a new call site cannot reopen the hole.
//
// The splat array is redacted as well, object arguments included: winston keeps the original
// metadata object there, and the console transport's splat() merges it back over the record.
export const redactUrlsInLogRecord = winston.format(info => {
  for (const key of Object.keys(info)) {
    info[key] = redactValue(info[key]);
  }

  const splat = info[splatSymbol];
  if (Array.isArray(splat)) {
    info[splatSymbol] = splat.map(value => redactValue(value));
  }

  return info;
});
