import {
  LLMConfig,
  GenerateContentRequest,
  GenerateContentResponse,
  Tool,
  Content,
  Candidate,
  TextPart,
  ContentPart,
  FunctionDeclaration,
} from '../types';

import { HttpClient } from '../core/http-client';
import { RetryHandler } from '../strategies/retry/expo';
import { ContentBuilder, MessageValidator } from '../builder/ai.builder';
import { OpenAIStreamProcessor, StreamOptions } from '../strategies/stream/openai.stream';
import { OpenAIRequest, OpenAIResponse, OpenAIMessage } from '../types';
import { Readable } from 'stream';

export class OpenAIClient {
  private httpClient: HttpClient;
  private retryHandler: RetryHandler;
  private streamProcessor: OpenAIStreamProcessor;

  constructor(config: LLMConfig) {
    this.retryHandler = new RetryHandler({
      maxRetries: config.maxRetries,
      retryDelay: config.retryDelay,
    });
    this.httpClient = new HttpClient(
      config, 
      config.baseUrl ?? 'https://api.openai.com', 
      this.retryHandler
    );
    this.streamProcessor = new OpenAIStreamProcessor();
  }

  private convertReadableToResponse(readable: Readable): Response {
    return new Response(readable as unknown as ReadableStream, {
      headers: new Headers(),
      status: 200,
      statusText: 'OK'
    });
  }

