import { LLMConfig, ErrorResponse, RetryableError, NonRetryableError } from '../types';
import { RetryHandler } from '../strategies/retry/expo';
import { request, Dispatcher } from 'undici';
import { Readable } from 'stream';
import { logger } from '../utils/logger';

export class HttpClient {
   private config: LLMConfig;
   private retryHandler: RetryHandler;

   constructor(config: LLMConfig, baseUrl: string, retryHandler?: RetryHandler) {
      this.config = {
         baseUrl: baseUrl, // 'https://generativelanguage.googleapis.com',
         timeout: 30000,
         ...config,
      };
      this.retryHandler =
         retryHandler ||
         new RetryHandler({
            maxRetries: this.config.retryConfig?.maxRetries,
            retryDelay: this.config.retryConfig?.retryDelay,
         });
   }

   async request<T>(options: RequestInit = {}, isStream: boolean = false, endPointPath: string): Promise<T> {
      const url = `${this.config.baseUrl}`;
      logger.info('base url:', url);
      logger.info('endpoint path: ', endPointPath);

      const undiciOptions: Dispatcher.RequestOptions = {
         path: endPointPath,
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
      logger.info('undici options: ', JSON.stringify(undiciOptions, null, 2));
      const operation = async (): Promise<T> => {
         const { statusCode, body } = await request(url, undiciOptions);

         logger.debug('status of the response is :', statusCode);
         //REMOVE FROM HERE
         // const chunk2: Uint8Array[] = [];
         // for await (const chunk of body) {
         //    chunk2.push(chunk);
         // }
         // const responseText2 = Buffer.concat(chunk2).toString();
         // console.log("response text:", JSON.parse(responseText2) as T);
         //REMOVE TO HERE

         if (isStream) {
            logger.info('streaming response');
            if (body instanceof Readable) {
               return body as unknown as T;
            }
            throw new NonRetryableError('Expected a Readable stream for streaming requests', statusCode, this.getStatusText(statusCode));
         }

         const chunks: Uint8Array[] = [];
         for await (const chunk of body) {
            chunks.push(chunk);
         }
         const responseText = Buffer.concat(chunks).toString();
         return JSON.parse(responseText) as T;
      };

      return this.retryHandler.executeWithRetry(operation, `${options.method || 'POST'} `);
   }

   async streamRequest(options: RequestInit = {}, endPointPath: string): Promise<Readable> {
      logger.info('endpoint path: ', endPointPath);
      return this.request<Readable>(options, true, endPointPath);
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

   updateConfig(newConfig: Partial<LLMConfig>): void {
      this.config = { ...this.config, ...newConfig };
   }

   getConfig(): LLMConfig {
      return { ...this.config };
   }
}
