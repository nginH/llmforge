import { LLMConfig, GenerateContentRequest, GenerateContentResponse, Tool, Content, TextPart, ContentPart, FunctionDeclaration } from '../types';

import { HttpClient } from '../core/http-client';
import { RetryHandler } from '../strategies/retry/expo';
import { ContentBuilder, MessageValidator } from '../builder/ai.builder';
import { OpenAIStreamProcessor, StreamOptions } from '../strategies/stream/openai.stream';
import { OpenAIRequest, OpenAIResponse, OpenAIMessage } from '../types';
import { Readable } from 'stream';
import { logger } from '../utils/logger';

export class OpenAIClient {
   private httpClient: HttpClient;
   private retryHandler: RetryHandler;
   private streamProcessor: OpenAIStreamProcessor;

   constructor(config: LLMConfig) {
      this.retryHandler = new RetryHandler({
         maxRetries: config.retryConfig?.maxRetries ?? 1,
         retryDelay: config.retryConfig?.retryDelay ?? 0,
      });
      this.httpClient = new HttpClient(config, config.baseUrl ?? 'https://api.openai.com', this.retryHandler);
      this.streamProcessor = new OpenAIStreamProcessor();
   }

   private convertReadableToResponse(readable: Readable): Response {
      return new Response(readable as unknown as ReadableStream, {
         headers: new Headers(),
         status: 200,
         statusText: 'OK',
      });
   }

   private convertToOpenAIRequest(request: GenerateContentRequest): OpenAIRequest {
      const openAIRequest: OpenAIRequest = {
         model: this.httpClient.getConfig().model,
         input: this.convertContentsToMessages(request.contents),
         text: {
            format: {
               type: 'text',
            },
         },
      };

      if (request.generationConfig) {
         const config = request.generationConfig;
         if (config.temperature !== undefined) openAIRequest.temperature = config.temperature;
         if (config.maxOutputTokens !== undefined) openAIRequest.max_tokens = config.maxOutputTokens;
         if (config.topP !== undefined) openAIRequest.top_p = config.topP;
         if (config.stopSequences !== undefined) openAIRequest.stop = config.stopSequences;

         // Handle thinking/reasoning config
         if (config.thinkingConfig?.thinkingBudget !== undefined) {
            const budget = config.thinkingConfig.thinkingBudget;
            openAIRequest.reasoning = {
               effort: budget === -1 ? 'medium' : budget > 1000 ? 'high' : 'low',
            };
         }

         // Handle JSON schema format
         if (config.responseMimeType === 'application/json') {
            openAIRequest.text = {
               format: {
                  type: 'json_schema',
                  name: 'response_format',
                  strict: true,
                  schema: {
                     type: 'object',
                     properties: {
                        content: { type: 'string' },
                     },
                     required: ['content'],
                     additionalProperties: false,
                  },
               },
            };
         }
      }

      // Handle tools
      if (request.tools && request.tools.length > 0) {
         openAIRequest.tools = this.convertToolsToOpenAI(request.tools);
      }

      // Handle system instruction
      if (request.systemInstruction) {
         const systemMessage: OpenAIMessage = {
            role: 'system',
            content: request.systemInstruction.parts.map((part: TextPart) => part.text).join('\n'),
         };
         if (openAIRequest.messages) {
            openAIRequest.messages.unshift(systemMessage);
         } else {
            openAIRequest.messages = [systemMessage];
         }
      }
      return openAIRequest;
   }

   private convertContentsToMessages(contents: Content[]): OpenAIMessage[] {
      return contents.map(content => {
         const role = content.role === 'model' ? 'assistant' : content.role || 'user';
         const message: OpenAIMessage = {
            role: role as 'system' | 'user' | 'assistant',
            content: content.parts
               .map((part: ContentPart) => {
                  if ('text' in part) {
                     return part.text;
                  }
                  return '';
               })
               .join('\n'),
         };
         return message;
      });
   }

   private convertToolsToOpenAI(tools: Tool[]): any[] {
      return tools.flatMap(tool => {
         if (tool.functionDeclarations) {
            return tool.functionDeclarations.map((func: FunctionDeclaration) => ({
               type: 'function',
               function: {
                  name: func.name,
                  description: func.description,
                  parameters: func.parameters,
               },
            }));
         }
         return [];
      });
   }

   private convertFromOpenAIResponse(response: OpenAIResponse): GenerateContentResponse {
      logger.info('OpenAI Response:', JSON.stringify(response, null, 2));
      logger.info('OpenAI Response ID:', JSON.stringify(response.output[0]?.id, null, 2) || 'N/A');
      logger.info('OpenAI Response Output:', response.output[0]?.content[0].text || 'N/A');
      return {
         resp_id: response.id,
         output: response.output[0]?.content[0].text || '',
         status: response?.status == 'completed' ? 'success' : response?.status || 'unknown',
         created_at: response.created_at,
         model: response.model,
         usage: response.usage
            ? {
                 input_tokens: response.usage.input_tokens,
                 output_tokens: response.usage.output_tokens,
                 total_tokens: response.usage.total_tokens,
              }
            : undefined,
      };
   }

