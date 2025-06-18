import { LLMConfig } from '../types';
export class Factory {
   constructor(private readonly config: LLMConfig) {}
   async create() {
      const supportedModels = ['openai', 'google'];
      const modelName = this.config.model.toLowerCase();
      if (!supportedModels.includes(modelName)) {
         throw new Error(`Model '${modelName}' is not supported. Supported models are: ${supportedModels.join(', ')}`);
      }
      const { [`${modelName}Client`]: Client } = await import(`./${modelName}.adapter`);
      return new Client(this.config);
   }
}
