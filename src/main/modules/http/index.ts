import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';

type TokenRegenerator = () => Promise<void>;

class HttpService {
  private axiosInstance: AxiosInstance;
  private s2sToken: string | null = null;
  private tokenExpiry: number | null = null;
  private tokenRegenerator: TokenRegenerator | null = null;
  private isRegenerating: boolean = false;

  constructor() {
    // Create axios instance with interceptor
    this.axiosInstance = axios.create();
    this.axiosInstance.interceptors.request.use(async config => {
      if (!this.s2sToken || this.isTokenExpired()) {
        if (!this.tokenRegenerator) {
          throw new Error('No valid S2S token available and no regenerator configured');
        }

        // Prevent multiple simultaneous regeneration attempts
        if (this.isRegenerating) {
          throw new Error('Token regeneration in progress');
        }

        try {
          this.isRegenerating = true;
          await this.tokenRegenerator();
          if (!this.s2sToken) {
            throw new Error('Failed to regenerate S2S token');
          }
        } finally {
          this.isRegenerating = false;
        }
      }
      config.headers['ServiceAuthorization'] = `Bearer ${this.s2sToken}`;
      return config;
    });
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

  public setTokenRegenerator(regenerator: TokenRegenerator): void {
    this.tokenRegenerator = regenerator;
  }

  // API methods
  public async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  public async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  public async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  public async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
}

// Create and export a single instance
export const http = new HttpService();