   async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
      MessageValidator.validateContents(request.contents);

      const openAIRequest = this.convertToOpenAIRequest(request);
      logger.info('OpenAI Request:', JSON.stringify(openAIRequest, null, 2));
      const response = await this.httpClient.request<OpenAIResponse>(
         {
            method: 'POST',
            body: JSON.stringify(openAIRequest),
            headers: {
               Authorization: `Bearer ${this.httpClient.getConfig().apiKey}`,
               'Content-Type': 'application/json',
            },
         },
         false,
         `/v1/responses`
      );

      return this.convertFromOpenAIResponse(response);
   }

   async generateContentStream(request: GenerateContentRequest, options?: StreamOptions): Promise<GenerateContentResponse> {
      MessageValidator.validateContents(request.contents);

      const openAIRequest = { ...this.convertToOpenAIRequest(request), stream: true };

      const response = await this.httpClient.streamRequest(this.httpClient.getConfig().baseUrl ?? 'https://api.openai.com/v1/responses', {
         method: 'POST',
         body: JSON.stringify(openAIRequest),
         headers: {
            Authorization: `Bearer ${this.httpClient.getConfig().apiKey}`,
            'Content-Type': 'application/json',
         },
      });

      return this.streamProcessor.processStream(this.convertReadableToResponse(response), options);
   }

   async *generateContentStreamAsync(request: GenerateContentRequest): AsyncGenerator<any> {
      MessageValidator.validateContents(request.contents);

      const openAIRequest = { ...this.convertToOpenAIRequest(request), stream: true };

      const response = await this.httpClient.streamRequest(this.httpClient.getConfig().baseUrl ?? 'https://api.openai.com/v1/responses', {
         method: 'POST',
         body: JSON.stringify(openAIRequest),
         headers: {
            Authorization: `Bearer ${this.httpClient.getConfig().apiKey}`,
            'Content-Type': 'application/json',
         },
      });

      yield* this.streamProcessor.createAsyncGenerator(this.convertReadableToResponse(response));
   }

   async chat(
      message: string,
      options: {
         systemInstruction?: string;
         generationConfig?: LLMConfig['generationConfig'];
         tools?: Tool[];
         sessionId?: string;
      } = {}
   ): Promise<GenerateContentResponse> {
      const contents = ContentBuilder.textOnly(message);

      const request: GenerateContentRequest = {
         contents,
         generationConfig: options.generationConfig,
         tools: options.tools,
      };

      if (options.systemInstruction) {
         request.systemInstruction = {
            parts: [{ text: options.systemInstruction }],
         };
      }

      return this.generateContent(request);
   }

   async chatStream(
      message: string,
      options: {
         systemInstruction?: string;
         generationConfig?: LLMConfig['generationConfig'];
         tools?: Tool[];
         sessionId?: string;
         streamOptions?: StreamOptions;
      } = {}
   ): Promise<GenerateContentResponse> {
      const contents = ContentBuilder.textOnly(message);

      const request: GenerateContentRequest = {
         contents,
         generationConfig: options.generationConfig,
         tools: options.tools,
      };

      if (options.systemInstruction) {
         request.systemInstruction = {
            parts: [{ text: options.systemInstruction }],
         };
      }

      return this.generateContentStream(request, options.streamOptions);
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
      return this.generateContent(request);
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

   // OpenAI-specific thinking/reasoning mode
   async generateWithThinking(
      message: string,
      thinkingBudget: number = -1,
      options: {
         systemInstruction?: string;
         onThinking?: (thinking: string) => void;
         effort?: 'low' | 'medium' | 'high';
         jsonSchema?: any;
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

      if (options.effort) {
         request.generationConfig!.thinkingConfig = {
            thinkingBudget: options.effort === 'high' ? 2000 : options.effort === 'low' ? 100 : 1000,
         };
      }

      if (options.jsonSchema) {
         request.generationConfig!.responseMimeType = 'application/json';
      }

      if (options.systemInstruction) {
         request.systemInstruction = {
            parts: [{ text: options.systemInstruction }],
         };
      }

      return this.generateContentStream(request, {
         onThinking: options.onThinking,
      });
   }

   async handleOpenAIRequest(openAIRequest: OpenAIRequest): Promise<OpenAIResponse> {
      return this.httpClient.request<OpenAIResponse>(
         {
            method: 'POST',
            body: JSON.stringify(openAIRequest),
            headers: {
               Authorization: `Bearer ${this.httpClient.getConfig().apiKey}`,
               'Content-Type': 'application/json',
            },
         },
         false,
         `/v1/responses`
      );
   }

   get stream(): OpenAIStreamProcessor {
      return this.streamProcessor;
   }

   updateConfig(newConfig: Partial<LLMConfig>): void {
      this.httpClient.updateConfig(newConfig);
   }

   getConfig(): LLMConfig {
      return this.httpClient.getConfig();
   }
}
