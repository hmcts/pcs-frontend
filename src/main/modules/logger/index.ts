import winston from 'winston';

const { combine, label, timestamp, colorize, json, printf } = winston.format;

const container = new winston.Container();

const myFormat = printf(({ level, message, timestamp: logTimestamp, ...metadata }) => {
  const jsonMetadata = JSON.stringify(metadata);
  const extra = jsonMetadata !== '{}' ? ` ${jsonMetadata}` : '';
  return `${logTimestamp} ${level}: ${message} ${extra}`;
});

function transport(name: string) {
  return new winston.transports.Console({
    level: (process.env.LOG_LEVEL || 'INFO').toLowerCase(),
    format: combine(
      label({ label: name, message: true }),
      timestamp(),
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
