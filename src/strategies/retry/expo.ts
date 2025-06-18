import { logger } from '../../utils/logger';
import { RetryConfig, RetryableError, NonRetryableError } from '../../types';

export class RetryHandler {
   private config: RetryConfig;

   constructor(config: Partial<RetryConfig> = {}) {
      this.config = {
         maxRetries: config.maxRetries || 3,
         retryDelay: config.retryDelay || 1000,
         exponentialBackoff: config.exponentialBackoff !== false,
         retryableStatusCodes: config.retryableStatusCodes || [429, 500, 502, 503, 504],
      };
   }

   async executeWithRetry<T>(operation: () => Promise<T>, context: string = 'operation'): Promise<T> {
      let lastError: Error;

      for (let attempt = 0; attempt <= (this.config?.maxRetries ?? 1); attempt++) {
         try {
            const result = await operation();
            if (attempt > 0) {
               logger.info(`${context} succeeded on attempt ${attempt + 1}`);
            }
            return result;
         } catch (error) {
            lastError = error as Error;

            if (attempt === this.config?.maxRetries) {
               logger.error(`${context} failed after ${this.config?.maxRetries + 1} attempts:`, lastError);
               break;
            }

            if (!this.isRetryableError(error)) {
               throw error;
            }

            const delay = this.calculateDelay(attempt);
            logger.warn(`${context} failed on attempt ${attempt + 1}, retrying in ${delay}ms:`, lastError.message);

            await this.sleep(delay);
         }
      }

      throw lastError!;
   }

   private isRetryableError(error: any): boolean {
      // Check for specific error types
      if (error instanceof NonRetryableError) {
         return false;
      }

      if (error instanceof RetryableError) {
         return true;
      }

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
         return true;
      }

      if (error.name === 'AbortError' || error.message.includes('timeout')) {
         return true;
      }

      // Check for HTTP status codes
      if (error.status || error.code) {
         const statusCode = error.status || error.code;
         return this.config?.retryableStatusCodes?.includes(statusCode) ? true : false;
      }

      // Default to non-retryable for unknown errors
      return false;
   }

   private calculateDelay(attempt: number): number {
      if (!this.config?.exponentialBackoff) {
         return this.config?.retryDelay ?? 1000; // Default to a fixed delay if exponential backoff is not enabled
      }
      const baseDelay = this.config?.retryDelay ?? 1000 * Math.pow(2, attempt);
      const jitter = Math.random() * 0.1 * baseDelay;
      return Math.floor(baseDelay + jitter);
   }

   private sleep(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
   }

   updateConfig(newConfig: Partial<RetryConfig>): void {
      this.config = { ...this.config, ...newConfig };
   }

   getConfig(): RetryConfig {
      return { ...this.config };
   }
}
