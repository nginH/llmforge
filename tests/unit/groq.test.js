const { TestHelpers } = require('../utils/test-helpers');
const { ProviderConfigs } = require('../configs/provider-configs');
const { TestData } = require('../data/test-data');

const modelsList = [
   'allam-2-7b',
   'compound-beta',
   'compound-beta-mini',
   'deepseek-r1-distill-llama-70b',
   'distil-whisper',
   'gemma-2-instruct',
   'llama-3-1-8b',
   'llama-3-3-70b',
   'llama-3-70b',
   'llama-3-8b',
   'llama-4-maverick-17b-128e',
   'llama-4-scout-17b-16e',
   'llama-guard-4-12b',
   'llama-prompt-guard-2-22m',
   'prompt-guard-2-86m',
   'mistral-saba-24b',
   'playai-tts',
   'playai-tts-arabic',
   'qwq-32b',
];
describe('Groq Provider Tests', () => {
   describe('Client Creation', () => {
      test(
         'should create Groq client successfully',
         async () => {
            if (TestHelpers.skipIfNoApiKey(process.env.GROQ_API_KEY, 'Groq')) {
               return;
            }

            const config = ProviderConfigs.getGroqConfig();
            const client = await TestHelpers.createClientSafely(config);

            expect(client).toBeDefined();
            expect(client.run).toBeInstanceOf(Function);
         },
         global.API_TIMEOUT
      );

      test(
         'should handle invalid API key',
         async () => {
            const invalidConfig = ProviderConfigs.getInvalidConfig('groq');

            const error = await TestHelpers.expectError(async () => {
               const client = await TestHelpers.createClientSafely(invalidConfig);
               await client.run(TestData.getValidContent());
            });

            TestHelpers.logError('Expected Groq', error);
         },
         global.API_TIMEOUT
      );
   });

   describe('API Interactions', () => {
      test(
         'should get response from Groq',
         async () => {
            if (TestHelpers.skipIfNoApiKey(process.env.GROQ_API_KEY, 'groq')) {
               return;
            }

            const config = ProviderConfigs.getGroqConfig();
            const client = await TestHelpers.createClientSafely(config);
            const response = await TestHelpers.runAndValidateResponse(client, TestData.getValidContent());

            TestHelpers.logResponse('Groq', response);
         },
         global.API_TIMEOUT
      );

      for (const model of modelsList) {
         test(
            `should handle complex conversations for model ${model}`,
            async () => {
               const config = ProviderConfigs.getGroqConfig(process.env.GROQ_API_KEY, model);
               const client = await TestHelpers.createClientSafely(config);
               const response = await TestHelpers.runAndValidateResponse(client, TestData.getComplexContent());
               TestHelpers.logResponse(`Groq Complex for model ${model}`, response);
            },
            global.API_TIMEOUT
         );
      }

      test('stream output of open AI testing', async () => {
         if (TestHelpers.skipIfNoApiKey(process.env.GROQ_API_KEY, 'Groq')) {
            return;
         }
         const config = ProviderConfigs.getGroqConfigWithStream(process.env.GROQ_API_KEY, 'Groq');
         const client = await TestHelpers.createClientSafely(config);
         expect(client).toBeDefined();
         try {
            const stream = await client.run(TestData.getComplexContent());
            for await (const chunk of stream) {
               TestHelpers.logResponse('Groq Stream Chunk:', chunk);
            }
         } catch (error) {
            TestHelpers.logError('Error during Groq stream test:', error);
            throw error;
         }
      });
   });
});
