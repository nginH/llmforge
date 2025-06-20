# LLMForge 🔥

![npm](https://img.shields.io/npm/v/llmforge?color=crimson&label=npm%20package)
![npm bundle size](https://img.shields.io/bundlephobia/min/llmforge)
![NPM](https://img.shields.io/npm/l/llmforge)
![GitHub issues](https://img.shields.io/github/issues/nginH/llmforge)
![GitHub last commit](https://img.shields.io/github/last-commit/nginH/llmforge)

A unified, pluggable AI runtime to run prompts across OpenAI, Gemini, Groq, and more — all with a single line of code.

<br>

## 📋 Table of Contents

- [LLMForge 🔥](#llmforge-)
   - [📋 Table of Contents](#-table-of-contents)
   - [✨ Features](#-features)
   - [🚀 Quick Start](#-quick-start)
   - [📦 Installation](#-installation)
   - [🔗 Supported Providers \& Models](#-supported-providers--models)
   - [⚡ Streaming Responses](#-streaming-responses)
   - [⚙️ Configuration](#️-configuration)
      - [Single Provider](#single-provider)
      - [Multiple Providers with Fallback](#multiple-providers-with-fallback)
   - [📝 Message \& Response Format](#-message--response-format)
      - [Message Format](#message-format)
      - [Response Format (Non-Streaming)](#response-format-non-streaming)
      - [Response Format (Streaming)](#response-format-streaming)
         - [Delta Chunk](#delta-chunk)
         - [Completed Chunk](#completed-chunk)
         - [Example Usage](#example-usage)
   - [💡 Examples](#-examples)
      - [Basic OpenAI Usage](#basic-openai-usage)
      - [Basic Gemini Usage](#basic-gemini-usage)
      - [Basic Groq Usage](#basic-groq-usage)
   - [📚 API Reference](#-api-reference)
      - [`RunnerClient`](#runnerclient)
         - [`RunnerClient.create(config)`](#runnerclientcreateconfig)
         - [`client.run(messages)`](#clientrunmessages)
      - [Configuration Options](#configuration-options)
         - [`llmConfig` Object](#llmconfig-object)
         - [`generationConfig`](#generationconfig)
         - [`retryConfig`](#retryconfig)
   - [🔑 Environment Variables](#-environment-variables)
   - [🗺️ Roadmap](#️-roadmap)
   - [🤝 Contributing](#-contributing)
   - [❤️ Support](#️-support)

## ✨ Features

- **🌐 Unified Interface**: Single API for multiple AI providers (OpenAI, Gemini, Groq, etc.).
- **🪶 Lightweight**: Only **60.3 kB** package size for minimal bundle impact.
- **🔄 Intelligent Fallback**: Automatic failover between providers to ensure reliability.
- **⏳ Configurable Retries**: Built-in retry mechanisms with customizable delays.
- **🌊 Streaming Support**: Handle responses as they're generated, token by token.
- **📊 Token Usage Tracking**: Detailed usage statistics for cost monitoring.
- **🔒 TypeScript Support**: Full type safety and rich IntelliSense.
- **🔧 Flexible Configuration**: Global, per-provider, and per-request settings.

## 🚀 Quick Start

Get up and running in seconds. First, install the package and set up your environment variables (see [Environment Variables](#-environment-variables)).

```typescript
import { RunnerClient } from 'llmforge';

// Configure your primary AI provider
const config = {
   llmConfig: {
      apiKey: process.env.OPENAI_API_KEY || '',
      provider: 'openai',
      model: 'gpt-4o-mini',
   },
};

// Create a client and run your prompt
const client = await RunnerClient.create(config);
const response = await client.run([
   {
      role: 'user',
      parts: [{ text: 'Hello! Can you tell me a joke?' }],
   },
]);

console.log(response.output);
```

## 📦 Installation

```bash
npm install llmforge
# or yarn
yarn add llmforge
# or pnpm
pnpm add llmforge
```

You can also install a specific version: `npm install @nginh/llmforge@2.0.0`

## 🔗 Supported Providers & Models

LLMForge provides a growing list of integrations with leading AI providers.

| Provider          | Status         | Key Features                                 |
| ----------------- | -------------- | -------------------------------------------- |
| **OpenAI**        | ✅ Supported   | All text models, function calling, JSON mode |
| **Google Gemini** | ✅ Supported   | All text models, high context windows        |
| **Groq**          | ✅ Supported   | Blazing-fast inference, streaming support    |
| **Ollama**        | 🚧 Coming Soon | Run local models for privacy and offline use |
| **Custom**        | 🚧 Coming Soon | Connect to any user-defined model endpoint   |

<br>

<details>
<summary><strong>🤖 View OpenAI Model List</strong></summary>

```js
const openAITextModelIds = [
   // GPT-4 Series
   'gpt-4o',
   'gpt-4o-2024-05-13',
   'gpt-4o-2024-08-06',
   'gpt-4o-2024-11-20',
   'gpt-4-turbo',
   'gpt-4-turbo-preview',
   'gpt-4-0125-preview',
   'gpt-4-1106-preview',
   'gpt-4',
   'gpt-4-0314',
   'gpt-4-0613',
   'gpt-4-32k',
   'gpt-4-32k-0314',
   'gpt-4-32k-0613',
   'gpt-4-vision-preview',

   // GPT-4.1 Series (Azure)
   'gpt-4.1',
   'gpt-4.1-mini',
   'gpt-4.1-nano',

   // GPT-4.5 Series
   'gpt-4.5-preview',
   'gpt-4.5-preview-2025-02-27',

   // GPT-3.5 Series
   'gpt-3.5-turbo',
   'gpt-3.5-turbo-0301',
   'gpt-3.5-turbo-0613',
   'gpt-3.5-turbo-1106',
   'gpt-3.5-turbo-0125',
   'gpt-3.5-turbo-16k',
   'gpt-3.5-turbo-16k-0613',
   'gpt-3.5-turbo-instruct',

   // O-Series (Reasoning Models)
   'o4-mini',
   'o3',
   'o3-mini',
   'o3-mini-2025-01-31',
   'o1',
   'o1-mini',
   'o1-preview',
   'o1-mini-2024-09-12',

   // Other Models
   'chatgpt-4o-latest',
   'gpt-4o-mini',
   'gpt-4o-mini-2024-07-18',
   'codex-mini',

   // Deprecated/Legacy
   'davinci-002',
   'babbage-002',
];
```

</details>

<br>

<details>
<summary><strong>✨ View Google Gemini Model List</strong></summary>

```js
const geminiModelList = [
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
```

</details>

<br>

<details>
<summary><strong>⚡ View Groq Model List</strong></summary>

```js
const groqModelsList = [
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
```

</details>

## ⚡ Streaming Responses

LLMForge supports streaming to receive responses token-by-token, ideal for real-time applications like chatbots. Enable it by setting `stream: true` in your configuration. When streaming is enabled, `client.run()` returns an `AsyncIterable`.

```typescript
import { RunnerClient } from 'llmforge';

const client = await RunnerClient.create({
   llmConfig: {
      apiKey: process.env.GROQ_API_KEY || '',
      provider: 'groq',
      model: 'llama-3-8b', // Groq is great for streaming!
      stream: true, // Enable streaming
   },
});

const stream = await client.run([{ role: 'user', parts: [{ text: 'Write a short story about a robot who discovers music.' }] }]);

let fullResponse = '';
try {
   // The response is an async iterable stream of chunks
   for await (const chunk of stream) {
      if (chunk.output) {
         process.stdout.write(chunk.output); // Print each token as it arrives
         fullResponse += chunk.output;
      }
   }
} catch (error) {
   console.error('\n\nError during streaming:', error);
}

// After the stream ends, get the final response object with usage stats
const finalResponse = stream.getFinalResponse();
console.log('\n\n--- Streaming Complete ---');
console.log('Full Story:', fullResponse);
console.log('Usage Stats:', finalResponse.usage);
```

## ⚙️ Configuration

### Single Provider

For simple use cases, provide a single `llmConfig` object.

```typescript
const config = {
   llmConfig: {
      apiKey: 'your-api-key',
      provider: 'openai', // or 'google', 'groq'
      model: 'gpt-4o-mini',
      stream: false, // Optional, defaults to false
      generationConfig: {
         temperature: 0.7,
         maxOutputTokens: 150,
      },
      retryConfig: {
         maxRetries: 3,
         retryDelay: 1000,
      },
   },
};
```

### Multiple Providers with Fallback

For resilience, provide an array of `llmConfig` objects sorted by `priority`. If the provider with `priority: 1` fails, LLMForge will automatically try the one with `priority: 2`, and so on.

```typescript
const config = {
   llmConfig: [
      {
         apiKey: process.env.OPENAI_API_KEY,
         provider: 'openai',
         model: 'gpt-4o',
         priority: 1, // Primary provider
      },
      {
         apiKey: process.env.GOOGLE_API_KEY,
         provider: 'google',
         model: 'gemini-1.5-pro',
         priority: 2, // Fallback provider
      },
   ],
   enableFallback: true, // Must be true to use the fallback mechanism
};
```

## 📝 Message & Response Format

### Message Format

LLMForge uses a unified message format for multi-turn conversations. The `role` can be `user`, `model` or `system` to structure the dialogue history.

```typescript
const messages = [
   {
      role: 'user', // The user's prompt
      parts: [{ text: 'Tell me about machine learning in 50 words.' }],
   },
   {
      role: 'model', // A previous response from the AI (can also be 'model')
      parts: [{ text: 'Machine learning is a subset of AI that enables computers to learn and make decisions from data without explicit programming.' }],
   },
   {
      role: 'user',
      parts: [{ text: 'Can you give me an example?' }],
   },
];
```

### Response Format (Non-Streaming)

When `stream: false` (the default), `client.run()` returns a promise that resolves to a standardized response object.

```typescript
{
  "resp_id": "unique-response-id",
  "output": "This is the generated text response from the AI.",
  "status": "success",
  "created_at": 1750283611,
  "model": "gpt-4o-mini",
  "usage": {
    "input_tokens": 35,
    "output_tokens": 120,
    "total_tokens": 155
  },
  "fallback": {
    "isUsed": true, // This becomes true if a fallback provider was used
    "reason": "API error from primary provider: 500 Internal Server Error"
  }
}
```

---

### Response Format (Streaming)

When `stream: true`, `client.run()` returns an `AsyncIterable`. You can use a `for await...of` loop to iterate over the chunks as they are sent from the server.

There are two types of chunks you will receive:

1. **Delta Chunks**: These are sent as the AI generates the response, token by token.
2. **Completed Chunk**: This is the final message in the stream, containing the full output and metadata.

#### Delta Chunk

This chunk represents an incremental part of the generated text.

```json
{
   "type": "delta",
   "token": "a single token or word"
}
```

- `type`: Always `'delta'`.
- `token`: A `string` containing the next piece of the generated text.

#### Completed Chunk

This is the final chunk sent when the stream is finished. It contains the complete response and final metadata, similar to the non-streaming response.

```json
{
   "type": "completed",
   "token": "",
   "completeOutput": "The full, assembled text response.",
   "resp_id": "unique-response-id",
   "status": "success",
   "created_at": 1750283611,
   "model": "qwen/qwen3-32b",
   "usage": {
      "input_tokens": 12,
      "output_tokens": 15,
      "total_tokens": 27
   },
   "fallback": {
      "isUsed": false,
      "reason": null
   }
}
```

- `type`: Always `'completed'`.
- `token`: An empty string.
- `completeOutput`: The full, final generated string.
- The remaining fields (`resp_id`, `status`, `model`, `usage`, etc.) are the same as in the non-streaming response.

#### Example Usage

Here is how you would process a streaming response to build the full output and access the final metadata.

```typescript
const stream = await client.run('your-prompt', { stream: true });

let fullResponse = '';
let finalResponse = null;

for await (const chunk of stream) {
   if (chunk.type === 'delta') {
      // Append the token to your full response string
      const token = chunk.token;
      fullResponse += token;
      // You can process the token here (e.g., render to UI)
      process.stdout.write(token);
   } else if (chunk.type === 'completed') {
      // The stream is done.
      // 'chunk' now contains the final metadata.
      finalResponse = chunk;
   }
}

// After the loop, you can use the final data
console.log('\n\n--- Stream Complete ---');
console.log('Full assembled response:', fullResponse);
console.log('Final metadata:', finalResponse);
console.log('Total output tokens:', finalResponse.usage.output_tokens);
```

## 💡 Examples

### Basic OpenAI Usage

```typescript
import { RunnerClient } from 'llmforge';
const client = await RunnerClient.create({
   llmConfig: {
      apiKey: process.env.OPENAI_API_KEY,
      provider: 'openai',
      model: 'gpt-4o-mini',
   },
});
const response = await client.run([{ role: 'user', parts: [{ text: 'Explain quantum computing simply.' }] }]);
console.log(response.output);
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
const response = await client.run([{ role: 'user', parts: [{ text: 'Write a haiku about technology.' }] }]);
console.log(response.output);
```

### Basic Groq Usage

```typescript
import { RunnerClient } from 'llmforge';
const client = await RunnerClient.create({
   llmConfig: {
      apiKey: process.env.GROQ_API_KEY,
      provider: 'groq',
      model: 'llama-3-8b',
   },
});
const response = await client.run([{ role: 'user', parts: [{ text: 'What is the philosophy of absurdism?' }] }]);
console.log(response.output);
```

## 📚 API Reference

<details>
<summary><strong>Click to expand API Reference</strong></summary>

### `RunnerClient`

#### `RunnerClient.create(config)`

Creates and initializes a new LLMForge client instance.

- **Parameters:**
   - `config`: The main configuration object.
- **Returns:** `Promise<RunnerClient>`

#### `client.run(messages)`

Executes a prompt against the configured LLM provider(s).

- **Parameters:**
   - `messages`: An array of message objects in the unified format.
- **Returns:** `Promise<Response>` for non-streaming calls, or `Promise<AsyncIterable<StreamResponse>>` for streaming calls.

### Configuration Options

#### `llmConfig` Object

- `apiKey`: Your API key for the provider.
- `provider`: The provider to use (`'openai'`, `'google'`, `'groq'`).
- `model`: The specific model ID to use.
- `stream?`: (Optional) Set to `true` to enable streaming. Defaults to `false`.
- `priority?`: (Optional) A number (`1`, `2`, etc.) to set the order for fallback.
- `generationConfig?`: (Optional) Parameters to control the model's output.
- `retryConfig?`: (Optional) Settings for automatic retries on failure.

#### `generationConfig`

- `temperature`: Controls randomness (e.g., `0.7`).
- `maxOutputTokens`: Maximum tokens in the response.
- `topP`: Nucleus sampling parameter.
- `topK`: Top-k sampling parameter.

#### `retryConfig`

- `maxRetries`: Maximum number of retry attempts.
- `retryDelay`: Delay between retries in milliseconds.

</details>

## 🔑 Environment Variables

For security, manage your API keys using environment variables. Create a `.env` file in your project root:

```env
OPENAI_API_KEY=your-openai-api-key
GOOGLE_API_KEY=your-google-api-key
GROQ_API_KEY=your-groq-api-key
```

And load them in your application using a library like `dotenv`.

## 🗺️ Roadmap

- [✔️] OpenAI Support
- [✔️] Google Gemini Support
- [✔️] Groq Support
- [✔️] Intelligent Fallback & Retry Logic
- [✔️] Token Usage Tracking
- [✔️] Streaming Responses
- [✔️] Full TypeScript Support
- [ ] Ollama Support for Local Models
- [ ] Custom Model Endpoint Support
- [ ] Anthropic Claude Support
- [ ] Azure OpenAI Support
- [ ] Response Caching
- [ ] Unified Function Calling / Tool Use

## 🤝 Contributing

We welcome contributions! Please follow the guidelines in our `CONTRIBUTING.md` file or check out the quick guide below.

<details>
<summary><strong>Contribution Quick Guide</strong></summary>

1. **Fork & Clone:** Fork the repository and clone it locally.
2. **Create a Branch:** Create a new branch for your feature or bug fix (`git checkout -b feature/my-new-feature`).
3. **Code:** Implement your changes. Add new provider interfaces, handle errors gracefully, and add or update tests.
4. **Format:** Run `npm run format` to ensure your code matches the project's style.
5. **Test:** Run `npm test` to ensure all tests pass.
6. **Create a Pull Request:** Push your branch to GitHub and create a Pull Request with a clear title and description. Reference any related issues.

</details>

## ❤️ Support

- 📧 **Email:** <harshanand.cloud@gmail.com>
- 🐛 **Issues:** [Report a bug or request a feature on GitHub Issues](https://github.com/nginH/llmforge/issues)

---

MIT License - see the [LICENSE](LICENSE) file for details.

Built with ❤️ for the AI developer community by [nginH](https://github.com/nginH).
