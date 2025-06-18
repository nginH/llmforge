# LLMForge

A unified, pluggable AI runtime to run prompts across OpenAI, Gemini, Ollama, and custom models — all with a single line of code.

**🚀 Lightweight & Fast** - Only 42.8 kB package size, 381.1 kB unpacked

## Features

- **Unified Interface**: Single API for multiple AI providers
- **Lightweight**: Only 42.8 kB package size for minimal bundle impact
- **Intelligent Fallback**: Automatic failover between providers
- **Configurable Retry Logic**: Built-in retry mechanisms with customizable delays
- **Token Usage Tracking**: Detailed usage statistics for cost monitoring
- **TypeScript Support**: Full type safety and IntelliSense
- **Flexible Configuration**: Per-provider settings and generation parameters

## Installation

```bash
npm install llmforge
# or
npm install @nginh/llmforge@1.0.0
```

## Quick Start

```typescript
import { RunnerClient } from 'llmforge';

const config = {
   llmConfig: {
      apiKey: process.env.OPENAI_API_KEY,
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      generationConfig: {
         temperature: 0.7,
         maxOutputTokens: 150,
      },
   },
   enableFallback: false,
};

const client = await RunnerClient.create(config);
const response = await client.run([
   {
      role: 'user',
      parts: [{ text: 'Hello! Can you tell me a joke?' }],
   },
]);

console.log(response.output);
```

## Supported Providers

| Provider      | Status         | Models                                                          |
| ------------- | -------------- | --------------------------------------------------------------- |
| OpenAI        | ✅ Supported   | All text models (e.g., gpt-3.5-turbo, gpt-4, gpt-4-turbo, etc.) |
| Google Gemini | ✅ Supported   | All text models (e.g., gemini-1.5-flash, gemini-1.5-pro, etc.)  |
| Ollama        | 🚧 Coming Soon | Local models                                                    |
| Custom Models | 🚧 Coming Soon | User-defined endpoints                                          |

_Current version (v1.0.1) supports OpenAI and Google Gemini_

## Configuration

### Single Provider

```typescript
const config = {
   llmConfig: {
      apiKey: 'your-api-key',
      provider: 'openai', // or 'google'
      model: 'gpt-3.5-turbo',
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
```

### Multiple Providers with Fallback

```typescript
const config = {
   llmConfig: [
      {
         apiKey: process.env.OPENAI_API_KEY,
         provider: 'openai',
         model: 'gpt-3.5-turbo',
         priority: 1, // Primary provider
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
         apiKey: process.env.GOOGLE_API_KEY,
         provider: 'google',
         model: 'gemini-1.5-flash',
         priority: 2, // Fallback provider
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
```

## Response Format

LLMForge returns a standardized response format across all providers:

```typescript
{
  "resp_id": "unique-response-id",
  "output": "Generated text response",
  "status": "success",
  "created_at": 1750283611,
  "model": "gpt-3.5-turbo-0125",
  "usage": {
    "input_tokens": 17,
    "output_tokens": 24,
    "total_tokens": 41
  },
  "fallback": {
    "isUsed": false,
    "reason": ""
  }
}
```

## Message Format

LLMForge uses a unified message format compatible with multiple providers:

```typescript
const messages = [
   {
      role: 'user',
      parts: [{ text: 'Your prompt here' }],
   },
   {
      role: 'assistant',
      parts: [{ text: 'Assistant response' }],
   },
];
```

## Error Handling

LLMForge provides comprehensive error handling with automatic fallback:

```typescript
try {
   const response = await client.run(messages);
   console.log(response.output);
} catch (error) {
   console.error('Error:', error.message);

   // Check if fallback was attempted
   if (response?.fallback?.isUsed) {
      console.log('Fallback reason:', response.fallback.reason);
   }
}
```

## Environment Variables

Create a `.env` file in your project root:

