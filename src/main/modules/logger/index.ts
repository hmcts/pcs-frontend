import util from 'util';

import winston from 'winston';

const container = new winston.Container();
const splatSymbol = Symbol.for('splat');
const reservedKeys = new Set(['level', 'message', 'timestamp', 'metadata']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Error);
}

function stringifyLogValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }
  if (typeof value === 'undefined') {
    return 'undefined';
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatMetadata(metadata: unknown): string {
  if (metadata === null || typeof metadata === 'undefined') {
    return '';
  }
  if (Array.isArray(metadata)) {
    const rendered = metadata.map(stringifyLogValue).filter(Boolean).join(' ');
    return rendered ? ` ${rendered}` : '';
  }
  if (typeof metadata === 'object') {
    const keys = Object.keys(metadata as Record<string, unknown>);
    if (keys.length === 0) {
      return '';
    }
  }
  return ` ${stringifyLogValue(metadata)}`;
}

const normaliseInfo = winston.format(info => {
  const splatValues = Array.isArray(info[splatSymbol]) ? (info[splatSymbol] as unknown[]) : [];
  const messageArgs = splatValues.filter(value => !isPlainObject(value));
  const metadataArgs = splatValues.filter(isPlainObject);

  if (typeof info.message === 'string' && messageArgs.length > 0) {
    info.message = util.format(info.message, ...messageArgs);
  }

  const extraFields = Object.fromEntries(Object.entries(info).filter(([key]) => !reservedKeys.has(key)));
  const metadata = Object.assign({}, ...metadataArgs, extraFields);
  info.metadata = Object.keys(metadata).length > 0 ? metadata : undefined;

  return info;
});

function createTextFormat(name: string): winston.Logform.Format {
  const formats: winston.Logform.Format[] = [
    winston.format.errors({ stack: true }),
    normaliseInfo(),
    winston.format.timestamp(),
    ...(isColorizable ? [winston.format.colorize({ all: true })] : []),
    winston.format.printf(
      info => `${info.timestamp} - ${info.level}: [${name}] ${info.message}${formatMetadata(info.metadata)}`
    ),
  ];

  return winston.format.combine(...formats);
}

function createJsonFormat(name: string): winston.Logform.Format {
  return winston.format.combine(
    winston.format.errors({ stack: true }),
    normaliseInfo(),
    winston.format.timestamp(),
    winston.format(info => {
      info.logger = name;
      return info;
    })(),
    winston.format.json()
  );
}

const isColorizable = process.stdout.isTTY === true && process.env.CI !== 'true';

function transport(name: string) {
  return new winston.transports.Console({
    level: (process.env.LOG_LEVEL || 'INFO').toLowerCase(),
    format: process.env.JSON_PRINT ? createJsonFormat(name) : createTextFormat(name),
  });
}

export class Logger {
  public static getLogger(name: string): winston.Logger {
    if (container.has(name)) {
      return container.get(name);
    }

    return container.add(name, {
      level: (process.env.LOG_LEVEL || 'info').toLowerCase(),
      transports: [transport(name)],
    });
  }
}
