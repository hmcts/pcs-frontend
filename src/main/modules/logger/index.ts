import util from 'util';

import winston from 'winston';

const container = new winston.Container({});

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

function createFormatter(name: string): winston.TransportOptions['formatter'] {
  return options => {
    const timestamp =
      typeof options.timestamp === 'function'
        ? String(options.timestamp())
        : typeof options.timestamp === 'string'
          ? options.timestamp
          : new Date().toISOString();
    const message = typeof options.message === 'string' ? options.message : util.format('%s', options.message ?? '');
    const metadata = formatMetadata(options.meta);
    return `${timestamp} - ${options.level}: [${name}] ${message}${metadata}`;
  };
}

function transport(name: string): winston.TransportInstance {
  return new winston.transports.Console({
    level: (process.env.LOG_LEVEL || 'INFO').toLowerCase(),
    colorize: process.env.JSON_PRINT ? false : 'all',
    json: Boolean(process.env.JSON_PRINT),
    timestamp: () => new Date().toISOString(),
    formatter: createFormatter(name),
  });
}

export class Logger {
  public static getLogger(name: string): winston.LoggerInstance {
    if (container.has(name)) {
      return container.get(name);
    }

    return container.add(name, { transports: [transport(name)] });
  }
}
