const { TestHelpers } = require('../utils/test-helpers');
const { ProviderConfigs } = require('../configs/provider-configs');
const { TestData } = require('../data/test-data');

describe('Fallback Integration Tests', () => {
   describe('Multi-Provider Configuration', () => {
      test(
         'should create fallback client successfully',
         async () => {
            const config = ProviderConfigs.getFallbackConfig();
            const client = await TestHelpers.createClientSafely(config);

            expect(client).toBeDefined();
            expect(client.run).toBeInstanceOf(Function);
         },
         global.API_TIMEOUT
      );

      test(
         'should handle fallback logic with valid keys',
         async () => {
            if (!process.env.OPENAI_API_KEY && !process.env.GOOGLE_API_KEY) {
               console.warn('Skipping fallback test - no API keys provided');
               return;
            }

            const config = ProviderConfigs.getFallbackConfig();
            const client = await TestHelpers.createClientSafely(config);
            const response = await TestHelpers.runAndValidateResponse(client, TestData.getValidContent());

            TestHelpers.logResponse('Fallback', response);
         },
         global.API_TIMEOUT
      );

      test(
         'should handle when one provide fail to answer',
         async () => {
            const config = ProviderConfigs.getFallbackTriggerConfig();
            const client = await TestHelpers.createClientSafely(config);
            expect(client).toBeDefined;
            expect(client.run).toBeInstanceOf(Function);
            const response = await TestHelpers.runAndValidateResponse(client, TestData.getComplexContent());
            TestHelpers.logResponse('Fallback Tiggered:', response);
         },
         global.API_TIMEOUT
      );

      test(
         'should fail gracefully when all providers fail',
         async () => {
            const config = ProviderConfigs.getFallbackConfig('invalid-1', 'invalid-2');

            const error = await TestHelpers.expectError(async () => {
               const client = await TestHelpers.createClientSafely(config);
               await client.run(TestData.getValidContent());
            });
            TestHelpers.logError('Expected fallback', error);
         },
         global.API_TIMEOUT
      );
   });
});
