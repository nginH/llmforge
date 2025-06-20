class ProviderConfigs {
   static getOpenAIConfig(apiKey = process.env.OPENAI_API_KEY) {
      return {
         llmConfig: {
            apiKey: apiKey || 'test-key',
            provider: 'openai',
            model: 'gpt-3.5-turbo',
         },
      };
   }

   static getOpenAIConfigWithStream(apiKey = process.env.OPENAI_API_KEY) {
      return {
         llmConfig: {
            apiKey: apiKey || 'test-key',
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            stream: true,
         },
      };
   }

   static getGroqConfigWithStream(apiKey = process.env.GROQ_API_KEY) {
      return {
         llmConfig: {
            apiKey: apiKey || 'test-key',
            provider: 'groq',
            model: 'mistral-saba-24b',
            stream: true,
         },
      };
   }

   static getGroqConfig(apiKey = process.env.GROQ_API_KEY, model = 'mistral-saba-24b') {
      return {
         llmConfig: {
            apiKey: apiKey || 'test-key',
            provider: 'groq',
            model,
            stream: false,
         },
      };
   }

   static getGeminiConfig(apiKey = process.env.GOOGLE_API_KEY, model = 'gemini-1.5-flash') {
      return {
         llmConfig: {
            apiKey: apiKey || 'test-key',
            provider: 'google',
            model,
            generationConfig: {
               temperature: 0.7,
               maxOutputTokens: 150,
            },
            retryConfig: {
               maxRetries: 3,
               retryDelay: 1000,
            },
         },
         enableFallback: false,
      };
   }

   static getGeminiConfigWithStream(apiKey = process.env.GOOGLE_API_KEY) {
      return {
         llmConfig: {
            apiKey: apiKey || 'test-key',
            provider: 'google',
            model: 'gemini-1.5-flash',
            generationConfig: {
               temperature: 0.7,
               maxOutputTokens: 150,
            },
            retryConfig: {
               maxRetries: 3,
               retryDelay: 1000,
            },
            stream: true,
         },
         enableFallback: false,
      };
   }

   static getFallbackConfig(openaiKey = process.env.OPENAI_API_KEY, googleKey = process.env.GOOGLE_API_KEY) {
      return {
         llmConfig: [
            {
               apiKey: openaiKey || 'invalid-openai-key',
               provider: 'openai',
               model: 'gpt-3.5-turbo',
               priority: 1,
               generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 150,
               },
               retryConfig: {
                  maxRetries: 3,
                  retryDelay: 1000,
               },
            },
            {
               apiKey: googleKey || 'invalid-google-key',
               provider: 'google',
               model: 'gemini-1.5-flash',
               priority: 2,
               generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 150,
               },
               retryConfig: {
                  maxRetries: 3,
                  retryDelay: 1000,
               },
            },
         ],
         enableFallback: true,
      };
   }
   static getFallbackTriggerConfig(openaiKey = process.env.OPENAI_API_KEY, googleKey = process.env.GOOGLE_API_KEY) {
      return {
         llmConfig: [
            {
               apiKey: 'invalid-openai-key',
               provider: 'openai',
               model: 'gpt-3.5-turbo',
               priority: 1,
            },
            {
               apiKey: googleKey || 'invalid-google-key',
               provider: 'google',
               model: 'gemini-1.5-flash',
               priority: 2,
            },
         ],
         enableFallback: true,
      };
   }

   static getInvalidConfig(provider) {
      provider = provider.toLowerCase();
      if (provider === 'openai') {
         return this.getOpenAIConfig('invalid-key');
      } else if (provider === 'google') {
         return this.getGeminiConfig('invalid-key');
      } else if (provider === 'groq') {
         return this.getGroqConfig('invalie-key');
      }
      throw new Error(`Unknown provider: ${provider}`);
   }
}

module.exports = { ProviderConfigs };
