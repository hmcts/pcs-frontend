import { type Span, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { Logger } from '@modules/logger';

type TokenRegenerator = () => Promise<void>;
interface TracedRequestConfig extends InternalAxiosRequestConfig {
  __otelSpan?: Span;
  __isRetryRequest?: boolean;
}

export class HttpService {
  private instance: AxiosInstance;
  private s2sToken: string | null = null;
  private tokenExpiry: number | null = null;
  private tokenRegenerator: TokenRegenerator | null = null;
  private tokenRegenerationPromise: Promise<void> | null = null;
  private readonly TOKEN_WAIT_TIMEOUT = 5000; // 5 seconds
  private readonly TOKEN_WAIT_INTERVAL = 100; // 100ms
  private readonly tracer = trace.getTracer('http-service');
  logger = Logger.getLogger('http');

  constructor() {
    this.instance = axios.create();

    // Request interceptor
    this.instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      const tracedConfig = config as TracedRequestConfig;
      this.startOutboundSpan(tracedConfig);

      try {
        if ((!this.s2sToken || this.isTokenExpired()) && !this.tokenRegenerator) {
          this.logger.error('No token regenerator configured!');
          throw new Error('No valid S2S token available and no regenerator configured');
        }

        if (!this.s2sToken || this.isTokenExpired()) {
          await this.regenerateToken();
        }
        tracedConfig.headers['ServiceAuthorization'] = `Bearer ${this.s2sToken}`;
        return tracedConfig;
      } catch (error) {
        this.endSpanWithError(tracedConfig, error);
        throw error;
      }
    });

    // Response interceptor for handling 401s
    this.instance.interceptors.response.use(
      response => {
        this.endSpanWithStatus(response.config as TracedRequestConfig, response.status);
        return response;
      },
      async error => {
        const originalRequest = error.config as TracedRequestConfig;
        if (error.response?.status === 401 && !originalRequest.__isRetryRequest) {
          this.endSpanWithStatus(originalRequest, 401);
          this.logger.warn('Received 401, attempting token regeneration and retry...');
          try {
            await this.regenerateToken();
            originalRequest.__isRetryRequest = true;
            return this.instance.request(originalRequest);
          } catch (retryError) {
            this.logger.error('Token regeneration on 401 failed:', retryError);
            return Promise.reject(retryError);
          }
        }
        this.endSpanWithError(originalRequest, error);
        return Promise.reject(error);
      }
    );
  }

  private async regenerateToken(): Promise<void> {
    if (!this.tokenRegenerator) {
      this.logger.error('No token regenerator configured!');
      throw new Error('No token regenerator configured');
    }

    if (!this.tokenRegenerationPromise) {
      const regenerator = this.tokenRegenerator; // Store reference to avoid null check issues
      this.tokenRegenerationPromise = (async () => {
        try {
          await regenerator();
          // Wait for token to be set (with timeout)
          const startTime = Date.now();
          while (!this.s2sToken && Date.now() - startTime < this.TOKEN_WAIT_TIMEOUT) {
            await new Promise(resolve => setTimeout(resolve, this.TOKEN_WAIT_INTERVAL));
          }
          if (!this.s2sToken) {
            this.logger.error('Token regeneration failed: token not set within timeout');
            throw new Error('Failed to regenerate S2S token - token not set within timeout');
          }
        } catch (error) {
          // Clear the token if regeneration failed
          this.s2sToken = null;
          this.tokenExpiry = null;
          this.logger.error('Token regeneration error:', error);
          throw error;
        }
      })().finally(() => {
        this.tokenRegenerationPromise = null;
      });
    }

    return this.tokenRegenerationPromise;
  }

  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) {
      return true;
    }
    // Add 30 second buffer before actual expiry
    return Date.now() >= this.tokenExpiry * 1000 - 30000;
  }

  public setToken(token: string, expiry: number): void {
    this.s2sToken = token;
    this.tokenExpiry = expiry;
  }

  public setTokenRegenerator(regenerator: TokenRegenerator | null): void {
    this.tokenRegenerator = regenerator;
  }

  // API methods matching Axios signatures exactly
  public getUri(config?: AxiosRequestConfig): string {
    return this.instance.getUri(config);
  }

  public request<T = unknown, R = AxiosResponse<T>, D = unknown>(config: AxiosRequestConfig<D>): Promise<R> {
    return this.instance.request<T, R, D>(config);
  }

  public get<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<R> {
    return this.instance.get<T, R, D>(url, config);
  }

  public delete<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return this.instance.delete<T, R, D>(url, config);
  }

  public head<T = unknown, R = AxiosResponse<T>, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<R> {
    return this.instance.head<T, R, D>(url, config);
  }

  public options<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return this.instance.options<T, R, D>(url, config);
  }

  public post<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return this.instance.post<T, R, D>(url, data, config);
  }

  public put<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return this.instance.put<T, R, D>(url, data, config);
  }

  public patch<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return this.instance.patch<T, R, D>(url, data, config);
  }

  public postForm<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return this.instance.postForm<T, R, D>(url, data, config);
  }

  public putForm<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return this.instance.putForm<T, R, D>(url, data, config);
  }

  public patchForm<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R> {
    return this.instance.patchForm<T, R, D>(url, data, config);
  }

  private resolveRequestUrl(url: string, baseUrl?: string): string {
    if (!baseUrl) {
      return url;
    }

    try {
      return new URL(url, baseUrl).toString();
    } catch {
      return url;
    }
  }

  private startOutboundSpan(config: TracedRequestConfig): void {
    const method = config.method?.toUpperCase() || 'GET';
    const url = this.resolveRequestUrl(config.url || '', config.baseURL);
    const spanName = `${method} ${url}`;
    const span = this.tracer.startSpan(spanName, { kind: SpanKind.CLIENT });
    span.setAttribute('http.request.method', method);
    span.setAttribute('url.full', url);
    config.__otelSpan = span;
  }

  private getRequestContext(config: TracedRequestConfig | undefined): { method: string; url: string } {
    if (!config) {
      return { method: 'UNKNOWN', url: 'UNKNOWN_URL' };
    }

    return {
      method: config.method?.toUpperCase() || 'GET',
      url: this.resolveRequestUrl(config.url || '', config.baseURL),
    };
  }

  private endSpanWithStatus(config: TracedRequestConfig | undefined, statusCode: number): void {
    const span = config?.__otelSpan;
    if (!span) {
      return;
    }

    span.setAttribute('http.response.status_code', statusCode);
    if (statusCode >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${statusCode}`,
      });
    }
    span.end();
    if (config) {
      config.__otelSpan = undefined;
    }
  }

  private endSpanWithError(config: TracedRequestConfig | undefined, error: unknown): void {
    const span = config?.__otelSpan;
    if (!span) {
      return;
    }

    const { method, url } = this.getRequestContext(config);
    const statusCode = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (statusCode) {
      span.setAttribute('http.response.status_code', statusCode);
    }

    const baseError = error instanceof Error ? error : new Error(String(error));
    const statusLabel = statusCode ?? 'UNKNOWN_STATUS';
    const enrichedMessage = `${method} ${url} failed with status ${statusLabel}: ${baseError.message}`;
    const exception = new Error(enrichedMessage);
    exception.name = baseError.name;
    exception.stack = baseError.stack;

    span.setAttribute('error.type', baseError.name || 'Error');
    span.setAttribute('error.message', enrichedMessage);
    span.setAttribute('http.request.method', method);
    span.setAttribute('url.full', url);
    span.recordException(exception);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: enrichedMessage,
    });
    span.end();
    if (config) {
      config.__otelSpan = undefined;
    }
  }
}

export const createHttp = (): HttpService => new HttpService();
export const http: HttpService = createHttp(); // default instance for non-test code
