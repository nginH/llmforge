import { GroqStreamProcessor } from '../strategies/stream/groq.stream';
import { RetryHandler } from '../strategies/retry/expo';
import { GenerateContentRequest, GenerateContentResponse, GroqChatCompletionResponse, HttpClient, LLMConfig } from './google.adapter';
import { CommanMethods } from './comman';
import { logger } from '../utils/logger';

export class GroqClient {
   private httpClient: HttpClient;
   private retryHandler: RetryHandler;
   private streamProcessor: GroqStreamProcessor;

   constructor(config: LLMConfig, baseUrl: string, retryHandler?: RetryHandler) {
      this.retryHandler = new RetryHandler({
         maxRetries: config.retryConfig?.maxRetries ?? 1,
         retryDelay: config.retryConfig?.retryDelay ?? 0,
      });

      this.httpClient = new HttpClient(config, 'https://api.groq.com/', this.retryHandler);
      this.streamProcessor = new GroqStreamProcessor();
   }

   private payloadConstructor(contents: GenerateContentRequest) {
      return {
         messages: CommanMethods.omitModelToAssistantInContents(contents.contents),
         model: this.httpClient.getConfig().model,
         temperature: contents.generationConfig?.temperature ?? this.httpClient.getConfig().generationConfig?.temperature ?? 0.7,
         max_completion_tokens: contents.generationConfig?.maxOutputTokens ?? this.httpClient.getConfig().generationConfig?.maxOutputTokens ?? 1024,
         top_p: contents.generationConfig?.topP ?? this.httpClient.getConfig().generationConfig?.topP ?? 1.0,
         stream: this.httpClient.getConfig().stream ?? false,
         stop: contents.generationConfig?.stopSequences ?? this.httpClient.getConfig().generationConfig?.stopSequences ?? null,
      };
   }

   public async generateContent(conent: GenerateContentRequest): Promise<GenerateContentResponse> {
      CommanMethods.validateContents(conent.contents);
      logger.info('Static Generation of Content: GROQ');
      const response = await this.httpClient.request<GroqChatCompletionResponse>(
         {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               Authorization: `Bearer ${this.httpClient.getConfig().apiKey}`,
            },
            body: JSON.stringify(this.payloadConstructor(conent)),
         },
         false,
         `/openai/v1/chat/completions`
      );

      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
         logger.error('Groq API did not return a valid choices array. Full response:', response);
         throw new Error(`Groq API did not return a valid choices array. Response: ${JSON.stringify(response)}`);
      }

      return {
         resp_id: response.id,
         output: response.choices[0].message.content,
         created_at: response.created,
         model: response.model,
         usage: {
            input_tokens: response.usage.prompt_tokens,
            output_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens,
         },
         status: 'success',
      };
   }

   async *generateContentStreamAsync(request: GenerateContentRequest): AsyncGenerator<any> {
      logger.info('Generating content stream asynchronously for request: %j', request);
      try {
         CommanMethods.validateContents(request.contents);
         logger.info('Streaming generation (async)');
         const response = await this.httpClient.streamRequest(
            {
               method: 'POST',
               body: JSON.stringify(this.payloadConstructor(request)),
               headers: {
                  Authorization: `Bearer ${this.httpClient.getConfig().apiKey}`,
                  'Content-Type': 'application/json',
               },
            },
            `/openai/v1/chat/completions`
         );

         yield* this.streamProcessor.createAsyncGenerator(CommanMethods.convertReadableToResponse(response));
      } catch (error) {
         console.error('Error in generateContentStreamAsync:', error);
         throw error;
      }
   }

   get stream(): GroqStreamProcessor {
      return this.streamProcessor;
   }
   updateConfig(newConfig: Partial<LLMConfig>): void {
      this.httpClient.updateConfig(newConfig);
   }

   getConfig(): LLMConfig {
      return this.httpClient.getConfig();
   }
}
