import { LLMConfig } from '../types';
export class Factory {
   constructor(private readonly config: LLMConfig) {}
   async create() {
      const supportedProviders = ['openai', 'google'];
      const providerName = this.config.provider.toLowerCase() as 'openai' | 'google';
      if (!supportedProviders.includes(providerName)) {
         throw new Error(`Provider '${providerName}' is not supported. Supported providers are: ${supportedProviders.join(', ')}`);
      }
      const classMap: Record<'openai' | 'google', string> = {
         openai: 'OpenAIClient',
         google: 'GeminiClient',
      };
      const className = classMap[providerName];
      const module = await import(`./${providerName}.adapter`);
      const Client = module[className];
      return new Client(this.config);
   }
}
