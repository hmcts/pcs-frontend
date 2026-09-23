import { SpanStatusCode, trace } from '@opentelemetry/api';
import winston from 'winston';

// Never receives an Error: toException returns those directly, so their stack survives.
function toLogMessage(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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

export function toException(
  record: Record<string, unknown>
): Error | { name: string; message: string; stack?: string } {
  if (record.error instanceof Error) {
    return record.error;
  }
  if (record.message instanceof Error) {
    return record.message;
  }

  const message = `${toLogMessage(record.message)}${toContextSuffix(record)}`;
  const name = typeof record.name === 'string' ? record.name : 'Error';
  const stack =
    typeof record.stack === 'string' && record.stack.length > 0 && record.stack !== 'undefined'
      ? record.stack
      : undefined;

  // Avoid creating synthetic Error stacks at this callsite when no original stack exists.
  return { name, message, stack };
}

// Marks the active span as failed for every error-level log. Uses the global OpenTelemetry API,
// so it works however early winston is loaded.
export const recordErrorsOnActiveSpan = winston.format(info => {
  if (info.level !== 'error') {
    return info;
  }
  try {
    const span = trace.getActiveSpan();
    if (span) {
      const exception = toException(info);
      span.recordException(exception);
      span.setStatus({ code: SpanStatusCode.ERROR, message: exception.message });
    }
  } catch {
    // Never allow telemetry enrichment to break application logging.
  }
  return info;
});