```env
OPENAI_API_KEY=your-openai-api-key
GOOGLE_API_KEY=your-google-api-key
```

## Examples

### Basic OpenAI Usage

```typescript
import { RunnerClient } from 'llmforge';

const client = await RunnerClient.create({
   llmConfig: {
      apiKey: process.env.OPENAI_API_KEY,
      provider: 'openai',
      model: 'gpt-3.5-turbo',
   },
});

const response = await client.run([{ role: 'user', parts: [{ text: 'Explain quantum computing' }] }]);
```

### Basic Gemini Usage

```typescript
import { RunnerClient } from 'llmforge';

const client = await RunnerClient.create({
   llmConfig: {
      apiKey: process.env.GOOGLE_API_KEY,
      provider: 'google',
      model: 'gemini-1.5-flash',
   },
});

const response = await client.run([{ role: 'user', parts: [{ text: 'Write a haiku about technology' }] }]);
```

### Fallback Configuration

```typescript
const client = await RunnerClient.create({
   llmConfig: [
      {
         apiKey: process.env.OPENAI_API_KEY,
         provider: 'openai',
         model: 'gpt-4',
         priority: 1,
      },
      {
         apiKey: process.env.GOOGLE_API_KEY,
         provider: 'google',
         model: 'gemini-1.5-pro',
         priority: 2,
      },
   ],
   enableFallback: true,
});
```

## API Reference

### RunnerClient

#### `RunnerClient.create(config)`

Creates a new LLMForge client instance.

**Parameters:**

- `config`: Configuration object containing LLM settings and fallback options

**Returns:** Promise<RunnerClient>

#### `client.run(messages)`

Executes a prompt against the configured LLM provider(s).

**Parameters:**

- `messages`: Array of message objects in the unified format

**Returns:** Promise<Response>

### Configuration Options

#### `generationConfig`

- `temperature`: Controls randomness (0.0 - 1.0)
- `maxOutputTokens`: Maximum tokens in response
- `topP`: Nucleus sampling parameter
- `topK`: Top-k sampling parameter

#### `retryConfig`

- `maxRetries`: Maximum retry attempts
- `retryDelay`: Delay between retries (ms)

## Roadmap

- [✔️] OpenAI support
- [✔️] Google Gemini support
- [✔️] Basic error handling
- [✔️] Fallback mechanism
- [✔️] TypeScript support
- [✔️] Unified message format
- [ ] Unified thinking and reasoning
- [ ] Ollama support for local models
- [ ] Custom model endpoint support
- [ ] Streaming responses
- [ ] Response caching
- [ ] Anthropic Claude support
- [ ] Azure OpenAI support

## Contributing

We welcome contributions!

To contribute:

1. **Create a Provider Interface:**  
   Follow the existing patterns in the codebase to add new providers. Ensure your implementation is modular and consistent with current interfaces.

2. **Error Handling:**  
   Handle errors gracefully using proper error types. Provide clear error messages and ensure fallback mechanisms work as expected.

3. **Code Formatting:**  
   Use [Prettier](https://prettier.io/) for code formatting. Run `npm run format .` before submitting your changes.

4. **Testing:**  
   Add or update tests to cover your changes. Ensure all tests pass before submitting a PR.

5. **Pull Request Guidelines:**

   - Create a Pull Request on GitHub with a clear title and description.
   - Reference any related issues (e.g., "Closes #123").
   - Include screenshots or examples if applicable.
   - Provide testing instructions so reviewers can verify your changes.
   - Paste the rewritten markdown content (if documentation is updated).

6. **Review Process:**  
   Your PR will be reviewed for code quality, consistency, and adherence to project guidelines.

Thank you for helping improve LLMForge!

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: <harshanand.cloud@gmail.com>
- 🐛 Issues: [GitHub Issues](https://github.com/nginH/llmforge/issues)

---

Built with ❤️ for the AI developer community
by [nginH](https://github.com/nginH)
