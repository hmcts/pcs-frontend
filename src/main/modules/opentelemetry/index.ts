import { shutdownAzureMonitor, useAzureMonitor } from '@azure/monitor-opentelemetry';
import { SpanStatusCode } from '@opentelemetry/api';
import type { InstrumentationConfig } from '@opentelemetry/instrumentation';
import type { WinstonInstrumentationConfig } from '@opentelemetry/instrumentation-winston';
import config from 'config';

let isTelemetryInitialized = false;
let telemetryShutdownPromise: Promise<void> | null = null;
const ignoredIncomingUrlPattern = /\/assets\/|\.js(?:$|\?)|\.css(?:$|\?)/;

interface HttpTelemetryConfig {
  enabled: boolean;
  ignoreIncomingRequestHook: (request: { method?: string; url?: string }) => boolean;
  ignoreOutgoingRequestHook: (options: { path?: string }) => boolean;
}

function getServiceName(): string {
  try {
    return config.get<string>('appInsights.insightname');
  } catch {
    return 'pcs-frontend';
  }
}

function toLogMessage(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function toLogLevel(record: Record<string, unknown>): string {
  const candidate = record.level ?? record.severityText ?? record.severity;
  return String(candidate ?? '').toLowerCase();
}

function toRecordMessage(record: Record<string, unknown>): string {
  const candidate = record.message ?? record.body;
  return toLogMessage(candidate);
}

function toContextSuffix(record: Record<string, unknown>): string {
  const contextParts: string[] = [];
  if (typeof record.url === 'string' && record.url.length > 0) {
    contextParts.push(`url=${record.url}`);
  }
  if (typeof record.caseReference === 'string' && record.caseReference.length > 0) {
    contextParts.push(`caseReference=${record.caseReference}`);
  }
  if (typeof record.error === 'string' && record.error.length > 0) {
    contextParts.push(`error=${record.error}`);
  }

  return contextParts.length > 0 ? ` | ${contextParts.join(' ')}` : '';
}

function toException(record: Record<string, unknown>): Error | { name: string; message: string; stack?: string } {
  if (record.error instanceof Error) {
    return record.error;
  }
  if (record.message instanceof Error) {
    return record.message;
  }

  const message = `${toRecordMessage(record)}${toContextSuffix(record)}`;
  const name = typeof record.name === 'string' ? record.name : 'Error';
  const stack =
    typeof record.stack === 'string' && record.stack.length > 0 && record.stack !== 'undefined'
      ? record.stack
      : undefined;

  // Avoid creating synthetic Error stacks at this callsite when no original stack exists.
  return { name, message, stack };
}

const winstonTelemetryConfig: WinstonInstrumentationConfig = {
  enabled: true,
  logHook: (span, record) => {
    try {
      const level = toLogLevel(record);
      if (level !== 'error') {
        return;
      }

      const exception = toException(record);
      span.recordException(exception);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: exception.message,
      });
    } catch {
      // Never allow telemetry enrichment to break application logging.
    }
  },
};

// The HTTP instrumentation records the full URL on every span, and our query strings carry both
// secrets (the OS Places lookup passes its API key as `key=`, the login callback returns `code=`)
// and personal data (postcodes). Keeping a list of parameters to hide would leak anything not on
// it, so keep only the parameter names - enough to tell the calls apart - and drop every value.
// Anchored on '?' or '&' so an '=' inside a path is left alone, and stopping at '#' so a
// fragment is not treated as a query.
const QUERY_VALUE_PATTERN = /([?&])([^=&#?\s]+)=[^&#\s]+/g;

export function redactQueryValues(url: string): string {
  return url.replace(QUERY_VALUE_PATTERN, '$1$2=***');
}

const URL_SPAN_ATTRIBUTES = ['http.url', 'url.full', 'http.target', 'url.query'];
// `url.query` holds the query string without the leading '?' that the others carry.
const BARE_QUERY_ATTRIBUTE = 'url.query';

// Structural shape of an ended span - avoids importing @opentelemetry/sdk-trace-base, which is
// only present transitively.
interface RedactableSpan {
  attributes: Record<string, unknown>;
}

const redactSpanUrlAttributes = (span: RedactableSpan): void => {
  const attributes = span.attributes ?? {};
  for (const attribute of URL_SPAN_ATTRIBUTES) {
    const value = attributes[attribute];
    if (typeof value !== 'string') {
      continue;
    }
    const redacted =
      attribute === BARE_QUERY_ATTRIBUTE ? redactQueryValues(`?${value}`).slice(1) : redactQueryValues(value);
    if (redacted !== value) {
      // Rewrite in place: setAttribute() is a no-op once the span has ended.
      attributes[attribute] = redacted;
    }
  }
};

// A span processor rather than the HTTP instrumentation's applyCustomAttributesOnSpan hook: that
// hook only runs when a response completes, so a timed-out, aborted or refused request would
// export its URL - and the key in it - unredacted. onEnd is the one point every path reaches.
export const secretRedactingSpanProcessor = {
  onStart: (): void => undefined,
  onEnd: (span: RedactableSpan): void => redactSpanUrlAttributes(span),
  forceFlush: (): Promise<void> => Promise.resolve(),
  shutdown: (): Promise<void> => Promise.resolve(),
};

const httpTelemetryConfig: HttpTelemetryConfig = {
  enabled: true,
  ignoreIncomingRequestHook: request => {
    if (request.method === 'OPTIONS') {
      return true;
    }
    const requestUrl = request.url ?? '';
    return ignoredIncomingUrlPattern.test(requestUrl);
  },
  ignoreOutgoingRequestHook: options => {
    const requestPath = typeof options.path === 'string' ? options.path : '';
    return requestPath === '/health' || requestPath.startsWith('/health?');
  },
};

export function initializeTelemetry(): void {
  if (isTelemetryInitialized || !config.get('appInsights.enabled')) {
    return;
  }

  process.env.OTEL_SERVICE_NAME = getServiceName();

  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString: config.get('appInsights.connectionString'),
    },
    instrumentationOptions: {
      http: httpTelemetryConfig,
      redis: {
        enabled: false,
      },
      winston: winstonTelemetryConfig as InstrumentationConfig,
    },
    spanProcessors: [secretRedactingSpanProcessor],
    enableLiveMetrics: true,
  });

  isTelemetryInitialized = true;
}

export async function flushTelemetry(timeoutMs = 3000): Promise<void> {
  if (!isTelemetryInitialized || !config.get('appInsights.enabled')) {
    return;
  }

  if (!telemetryShutdownPromise) {
    telemetryShutdownPromise = new Promise<void>(resolve => {
      const timeout = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.error(`Telemetry shutdown timed out after ${timeoutMs}ms`);
        resolve();
      }, timeoutMs);

      shutdownAzureMonitor()
        .catch(error => {
          // eslint-disable-next-line no-console
          console.error('Failed to flush telemetry cleanly', error);
        })
        .finally(() => {
          clearTimeout(timeout);
          resolve();
        });
    });
  }

  await telemetryShutdownPromise;
}
