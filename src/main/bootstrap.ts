import { useAzureMonitor } from '@azure/monitor-opentelemetry';
import { SpanStatusCode } from '@opentelemetry/api';
import type { InstrumentationConfig } from '@opentelemetry/instrumentation';
import type { WinstonInstrumentationConfig } from '@opentelemetry/instrumentation-winston';

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

useAzureMonitor({
  azureMonitorExporterOptions: {
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  },
  instrumentationOptions: {
    winston: winstonTelemetryConfig as InstrumentationConfig,
  },
  enableLiveMetrics: true,
});
