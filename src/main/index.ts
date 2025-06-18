import { Config, Content, LLMConfig } from 'index';
import { GeminiClient } from '../providers/google.adapter';
import { OpenAIClient } from '../providers/openai.adapter';

export interface finalResponse {
   type: 'complete';
   content: string;
   thinking: string;
   model: string;
   usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
   };
}

export interface streamResponse {
   type: 'token' | 'complete';
   content: string; //chunk of token
   timestamp: Date;
}

export class RunnerClient {
   private LLMClient: any[] = [];
   constructor(private readonly config: Config) {
      if (config.enableFallback == true) {
         if (!Array.isArray(config.llmConfig)) {
            throw new Error('Since Fallback is enabled, llmConfig must be an array');
         }
      }

      this.loadLLMClient()
         .then(clients => {
            this.LLMClient = clients;
         })
         .catch(error => {
            throw new Error('Error loading LLM clients: ' + error.message);
         });
   }

   private async loadLLMClient() {
      if (Array.isArray(this.config.llmConfig)) {
         const { Factory } = await import('../providers/provider.factory');
         this.config.llmConfig.forEach(async (llmConfig: LLMConfig) => {
            const client = await new Factory(llmConfig).create();
            this.LLMClient.push(client);
         });
      } else {
         const { Factory } = await import('../providers/provider.factory');
         this.LLMClient = [await new Factory(this.config.llmConfig).create()];
      }
      return this.LLMClient;
   }

   async run(content: Content[]) {
      if (!Array.isArray(this.LLMClient) || this.LLMClient.length === 0) {
         throw new Error('No LLM clients available to run the content.');
      }

      const results = await Promise.all(
         this.LLMClient.map(async (client: any) => {
            try {
               return await client.generateContent(content);
            } catch (error) {
               console.error('Error generating content with client:', error);
               return null; // Handle error gracefully
            }
         })
      );
   }
}
