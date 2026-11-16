import { shutdownAzureMonitor, useAzureMonitor } from '@azure/monitor-opentelemetry';
import { TraceFlags } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import {
  ExpressInstrumentation,
  type ExpressInstrumentationConfig,
  ExpressLayerType,
} from '@opentelemetry/instrumentation-express';
import config from 'config';

import { Logger } from '@modules/logger';
import { redactQueryValues } from '@modules/logger/redact-url';

// One pattern for both routes into App Insights: span attributes here, log records in the logger.
export { redactQueryValues };

let isTelemetryInitialized = false;
let telemetryShutdownPromise: Promise<void> | null = null;
const ignoredIncomingUrlPattern = /\/assets\/|\.js(?:$|\?)|\.css(?:$|\?)/;
// The health check and the Kubernetes probes: /health, /health/liveness and /health/readiness.
const incomingHealthCheckPattern = /^\/health(?:\/(?:liveness|readiness))?(?:$|\?)/;

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

// Not the HTTP instrumentation's hook: that one skips timed-out and failed requests.
// onStart as well as onEnd - the distro's own span processor runs ahead of this one and feeds
// Live Metrics from onEnd, so the attributes set at span creation have to be clean by then.
export const secretRedactingSpanProcessor = {
  onStart: (span: EndedSpan): void => redactSpanUrlAttributes(span),
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
    return ignoredIncomingUrlPattern.test(requestUrl) || incomingHealthCheckPattern.test(requestUrl);
  },
  ignoreOutgoingRequestHook: options => {
    const requestPath = typeof options.path === 'string' ? options.path : '';
    return requestPath === '/health' || requestPath.startsWith('/health?');
  },
};

// Routers are not ignored: if they were, a route registered after a router mounted on a path
// would get that path twice (/case/case/...). Ignoring the other two saves a span per layer.
export const expressInstrumentationConfig: ExpressInstrumentationConfig = {
  ignoreLayersType: [ExpressLayerType.MIDDLEWARE, ExpressLayerType.REQUEST_HANDLER],
};

interface SampledSpan extends EndedSpan {
  spanContext: () => { traceFlags: number };
}

// Router spans are only there to get the route right, so they are not sent to App Insights.
// The exporter skips a span that is not marked as sampled.
export const routerSpanDroppingSpanProcessor = {
  onStart: (): void => {},
  onEnd: (span: SampledSpan): void => {
    if (span.attributes?.['express.type'] === ExpressLayerType.ROUTER) {
      span.spanContext().traceFlags = TraceFlags.NONE;
    }
  },
  forceFlush: (): Promise<void> => Promise.resolve(),
  shutdown: (): Promise<void> => Promise.resolve(),
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
    spanProcessors: [secretRedactingSpanProcessor, routerSpanDroppingSpanProcessor],
    enableLiveMetrics: true,
  });
  // Records the route template, so App Insights names a request by its route, not just its method.
  // This has to run after useAzureMonitor() and before express is loaded, as bootstrap.ts does.
  registerInstrumentations({
    instrumentations: [new ExpressInstrumentation(expressInstrumentationConfig)],
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
