import {
  Config,
  GenerateContentRequest,
  GenerateContentResponse,
  Tool,
  Content,
} from '../types';

import { HttpClient } from '../core/http-client';
import { RetryHandler } from '../strategies/retry/expo';
import { ContentBuilder, MessageValidator } from '../builder/ai.builder';
import { StreamProcessor, StreamOptions } from '../strategies/stream/google.stream';
import { Readable } from 'stream';
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
  private streamProcessor: StreamProcessor;
  constructor(config: Config) {
    this.retryHandler = new RetryHandler({
      maxRetries: config.maxRetries,
      retryDelay: config.retryDelay,
    });


    this.httpClient = new HttpClient(config, config.baseUrl ?? 'https://generativelanguage.googleapis.com', this.retryHandler);
    this.streamProcessor = new StreamProcessor();
  }

  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    MessageValidator.validateContents(request.contents);

    const endpoint = `/v1beta/models/${this.httpClient.getConfig().model}:generateContent`;
    return this.httpClient.request<GenerateContentResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  private convertReadableToResponse(readable: Readable): Response {
    return new Response(readable as unknown as ReadableStream, {
      headers: new Headers(),
      status: 200,
      statusText: 'OK'
    });
  }

  async generateContentStream(
    request: GenerateContentRequest,
    options?: StreamOptions
  ): Promise<GenerateContentResponse> {
    MessageValidator.validateContents(request.contents);

    const endpoint = `/v1beta/models/${this.httpClient.getConfig().model}:streamGenerateContent`;
    const response = await this.httpClient.streamRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return this.streamProcessor.processStream(this.convertReadableToResponse(response), options);
  }

  async* generateContentStreamAsync(request: GenerateContentRequest): AsyncGenerator<any> {
    MessageValidator.validateContents(request.contents);

    const endpoint = `/v1beta/models/${this.httpClient.getConfig().model}:streamGenerateContent`;
    const response = await this.httpClient.streamRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    yield* this.streamProcessor.createAsyncGenerator(this.convertReadableToResponse(response));
  }


  async chat(
    message: string,
    options: {
      systemInstruction?: string;
      configs?: Config;
      tools?: Tool[];
      sessionId?: string;
    } = {}
  ): Promise<GenerateContentResponse> {
    const contents = ContentBuilder.textOnly(message);

    const request: GenerateContentRequest = {
      contents,
      generationConfig: options.configs?.GenerationConfig,
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
      configs?: Config;
      tools?: Tool[];
      sessionId?: string;
      streamOptions?: StreamOptions;
    } = {}
  ): Promise<GenerateContentResponse> {
    const contents = ContentBuilder.textOnly(message);

    const request: GenerateContentRequest = {
      contents,
      generationConfig: options.configs?.GenerationConfig,
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
      generationConfig?: Config['GenerationConfig'];
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

  async analyzeImage(
    base64Image: string,
    mimeType: string,
    prompt: string,
    options: {
      generationConfig?: Config['GenerationConfig'];
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
      generationConfig?: Config['GenerationConfig'];
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

  // Function calling
  async callFunction(
    message: string,
    tools: Tool[],
    options: {
      generationConfig?: Config['GenerationConfig'];
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


  get stream(): StreamProcessor {
    return this.streamProcessor;
  }

  // Configuration methods
  updateConfig(newConfig: Partial<Config>): void {
    this.httpClient.updateConfig(newConfig);
  }

  getConfig(): Config {
    return this.httpClient.getConfig();
  }
}

export * from '../types';
export * from '../strategies/retry/expo';
export * from '../core/http-client';
export * from '../builder/ai.builder';
export * from '../strategies/stream/google.stream';