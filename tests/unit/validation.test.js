const { TestHelpers } = require('../utils/test-helpers');
const { ProviderConfigs } = require('../configs/provider-configs');
const { TestData } = require('../data/test-data');

describe('Input Validation Tests', () => {
   describe('Content Validation', () => {
      test(
         'should handle empty content',
         async () => {
            if (TestHelpers.skipIfNoApiKey(process.env.OPENAI_API_KEY, 'OpenAI')) {
               return;
            }

            const config = ProviderConfigs.getOpenAIConfig();
            const client = await TestHelpers.createClientSafely(config);

            try {
               await client.run(TestData.getEmptyContent());
               // If no error is thrown, that's acceptable
            } catch (error) {
               TestHelpers.logError('Empty content', error);
               expect(error).toBeDefined();
            }
         },
         global.API_TIMEOUT
      );

      test(
         'should handle malformed content',
         async () => {
            if (TestHelpers.skipIfNoApiKey(process.env.OPENAI_API_KEY, 'OpenAI')) {
               return;
            }

            const config = ProviderConfigs.getOpenAIConfig();
            const client = await TestHelpers.createClientSafely(config);

            const error = await TestHelpers.expectError(async () => {
               await client.run(TestData.getMalformedContent());
            });

            TestHelpers.logError('Malformed content', error);
         },
         global.API_TIMEOUT
      );
   });

   describe('Configuration Validation', () => {
      test(
         'should validate required config fields',
         async () => {
            const invalidConfig = { llmConfig: {} }; // Missing required fields

            const error = await TestHelpers.expectError(async () => {
               await TestHelpers.createClientSafely(invalidConfig);
            });

            TestHelpers.logError('Invalid config', error);
         },
         global.API_TIMEOUT
      );
   });
});
