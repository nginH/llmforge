import { Config, Content, GenerateContentResponse, LLMConfig } from 'index';

export interface streamResponse {
   type: 'delta' | 'done' | 'completed';
   token: string; //chunk of token
}

export interface streamResponseComplete extends streamResponse {
   completeOutput?: string;
   thinkingOutput?: string;
   model?: string;
   usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
   };
   status?: string;
   fallback?: {
      isUsed: boolean; // Indicates if fallback was used
      reason?: string; // Reason for fallback usage
   } | null;
}

export class RunnerClient {
   private LLMClients: [LLMConfig, any][] = [];

   private constructor(private readonly config: Config) {
      if (!this.config.llmConfig) {
         throw new Error('LLM configuration is required.');
      }
      this.setLLMConfigToDefault().catch(error => {
         throw new Error(`Failed to set LLM configuration to default: ${error.message}`);
      });
   }

   static async create(config: Config) {
      const client = new RunnerClient(config);
      await client.loadLLMClients();
      return client;
   }

   private async setLLMConfigToDefault(): Promise<void> {
      const normalize = (llmConfig: LLMConfig): LLMConfig => ({
         ...llmConfig,
         timeout: llmConfig.timeout || 30000,
         priority: llmConfig.priority || 1,
         retryConfig: llmConfig.retryConfig || { maxRetries: 0, retryDelay: 1000 },
         generationConfig: llmConfig.generationConfig || {
            responseMimeType: 'text/plain',
            temperature: 0.7,
            topP: 1.0,
            topK: 40,
            maxOutputTokens: 1024,
            stopSequences: [],
         },
         stream: llmConfig.stream || false,
      });

      if (Array.isArray(this.config.llmConfig)) {
         this.config.llmConfig = this.config.llmConfig.map(normalize);
      } else {
         this.config.llmConfig = normalize(this.config.llmConfig);
      }
   }

   private async loadLLMClients() {
      const { Factory } = await import('./providers/provider.factory');
      const llmConfigs = Array.isArray(this.config.llmConfig) ? this.config.llmConfig : [this.config.llmConfig];

      for (const llmConfig of llmConfigs) {
         const client = await new Factory(llmConfig).create();
         this.LLMClients.push([llmConfig, client]);
      }

      this.LLMClients.sort((a, b) => a[0].priority! - b[0].priority!);
   }

   async run(content: Content[]): Promise<GenerateContentResponse | AsyncGenerator<any> | streamResponse[]> {
      if (this.LLMClients.length === 0) {
         throw new Error('No LLM clients available to run the content.');
      }

      let isFallbackUsed = false;
      let reasonForFallback: { client: string; error: string }[] = [];

      for (const [llmConfig, client] of this.LLMClients) {
         try {
            const response = llmConfig.stream ? await client.generateContentStreamAsync({ contents: content }) : await client.generateContent({ contents: content });

            return response;
         } catch (error) {
            reasonForFallback.push({
               client: client.constructor.name,
               error: (error as Error).message,
            });
            isFallbackUsed = true;
         }

         if (!this.config.enableFallback) break;
      }
      if (isFallbackUsed && this.config.enableFallback) {
         return {
            resp_id: undefined,
            output: '',
            created_at: Date.now(),
            model: 'fallback',
            usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
            status: 'fallback',
            fallback: {
               isUsed: true,
               reason: reasonForFallback.map(r => `${r.client}: ${r.error}`).join(', '),
            },
         };
      }
      throw new Error(`All LLM clients failed: ${reasonForFallback.map(r => `${r.client}: ${r.error}`).join(', ')}`);
   }
}

export type { Content, Config } from './types/index';
