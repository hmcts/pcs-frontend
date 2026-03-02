import winston from 'winston';

const { combine, label, timestamp, colorize, json, printf, splat } = winston.format;
const splatSymbol = Symbol.for('splat');

const container = new winston.Container();

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

function extractMergedStringMetadata(metadata: Record<string, unknown>): string | null {
  const numericKeys = Object.keys(metadata)
    .filter(key => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b));
  if (numericKeys.length === 0 || numericKeys[0] !== '0') {
    return null;
  }

  const characters: string[] = [];
  for (let index = 0; index < numericKeys.length; index += 1) {
    const key = String(index);
    if (numericKeys[index] !== key) {
      return null;
    }

    const character = metadata[key];
    if (typeof character !== 'string' || character.length !== 1) {
      return null;
    }

    characters.push(character);
  }

  numericKeys.forEach(key => {
    delete metadata[key];
  });

  return characters.join('');
}

const myFormat = printf(info => {
  const { level, message, timestamp: logTimestamp, ...rawMetadata } = info;
  const metadata = { ...rawMetadata };
  const additionalValues = Array.isArray(info[splatSymbol] as unknown[]) ? (info[splatSymbol] as unknown[]) : [];
  const mergedStringValue = extractMergedStringMetadata(metadata);
  const allAdditionalValues = mergedStringValue ? [mergedStringValue, ...additionalValues] : additionalValues;
  const jsonMetadata = JSON.stringify(metadata);
  const deduplicatedExtraValues = allAdditionalValues.filter(value => {
    const stringifiedValue = stringifyLogValue(value);
    if (stringifiedValue.length === 0) {
      return false;
    }
    if (typeof message === 'string' && message.includes(stringifiedValue)) {
      return false;
    }
    if (jsonMetadata !== '{}' && stringifiedValue === jsonMetadata) {
      return false;
    }
    return true;
  });
  const extraValues =
    deduplicatedExtraValues.length > 0 ? ` ${deduplicatedExtraValues.map(stringifyLogValue).join(' ')}` : '';
  const extraMetadata = jsonMetadata !== '{}' ? ` ${jsonMetadata}` : '';
  return `${logTimestamp} ${level}: ${message}${extraValues}${extraMetadata}`;
});

function transport(name: string) {
  return new winston.transports.Console({
    level: (process.env.LOG_LEVEL || 'INFO').toLowerCase(),
    format: combine(
      label({ label: name, message: true }),
      timestamp(),
      splat(),
      colorize({ all: true }),
      process.env.JSON_PRINT ? json() : myFormat
    ),
  });
}

export class Logger {
  public static getLogger(name: string): winston.Logger {
    return container.add(name, { transports: [transport(name)] });
  }
}
