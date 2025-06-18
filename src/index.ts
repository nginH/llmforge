import { Config, Content, GenerateContentResponse } from 'index';
export interface streamResponse {
   type: 'token' | 'complete';
   content: string; //chunk of token
   timestamp: Date;
}

export class RunnerClient {
   private LLMClient: any[] = [];
   private constructor(private readonly config: Config) {}

   static async create(config: Config) {
      const client = new RunnerClient(config);
      await client.loadLLMClient();
      return client;
   }

   private async loadLLMClient() {
      if (Array.isArray(this.config.llmConfig)) {
         const { Factory } = await import('./providers/provider.factory');
         for (const llmConfig of this.config.llmConfig) {
            const client = await new Factory(llmConfig).create();
            this.LLMClient.push(client);
         }
      } else {
         const { Factory } = await import('./providers/provider.factory');
         this.LLMClient = [await new Factory(this.config.llmConfig).create()];
      }
   }

   async run(content: Content[]) {
      if (!Array.isArray(this.LLMClient) || this.LLMClient.length === 0) {
         throw new Error('No LLM clients available to run the content.');
      }
      try {
         let isFallbackUsed = false;
         let reasonForFallback: { client: string; error: string }[] = [];
         const responses = [];
         for (const client of this.LLMClient) {
            try {
               const response: GenerateContentResponse = await client.generateContent({ contents: content });
               responses.push(response);
            } catch (error) {
               reasonForFallback.push({
                  client: client.constructor.name,
                  error: (error as Error).message,
               });
               isFallbackUsed = true;
            }
         }
         responses.forEach(response => {
            if (response.fallback) {
               response.fallback.isUsed = isFallbackUsed;
               response.fallback.reason = reasonForFallback.map((reason: { client: string; error: string }) => `${reason.client}: ${reason.error}`).join(', ');
            } else {
               response.fallback = {
                  isUsed: isFallbackUsed,
                  reason: reasonForFallback.map((reason: { client: string; error: string }) => `${reason.client}: ${reason.error}`).join(', '),
               };
            }
         });
         return responses.length > 0 ? responses[0] : null; // Returning first successful response if everythin is goes well
      } catch (error) {
         throw error;
      }
   }
}

export type { Content, Config } from './types/index';
