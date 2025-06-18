// http-client.ts
import { Config, ErrorResponse, GeminiError, RetryableError, NonRetryableError } from '../types';
import { RetryHandler } from '../strategies/retry/expo';
import { request, Dispatcher } from 'undici';
import { Readable } from 'stream';

export class HttpClient {
    private config: Config;
    private retryHandler: RetryHandler;

    constructor(config: Config, baseUrl: string, retryHandler?: RetryHandler) {
        this.config = {
            baseUrl: baseUrl, // 'https://generativelanguage.googleapis.com',
            timeout: 30000,
            maxRetries: 1,
            retryDelay: 1000,
            ...config,
        };
        this.retryHandler = retryHandler || new RetryHandler({
            maxRetries: this.config.maxRetries,
            retryDelay: this.config.retryDelay,
        });
    }

    async request<T>(
        endpoint: string,
        options: RequestInit = {},
        isStream: boolean = false
    ): Promise<T> {
        const url = `${this.config.baseUrl}${endpoint}?key=${this.config.apiKey}`;

        // Convert RequestInit to undici's RequestOptions
        const undiciOptions: Dispatcher.RequestOptions = {
            path: `${endpoint}?key=${this.config.apiKey}`,
            method: (options.method as Dispatcher.HttpMethod) || 'POST',
            headers: Object.fromEntries(
                Object.entries({
                    'Content-Type': 'application/json',
                    ...options.headers,
                }).map(([k, v]) => [k, v?.toString()])
            ),
            body: options.body as string | Buffer | Uint8Array | Readable | null,
            signal: this.createTimeoutSignal(this.config.timeout!),
        };

        const operation = async (): Promise<T> => {
            const { statusCode, body } = await request(url, undiciOptions);

            if (statusCode >= 400) {
                await this.handleErrorResponse(statusCode, body);
            }

            if (isStream) {
                // For streaming, return the readable stream
                return body as unknown as T;
            }

            // For non-streaming, parse JSON
            const chunks: Uint8Array[] = [];
            for await (const chunk of body) {
                chunks.push(chunk);
            }
            const responseText = Buffer.concat(chunks).toString();
            return JSON.parse(responseText) as T;
        };

        return this.retryHandler.executeWithRetry(
            operation,
            `${options.method || 'POST'} ${endpoint}`
        );
    }

    async streamRequest(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<Readable> {
        return this.request<Readable>(endpoint, options, true);
    }

    private async handleErrorResponse(statusCode: number, body: Readable): Promise<never> {
        let errorData: ErrorResponse;

        try {
            const chunks: Uint8Array[] = [];
            for await (const chunk of body) {
                chunks.push(chunk);
            }
            const responseText = Buffer.concat(chunks).toString();
            errorData = JSON.parse(responseText);
        } catch {
            errorData = {
                error: {
                    code: statusCode,
                    message: this.getStatusText(statusCode) || 'Unknown error',
                    status: this.getStatusText(statusCode),
                },
            };
        }

        const { code, message, status, details } = errorData.error;
        const isRetryable = this.isRetryableStatusCode(code);
        const ErrorClass = isRetryable ? RetryableError : NonRetryableError;
        throw new ErrorClass(message, code, status, details);
    }

    private isRetryableStatusCode(statusCode: number): boolean {
        const retryableCodes = [429, 500, 502, 503, 504];
        return retryableCodes.includes(statusCode);
    }

    private getStatusText(statusCode: number): string {
        const statusTexts: Record<number, string> = {
            400: 'BAD_REQUEST',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            429: 'RATE_LIMITED',
            500: 'INTERNAL_SERVER_ERROR',
            502: 'BAD_GATEWAY',
            503: 'SERVICE_UNAVAILABLE',
            504: 'GATEWAY_TIMEOUT',
        };
        return statusTexts[statusCode] || 'UNKNOWN_ERROR';
    }

    private createTimeoutSignal(timeout: number): AbortSignal {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), timeout);
        return controller.signal;
    }

    updateConfig(newConfig: Partial<Config>): void {
        this.config = { ...this.config, ...newConfig };
    }

    getConfig(): Config {
        return { ...this.config };
    }
}