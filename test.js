require('dotenv').config();
const { exit } = require('process');
const { RunnerClient } = require('./dist');

const testContent = [
   {
      role: 'user',
      parts: [{ text: 'Hello! Can you tell me a short joke?' }],
   },
];

// Test OpenAI
async function testOpenAI() {
   console.log('\n=== Testing OpenAI ===');
   const openaiConfig = {
      llmConfig: {
         apiKey: process.env.OPENAI_API_KEY || '',
         provider: 'openai',
         model: 'gpt-3.5-turbo',
      },
   };

   try {
      const openaiClient = await RunnerClient.create(openaiConfig);
      const response = await openaiClient.run(testContent);
      console.log('OpenAI Response:', JSON.stringify(response, null, 2));
   } catch (error) {
      console.error('OpenAI Error:', error.message);
   }
}

// Test Gemini
async function testGemini() {
   console.log('\n=== Testing Gemini ===');
   const geminiConfig = {
      llmConfig: {
         apiKey: process.env.GOOGLE_API_KEY || 'your-google-api-key-here',
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
      },
      enableFallback: false,
   };

   try {
      const geminiClient = await RunnerClient.create(geminiConfig);
      const response = await geminiClient.run(testContent);
      console.log('Gemini Response:', JSON.stringify(response, null, 2));
   } catch (error) {
      console.error('Gemini Error:', error.message);
   }
}

// Test with fallback
async function testFallback() {
   console.log('\n=== Testing Fallback ===');
   const fallbackConfig = {
      llmConfig: [
         {
            apiKey: 'your-openai-api-key-here',
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
            apiKey: process.env.GOOGLE_API_KEY || 'your-google-api-key-here',
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

   try {
      const fallbackClient = await RunnerClient.create(fallbackConfig);
      const response = await fallbackClient.run(testContent);
      console.log('Fallback Response:', JSON.stringify(response, null, 2));
   } catch (error) {
      console.error('Fallback Error:', error.message);
   }
}

// Run all tests
async function runTests() {
   console.clear();
   console.log('🚀 Starting LLMForge Tests...\n');

   await testOpenAI();
   await testGemini();
   await testFallback();

   console.log('\n✅ Tests completed!');
   exit(0);
}

runTests().catch(console.error);
