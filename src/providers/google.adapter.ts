import { LLMConfig, GenerateContentRequest, GenerateContentResponse, Tool, Content, GeminiResponse } from '../types';

import { HttpClient } from '../core/http-client';
import { RetryHandler } from '../strategies/retry/expo';
import { ContentBuilder, MessageValidator } from '../builder/ai.builder';
import { GoogleStreamProcessor, StreamOptions } from '../strategies/stream/google.stream';
import { Readable } from 'stream';
import { logger } from '../utils/logger';
/**
 * 
 * "generationConfig": {
      "temperature": 0.45,
      "thinkingConfig": {
        "thinkingBudget": -1,
      },
      "responseMimeType": "text/plain",
    },
 */
export class GeminiClient {
   private httpClient: HttpClient;
   private retryHandler: RetryHandler;
   private streamProcessor: GoogleStreamProcessor;
   private endpoint: string = 'https://generativelanguage.googleapis.com';
   constructor(config: LLMConfig) {
      this.retryHandler = new RetryHandler({
         maxRetries: config.retryConfig?.maxRetries ?? 3,
         retryDelay: config.retryConfig?.retryDelay ?? 1000,
      });

      this.httpClient = new HttpClient(config, config.baseUrl ?? this.endpoint, this.retryHandler);
      this.streamProcessor = new GoogleStreamProcessor();
   }

   private convertFromGeminiResponse(response: GeminiResponse): GenerateContentResponse {
      return {
         resp_id: response.responseId,
         model: response.modelVersion,
         output: response.candidates[0]?.content.parts.map(part => ('text' in part ? part.text : '')).join('') || '',
         usage: {
            input_tokens: response.usageMetadata?.promptTokenCount,
            output_tokens: response.usageMetadata?.candidatesTokenCount,
            total_tokens: response.usageMetadata?.totalTokenCount,
         },
         status: 'success',
      };
   }

   async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
      MessageValidator.validateContents(request.contents);
      const endpoint = `/v1beta/models/${this.httpClient.getConfig().model}:generateContent?key=${this.httpClient.getConfig().apiKey}`;
      const data = await this.httpClient.request<GeminiResponse>(
         {
            method: 'POST',
            body: JSON.stringify(request),
         },
         false,
         endpoint
      );

      return this.convertFromGeminiResponse(data);
   }

   private convertReadableToResponse(readable: Readable): Response {
      return new Response(readable as unknown as ReadableStream, {
         headers: new Headers(),
         status: 200,
         statusText: 'OK',
      });
   }

   async generateContentStream(request: GenerateContentRequest, options?: StreamOptions): Promise<GenerateContentResponse> {
      MessageValidator.validateContents(request.contents);
      const endpoint = `/v1beta/models/${this.httpClient.getConfig().model}:streamGenerateContent`;
      const response = await this.httpClient.streamRequest(
         {
            method: 'POST',
            body: JSON.stringify(request),
         },
         endpoint
      );

      return this.streamProcessor.processStream(this.convertReadableToResponse(response), options);
   }

   async *generateContentStreamAsync(request: GenerateContentRequest): AsyncGenerator<any> {
      logger.info('Generating content stream asynchronously');
      try {
         MessageValidator.validateContents(request.contents);

         const endpoint = `/v1beta/models/${this.httpClient.getConfig().model}:streamGenerateContent?key=${this.httpClient.getConfig().apiKey}`;
         const response = await this.httpClient.streamRequest(
            {
               method: 'POST',
               body: JSON.stringify(request),
            },
            endpoint
         );

         yield* this.streamProcessor.createAsyncGenerator(this.convertReadableToResponse(response));
      } catch (error) {
         logger.error('Error in generateContentStreamAsync:', error);
         throw error;
      }
   }

   async chat(
      message: string,
      options: {
         systemInstruction?: string;
         configs?: LLMConfig;
         tools?: Tool[];
         sessionId?: string;
      } = {}
   ): Promise<GenerateContentResponse> {
      const contents = ContentBuilder.textOnly(message);

      const request: GenerateContentRequest = {
         contents,
         generationConfig: options.configs?.generationConfig,
         tools: options.tools,
      };

      if (options.systemInstruction) {
         request.systemInstruction = {
            parts: [{ text: options.systemInstruction }],
         };
      }

      const response = await this.generateContent(request);

      return response;
   }

   async chatStream(
      message: string,
      options: {
         systemInstruction?: string;
         configs?: LLMConfig;
         tools?: Tool[];
         sessionId?: string;
         streamOptions?: StreamOptions;
      } = {}
   ): Promise<GenerateContentResponse> {
      const contents = ContentBuilder.textOnly(message);

      const request: GenerateContentRequest = {
         contents,
         generationConfig: options.configs?.generationConfig,
         tools: options.tools,
      };

      if (options.systemInstruction) {
         request.systemInstruction = {
            parts: [{ text: options.systemInstruction }],
         };
      }

      const response = await this.generateContentStream(request, options.streamOptions);

      return response;
   }

   async continueConversation(
      contents: Content[],
      options: {
         generationConfig?: LLMConfig['generationConfig'];
         tools?: Tool[];
      } = {}
   ): Promise<GenerateContentResponse> {
      const request: GenerateContentRequest = {
         contents,
         generationConfig: options.generationConfig,
         tools: options.tools,
      };
      const response = await this.generateContent(request);
      return response;
   }

   async callFunction(
      message: string,
      tools: Tool[],
      options: {
         generationConfig?: LLMConfig['generationConfig'];
         systemInstruction?: string;
      } = {}
   ): Promise<GenerateContentResponse> {
      const request: GenerateContentRequest = {
         contents: ContentBuilder.textOnly(message),
         tools,
         generationConfig: options.generationConfig,
      };

      if (options.systemInstruction) {
         request.systemInstruction = {
            parts: [{ text: options.systemInstruction }],
         };
      }

      return this.generateContent(request);
   }

   // Thinking mode
   async generateWithThinking(
      message: string,
      thinkingBudget: number = -1, // -1 for dynamic thinking
      options: {
         systemInstruction?: string;
         onThinking?: (thinking: string) => void;
      } = {}
   ): Promise<GenerateContentResponse> {
      const request: GenerateContentRequest = {
         contents: ContentBuilder.textOnly(message),
         generationConfig: {
            thinkingConfig: {
               thinkingBudget,
            },
         },
      };

      if (options.systemInstruction) {
         request.systemInstruction = {
            parts: [{ text: options.systemInstruction }],
         };
      }

      return this.generateContentStream(request, {
         onThinking: options.onThinking,
      });
   }

   get stream(): GoogleStreamProcessor {
      return this.streamProcessor;
   }
   updateConfig(newConfig: Partial<LLMConfig>): void {
      this.httpClient.updateConfig(newConfig);
   }

   getConfig(): LLMConfig {
      return this.httpClient.getConfig();
   }
}

export * from '../types';
export * from '../strategies/retry/expo';
export * from '../core/http-client';
export * from '../builder/ai.builder';
export * from '../strategies/stream/google.stream';
