const { TestHelpers } = require('../utils/test-helpers');
const { ProviderConfigs } = require('../configs/provider-configs');
const { TestData } = require('../data/test-data');

describe('OpenAI Provider Tests', () => {
   describe('Client Creation', () => {
      test(
         'should create OpenAI client successfully',
         async () => {
            if (TestHelpers.skipIfNoApiKey(process.env.OPENAI_API_KEY, 'OpenAI')) {
               return;
            }

            const config = ProviderConfigs.getOpenAIConfig();
            const client = await TestHelpers.createClientSafely(config);

            expect(client).toBeDefined();
            expect(client.run).toBeInstanceOf(Function);
         },
         global.API_TIMEOUT
      );

      test(
         'should handle invalid API key',
         async () => {
            const invalidConfig = ProviderConfigs.getInvalidConfig('openai');

            const error = await TestHelpers.expectError(async () => {
               const client = await TestHelpers.createClientSafely(invalidConfig);
               await client.run(TestData.getValidContent());
            });

            TestHelpers.logError('Expected OpenAI', error);
         },
         global.API_TIMEOUT
      );
   });

   describe('API Interactions', () => {
      test(
         'should get response from OpenAI',
         async () => {
            if (TestHelpers.skipIfNoApiKey(process.env.OPENAI_API_KEY, 'OpenAI')) {
               return;
            }

            const config = ProviderConfigs.getOpenAIConfig();
            const client = await TestHelpers.createClientSafely(config);
            const response = await TestHelpers.runAndValidateResponse(client, TestData.getValidContent());

            TestHelpers.logResponse('OpenAI', response);
         },
         global.API_TIMEOUT
      );

      test(
         'should handle complex conversations',
         async () => {
            if (TestHelpers.skipIfNoApiKey(process.env.OPENAI_API_KEY, 'OpenAI')) {
               return;
            }

            const config = ProviderConfigs.getOpenAIConfig();
            const client = await TestHelpers.createClientSafely(config);
            const response = await TestHelpers.runAndValidateResponse(client, TestData.getComplexContent());

            TestHelpers.logResponse('OpenAI Complex', response);
         },
         global.API_TIMEOUT
      );

      test('stream output of open AI testing', async () => {
         if (TestHelpers.skipIfNoApiKey(process.env.OPENAI_API_KEY, 'OpenAI')) {
            return;
         }
         const config = ProviderConfigs.getOpenAIConfigWithStream(process.env.OPENAI_API_KEY, 'OpenAI');
         const client = await TestHelpers.createClientSafely(config);
         expect(client).toBeDefined();
         try {
            const stream = await client.run(TestData.getComplexContent());
            for await (const chunk of stream) {
               TestHelpers.logResponse('openAI Stream Chunk:', chunk);
            }
         } catch (error) {
            TestHelpers.logError('Error during OpenAI stream test:', error);
            throw error;
         }
      });
   });
});
