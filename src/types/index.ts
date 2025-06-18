export interface LLMConfig {
    apiKey: string;// API key for authentication
    model: string;
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;// maximum number of retries for failed requests
    retryDelay?: number; // in milliseconds
    GenerationConfig?: GenerationConfig;
    priorty?: number; // lower number means higher priority
}

export interface Config {
    llmConfig: LLMConfig | LLMConfig[];
    enableFallback: boolean; // set to true to use fallback mechanism if the primary LLM fails as per the priority
}
export interface RetryConfig {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
    retryableStatusCodes: number[];
}

export interface ThinkingConfig {
    thinkingBudget?: number; // -1 for dynamic, 0 for off, positive number for fixed
}

interface GenerationConfig {
    thinkingConfig?: ThinkingConfig;
    responseMimeType?: string;
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
}

export interface TextPart {
    text: string;
}

export interface InlineDataPart {
    inline_data: {
        mime_type: string;
        data: string; // base64 encoded
    };
}

export interface FileDataPart {
    file_data: {
        mime_type: string;
        file_uri: string;
    };
}

export type ContentPart = TextPart | InlineDataPart | FileDataPart;

export interface Content {
    role?: 'user' | 'model' | 'system';
    parts: ContentPart[];
}

export interface FunctionDeclaration {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}

export interface Tool {
    functionDeclarations?: FunctionDeclaration[];
    url_context?: {};
    google_search?: {};
}

export interface SystemInstruction {
    parts: TextPart[];
}

export interface CachedContent {
    model: string;
    contents: Content[];
    systemInstruction?: SystemInstruction;
    ttl?: string;
}

export interface GenerateContentRequest {
    contents: Content[];
    generationConfig?: GenerationConfig;
    tools?: Tool[];
    systemInstruction?: SystemInstruction;
    cachedContent?: string;
}

export interface Candidate {
    content: Content;
    finishReason?: string;
    index?: number;
    safetyRatings?: any[];
}

export interface GenerateContentResponse {
    candidates?: Candidate[];
    promptFeedback?: any;
    usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
    };
}

export interface StreamChunk {
    candidates?: Candidate[];
    usageMetadata?: any;
}

export interface ChatMessage {
    role: 'user' | 'model' | 'system';
    content: string;
    timestamp?: Date;
}



export interface ErrorResponse {
    error: {
        code: number;
        message: string;
        status: string;
        details?: any[];
    };
}

export class GeminiError extends Error {
    constructor(
        message: string,
        public code?: number,
        public status?: string,
        public details?: any
    ) {
        super(message);
        this.name = 'GeminiError';
    }
}

export class RetryableError extends GeminiError {
    constructor(message: string, code?: number, status?: string, details?: any) {
        super(message, code, status, details);
        this.name = 'RetryableError';
    }
}

export class NonRetryableError extends GeminiError {
    constructor(message: string, code?: number, status?: string, details?: any) {
        super(message, code, status, details);
        this.name = 'NonRetryableError';
    }
}


export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{
        type: 'text' | 'input_text' | 'output_text';
        text: string;
    }>;
}

export interface OpenAIRequest {
    model: string;
    input?: OpenAIMessage[];
    messages?: OpenAIMessage[];
    text?: {
        format?: {
            type: 'json_schema';
            name: string;
            strict: boolean;
            schema: any;
        };
    };
    reasoning?: {
        effort: 'low' | 'medium' | 'high';
    };
    tools?: any[];
    store?: boolean;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string[];
}

export interface OpenAIResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}



// openai-types.ts
export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{
        type: 'text' | 'input_text' | 'output_text';
        text: string;
    }>;
}

export interface OpenAIRequest {
    model: string;
    input?: OpenAIMessage[];
    messages?: OpenAIMessage[];
    text?: {
        format?: {
            type: 'json_schema';
            name: string;
            strict: boolean;
            schema: any;
        };
    };
    reasoning?: {
        effort: 'low' | 'medium' | 'high';
    };
    tools?: any[];
    store?: boolean;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string[];
}

export interface OpenAIResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
