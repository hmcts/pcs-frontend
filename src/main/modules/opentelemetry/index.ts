import { shutdownAzureMonitor, useAzureMonitor } from '@azure/monitor-opentelemetry';
import config from 'config';

import { Logger } from '@modules/logger';

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

// Span URLs reach App Insights, and ours carry the OS Places key, OIDC codes and postcodes.
const QUERY_VALUE_PATTERN = /([?&])([^=&#?\s]+)=[^&#\s]+/g;

export function redactQueryValues(url: string): string {
  return url.replace(QUERY_VALUE_PATTERN, '$1$2=***');
}

const URL_SPAN_ATTRIBUTES = ['http.url', 'url.full', 'http.target', 'url.query'];

// `url.query` is the query string on its own; the others hold a URL or a path.
const redactUrlAttribute = (attribute: string, value: string): string =>
  attribute === 'url.query' ? redactQueryValues(`?${value}`).slice(1) : redactQueryValues(value);

// Structural: @opentelemetry/sdk-trace-base is only a transitive dependency.
interface EndedSpan {
  attributes: Record<string, unknown>;
}

const redactSpanUrlAttributes = (span: EndedSpan): void => {
  for (const attribute of URL_SPAN_ATTRIBUTES) {
    const value = span.attributes?.[attribute];
    if (typeof value === 'string') {
      span.attributes[attribute] = redactUrlAttribute(attribute, value);
    }
  }
};

// onEnd, not the HTTP instrumentation's hook: that one skips timed-out and failed requests.
export const secretRedactingSpanProcessor = {
  onStart: (): void => undefined,
  onEnd: (span: EndedSpan): void => redactSpanUrlAttributes(span),
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
      // Logger.enableTelemetry() adds the transport instead, which works however early winston loads.
      winston: {
        enabled: false,
      },
    },
    spanProcessors: [secretRedactingSpanProcessor],
    enableLiveMetrics: true,
  });
  Logger.enableTelemetry();

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
