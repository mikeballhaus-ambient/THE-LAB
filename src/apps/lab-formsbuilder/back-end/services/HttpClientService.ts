/**
 * HttpClient Service - Shared HTTP utility for external API calls
 * Provides consistent HTTP client configuration and error handling
 */

export interface HttpClientConfig {
  timeout?: number;
  headers?: Record<string, string>;
  baseURL?: string;
}

export class HttpClientService {
  private static instance: HttpClientService;
  private defaultConfig: HttpClientConfig = {
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  private constructor() {}

  public static getInstance(): HttpClientService {
    if (!HttpClientService.instance) {
      HttpClientService.instance = new HttpClientService();
    }
    return HttpClientService.instance;
  }

  /**
   * Make a GET request to the specified URL.
   */
  async get<T>(url: string, config?: Partial<HttpClientConfig>): Promise<T> {
    const timeout = (config?.timeout ?? this.defaultConfig.timeout) as number;
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...this.defaultConfig.headers, ...config?.headers },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Make a POST request to the specified URL.
   */
  async post<T>(url: string, body?: unknown, config?: Partial<HttpClientConfig>): Promise<T> {
    const timeout = (config?.timeout ?? this.defaultConfig.timeout) as number;
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...this.defaultConfig.headers, ...config?.headers },
      signal: AbortSignal.timeout(timeout),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Make a PUT request to the specified URL.
   */
  async put<T>(url: string, body?: unknown, config?: Partial<HttpClientConfig>): Promise<T> {
    const timeout = (config?.timeout ?? this.defaultConfig.timeout) as number;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { ...this.defaultConfig.headers, ...config?.headers },
      signal: AbortSignal.timeout(timeout),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Make a DELETE request to the specified URL.
   */
  async delete<T>(url: string, config?: Partial<HttpClientConfig>): Promise<T> {
    const timeout = (config?.timeout ?? this.defaultConfig.timeout) as number;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { ...this.defaultConfig.headers, ...config?.headers },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}