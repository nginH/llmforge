const { TestHelpers } = require('../utils/test-helpers');
const { ProviderConfigs } = require('../configs/provider-configs');
const { TestData } = require('../data/test-data');

const modelsList = ['mistral-saba-24b'];
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
         console.log('MODEL IS :', model);
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
