const { TestHelpers } = require('../utils/test-helpers');
const { ProviderConfigs } = require('../configs/provider-configs');
const { TestData } = require('../data/test-data');

const modelList = [
   'gemini-2.5-pro',
   'gemini-2.5-pro-preview-05-06',
   'gemini-2.5-flash',
   'gemini-2.5-flash-preview-04-17',
   'gemini-2.5-flash-lite-preview-06-17',
   'gemini-2.0-flash',
   'gemini-2.0-flash-lite',
   'gemma-3n-e4b-it',
   'gemma-3-1b-it',
   'gemma-3-4b-it',
   'gemma-3-12b-it',
   'gemma-3-27b-it',
   'learnlm-2.0-flash-experimental',
];

describe('Gemini Provider Tests', () => {
   describe('Client Creation', () => {
      test(
         'should create Gemini client successfully',
         async () => {
            if (TestHelpers.skipIfNoApiKey(process.env.GOOGLE_API_KEY, 'Gemini')) {
               return;
            }

            const config = ProviderConfigs.getGeminiConfig();
            const client = await TestHelpers.createClientSafely(config);

            expect(client).toBeDefined();
            expect(client.run).toBeInstanceOf(Function);
         },
         global.API_TIMEOUT
      );

      test(
         'should handle invalid API key',
         async () => {
            const invalidConfig = ProviderConfigs.getInvalidConfig('google');

            const error = await TestHelpers.expectError(async () => {
               const client = await TestHelpers.createClientSafely(invalidConfig);
               await client.run(TestData.getValidContent());
            });

            TestHelpers.logError('Expected Gemini', error);
         },
         global.API_TIMEOUT
      );
   });

   describe('API Interactions', () => {
      test(
         'should get response from Gemini',
         async () => {
            if (TestHelpers.skipIfNoApiKey(process.env.GOOGLE_API_KEY, 'Gemini')) {
               return;
            }

            const config = ProviderConfigs.getGeminiConfig();
            const client = await TestHelpers.createClientSafely(config);
            const response = await TestHelpers.runAndValidateResponse(client, TestData.getValidContent());

            TestHelpers.logResponse('Gemini', response);
         },
         global.API_TIMEOUT
      );

      for (const model in modelList) {
         test(
            `should respect generation config for model ${model}`,
            async () => {
               if (TestHelpers.skipIfNoApiKey(process.env.GOOGLE_API_KEY, 'Gemini')) {
                  return;
               }

               const config = ProviderConfigs.getGeminiConfig(process.env.GOOGLE_API_KEY, model);
               config.llmConfig.generationConfig.maxOutputTokens = 50;

               const client = await TestHelpers.createClientSafely(config);
               const response = await TestHelpers.runAndValidateResponse(client, TestData.getComplexContent());

               TestHelpers.logResponse(`Gemini model ${model} response: `, response);
            },
            global.API_TIMEOUT
         );
      }

      test('stream output of Gemini testing', async () => {
         if (TestHelpers.skipIfNoApiKey(process.env.OPENAI_API_KEY, 'OpenAI')) {
            return;
         }
         const config = ProviderConfigs.getGeminiConfigWithStream(process.env.GOOGLE_API_KEY, 'Gemini');
         const client = await TestHelpers.createClientSafely(config);
         expect(client).toBeDefined();
         try {
            const stream = await client.run(TestData.getComplexContent());
            for await (const chunk of stream) {
               TestHelpers.logResponse('gemini Stream Chunk:', chunk);
            }
         } catch (error) {
            TestHelpers.logError('Error during Gemini stream test:', error);
            throw error;
         }
      });
   });
});
