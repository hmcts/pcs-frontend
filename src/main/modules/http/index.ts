import { Logger } from '@hmcts/nodejs-logging';
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { HTTPError } from '../../HttpError';

type TokenRegenerator = () => Promise<void>;

export class HttpService {
  private instance: AxiosInstance;
  private s2sToken: string | null = null;
  private tokenExpiry: number | null = null;
  private tokenRegenerator: TokenRegenerator | null = null;
  private tokenRegenerationPromise: Promise<void> | null = null;
  private readonly TOKEN_WAIT_TIMEOUT = 5000; // 5 seconds
  private readonly TOKEN_WAIT_INTERVAL = 100; // 100ms
  logger = Logger.getLogger('http');

  constructor() {
    this.instance = axios.create();

    // Request interceptor
    this.instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      if ((!this.s2sToken || this.isTokenExpired()) && !this.tokenRegenerator) {
        this.logger.error('No token regenerator configured!');
        throw new Error('No valid S2S token available and no regenerator configured');
      }

      if (!this.s2sToken || this.isTokenExpired()) {
        await this.regenerateToken();
      }
      config.headers['ServiceAuthorization'] = `Bearer ${this.s2sToken}`;
      return config;
    });

    // Response interceptor for handling 401s
    this.instance.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { __isRetryRequest?: boolean };
        if (error.response?.status !== 401 || !originalRequest) {
          return Promise.reject(error);
        }

        // Requests with Authorization header use the user's OIDC token - 401 means user must re-login
        const hasUserToken =
          originalRequest.headers &&
          (originalRequest.headers['Authorization'] ?? originalRequest.headers['authorization']);
        if (hasUserToken) {
          this.logger.warn('Received 401 on user-token request, redirecting to login');
          return Promise.reject(new HTTPError('Unauthenticated - access token invalid or expired', 401));
        }

        // S2S-only requests - try regenerating service token and retry
        if (originalRequest.__isRetryRequest) {
          return Promise.reject(error);
        }
        this.logger.warn('Received 401 on S2S request, attempting token regeneration and retry...');
        try {
          await this.regenerateToken();
          originalRequest.__isRetryRequest = true;
          return this.instance.request(originalRequest);
        } catch (retryError) {
          this.logger.error('S2S token regeneration on 401 failed:', retryError);
          return Promise.reject(retryError);
        }
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
}

export const createHttp = (): HttpService => new HttpService();
export const http: HttpService = createHttp(); // default instance for non-test code
