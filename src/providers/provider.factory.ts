import { logger } from '../utils/logger';
import { LLMConfig } from '../types';
export class Factory {
   constructor(private readonly config: LLMConfig) {}
   async create() {
      try {
         const supportedProviders = ['openai', 'google', 'groq'];
         const providerName = this.config.provider.toLowerCase() as 'openai' | 'google' | 'groq';
         if (!supportedProviders.includes(providerName)) {
            throw new Error(`Provider '${providerName}' is not supported. Supported providers are: ${supportedProviders.join(', ')}`);
         }
         const classMap: Record<'openai' | 'google' | 'groq', string> = {
            openai: 'OpenAIClient',
            google: 'GeminiClient',
            groq: 'GroqClient',
         };
         const className = classMap[providerName];
         const module = await import(`./${providerName}.adapter`);
         const Client = module[className];
         return new Client(this.config);
      } catch (error) {
         logger.error(`Error creating client for provider '${this.config.provider}':`, error);
         throw new Error(`Failed to create client for provider '${this.config.provider}': ${(error as Error).message}`);
      }
   }
}