  private convertToOpenAIRequest(request: GenerateContentRequest): OpenAIRequest {
    const openAIRequest: OpenAIRequest = {
      model: this.httpClient.getConfig().model,
      messages: this.convertContentsToMessages(request.contents),
    };

    // Handle generation config
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
          effort: budget === -1 ? 'medium' : budget > 1000 ? 'high' : 'low'
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
                content: { type: 'string' }
              },
              required: ['content'],
              additionalProperties: false
            }
          }
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
        content: request.systemInstruction.parts.map((part: TextPart) => part.text).join('\n')
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
      const role = content.role === 'model' ? 'assistant' : (content.role || 'user');
      const message: OpenAIMessage = {
        role: role as 'system' | 'user' | 'assistant',
        content: content.parts.map((part: ContentPart) => {
          if ('text' in part) {
            return part.text;
          }
          return '';
        }).join('\n')
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
            parameters: func.parameters
          }
        }));
      }
      return [];
    });
  }

  // Convert OpenAI response to Gemini format
  private convertFromOpenAIResponse(response: OpenAIResponse): GenerateContentResponse {
    const candidates: Candidate[] = response.choices.map((choice: any) => ({
      content: {
        role: 'model',
        parts: [{ text: choice.message.content }]
      },
      finishReason: choice.finish_reason,
      index: choice.index
    }));

    return {
      candidates,
      usageMetadata: response.usage ? {
        promptTokenCount: response.usage.prompt_tokens,
        candidatesTokenCount: response.usage.completion_tokens,
        totalTokenCount: response.usage.total_tokens
      } : undefined
    };
  }

  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    MessageValidator.validateContents(request.contents);

    const openAIRequest = this.convertToOpenAIRequest(request);
    
    // Determine endpoint based on model and features
    let endpoint = '/v1/chat/completions';
    if (openAIRequest.reasoning) {
      endpoint = '/v1/responses'; // For reasoning models
      openAIRequest.input = openAIRequest.messages;
      delete openAIRequest.messages;
    }

    const response = await this.httpClient.request<OpenAIResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify(openAIRequest),
      headers: {
        'Authorization': `Bearer ${this.httpClient.getConfig().apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return this.convertFromOpenAIResponse(response);
  }

  async generateContentStream(
    request: GenerateContentRequest,
    options?: StreamOptions
  ): Promise<GenerateContentResponse> {
    MessageValidator.validateContents(request.contents);

    const openAIRequest = { ...this.convertToOpenAIRequest(request), stream: true };
    
    let endpoint = '/v1/chat/completions';
    if (openAIRequest.reasoning) {
      endpoint = '/v1/responses';
      openAIRequest.input = openAIRequest.messages;
      delete openAIRequest.messages;
    }

    const response = await this.httpClient.streamRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(openAIRequest),
      headers: {
        'Authorization': `Bearer ${this.httpClient.getConfig().apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return this.streamProcessor.processStream(this.convertReadableToResponse(response), options);
  }

  async* generateContentStreamAsync(request: GenerateContentRequest): AsyncGenerator<any> {
    MessageValidator.validateContents(request.contents);

    const openAIRequest = { ...this.convertToOpenAIRequest(request), stream: true };
    
    let endpoint = '/v1/chat/completions';
    if (openAIRequest.reasoning) {
      endpoint = '/v1/responses';
      openAIRequest.input = openAIRequest.messages;
      delete openAIRequest.messages;
    }

    const response = await this.httpClient.streamRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(openAIRequest),
      headers: {
        'Authorization': `Bearer ${this.httpClient.getConfig().apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    yield* this.streamProcessor.createAsyncGenerator(this.convertReadableToResponse(response));
  }

  async chat(
    message: string,
    options: {
      systemInstruction?: string;
      generationConfig?: LLMConfig['GenerationConfig'];
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
      generationConfig?:LLMConfig['GenerationConfig'];
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
      generationConfig?:LLMConfig['GenerationConfig'];
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

  async analyzeImage(
    base64Image: string,
    mimeType: string,
    prompt: string,
    options: {
      generationConfig?:LLMConfig['GenerationConfig'];
    } = {}
  ): Promise<GenerateContentResponse> {
    const contents = ContentBuilder.create()
      .addImageFromBase64(base64Image, mimeType, prompt)
      .build();

    return this.generateContent({
      contents,
      generationConfig: options.generationConfig,
    });
  }

  async analyzeDocument(
    base64Document: string,
    mimeType: string,
    prompt: string,
    options: {
      generationConfig?: LLMConfig['GenerationConfig'];
      useCache?: boolean;
      cacheTtl?: string;
    } = {}
  ): Promise<GenerateContentResponse> {
    const request: GenerateContentRequest = {
      contents: ContentBuilder.create()
        .addDocumentFromBase64(base64Document, mimeType, prompt)
        .build(),
      generationConfig: options.generationConfig,
    };

    return this.generateContent(request);
  }

  async callFunction(
    message: string,
    tools: Tool[],
    options: {
      generationConfig?:LLMConfig['GenerationConfig'];
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

    // Override effort if provided
    if (options.effort) {
      request.generationConfig!.thinkingConfig = {
        thinkingBudget: options.effort === 'high' ? 2000 : options.effort === 'low' ? 100 : 1000
      };
    }

    // Add JSON schema if provided
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

  // OpenAI-specific method for handling the exact curl request format
  async handleOpenAIRequest(openAIRequest: OpenAIRequest): Promise<OpenAIResponse> {
    let endpoint = '/v1/chat/completions';
    
    // Handle reasoning endpoint
    if (openAIRequest.reasoning || openAIRequest.input) {
      endpoint = '/v1/responses';
    }

    return this.httpClient.request<OpenAIResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify(openAIRequest),
      headers: {
        'Authorization': `Bearer ${this.httpClient.getConfig().apiKey}`,
        'Content-Type': 'application/json'
      }
    });
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

//   // Usage example for the exact curl request:
//   export class OpenAIRequestHandler {
//     private client: OpenAIClient;
  
//     constructor(config: LLMConfig) {
//       this.client = new OpenAIClient(config);
//     }
  
//     async handleCurlRequest(): Promise<OpenAIResponse> {
//       const request: OpenAIRequest = {
//         model: "o4-mini",
//         input: [
//           {
//             role: "user",
//             content: [
//               {
//                 type: "input_text",
//                 text: "hii there"
//               }
//             ]
//           },
//           {
//             role: "assistant",
//             content: [
//               {
//                 type: "output_text",
//                 text: "Hello! How can I help you today?"
//               }
//             ]
//           },
//           {
//             role: "user",
//             content: [
//               {
//                 type: "input_text",
//                 text: "what can you help with"
//               }
//             ]
//           },
//           {
//             role: "assistant", 
//             content: [
//               {
//                 type: "output_text",
//                 text: "I can help with a wide range of tasks..."
//               }
//             ]
//           },
//           {
//             role: "user",
//             content: [
//               {
//                 type: "input_text", 
//                 text: "hii there"
//               }
//             ]
//           }
//         ],
//         text: {
//           format: {
//             type: "json_schema",
//             name: "thinking_output",
//             strict: true,
//             schema: {
//               type: "object",
//               properties: {
//                 thinking: {
//                   type: "string",
//                   description: "Description of the thought process or reasoning."
//                 },
//                 final_output: {
//                   type: "string", 
//                   description: "Final result or conclusion derived from the thinking process."
//                 }
//               },
//               required: ["thinking", "final_output"],
//               additionalProperties: false
//             }
//           }
//         },
//         reasoning: {
//           effort: "medium"
//         },
//         tools: [],
//         store: true
//       };
  
//       return this.client.handleOpenAIRequest(request);
//     }
//   }
  
//   export * from '../types';
//   export * from '../strategies/retry/expo';
//   export * from '../core/http-client';
//   export * from '../builder/ai.builder';
//   export * from '../strategies/stream/openai.stream';
//   export { OpenAIRequest, OpenAIResponse, OpenAIMessage } from './openai-types';