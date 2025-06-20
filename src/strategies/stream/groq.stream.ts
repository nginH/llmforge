import { Braces } from 'lucide-react';
import { streamResponse, streamResponseComplete } from '../../../src/index';

interface ChatCompletionChunk {
   id: string;
   object: string;
   created: number;
   model: string;
   system_fingerprint: string;
   choices: Array<{
      index: number;
      delta: {
         content?: string;
      };
      logprobs: any;
      finish_reason: string | null;
   }>;
   x_groq?: {
      id: string;
      usage: {
         queue_time: number;
         prompt_tokens: number;
         prompt_time: number;
         completion_tokens: number;
         completion_time: number;
         total_tokens: number;
         total_time: number;
      };
   };
}

export class GroqStreamProcessor {
   private completeOutput: string = '';
   private model: string = '';
   private chatId: string = '';

   /**
    * Process a raw SSE data chunk and convert to StreamResponse format
    */
   private processChunk(rawData: string): streamResponse | streamResponseComplete | null {
      if (!rawData.trim() || rawData.trim() === '[DONE]') {
         return null;
      }
      const jsonStr = rawData.startsWith('data: ') ? rawData.slice(6) : rawData;

      try {
         if (jsonStr === '[DONE]') {
            return null; // End of stream marker
         }
         const chunk: ChatCompletionChunk = JSON.parse(jsonStr);

         // Store metadata from first chunk
         if (!this.model && chunk.model) {
            this.model = chunk.model;
            this.chatId = chunk.id;
         }

         const choice = chunk.choices?.[0];
         if (!choice) return null;

         // Handle content delta
         if (choice.delta?.content) {
            const token = choice.delta.content;
            this.completeOutput += token;

            return {
               type: 'delta',
               token,
            };
         }

         if (choice.finish_reason === 'stop') {
            const completeResponse: streamResponseComplete = {
               type: 'completed',
               token: '',
               completeOutput: this.completeOutput,
               model: this.model,
               status: 'completed',
            };

            // Add usage information if available
            if (chunk.x_groq?.usage) {
               completeResponse.usage = {
                  input_tokens: chunk.x_groq.usage.prompt_tokens,
                  output_tokens: chunk.x_groq.usage.completion_tokens,
                  total_tokens: chunk.x_groq.usage.total_tokens,
               };
            }

            return completeResponse;
         }

         return null;
      } catch (error) {
         console.error('Error parsing chunk:', error, 'Raw data:', rawData);
         return null;
      }
   }

   /**
    * Create an async generator that yields StreamResponse objects
    */
   async *createAsyncGenerator(response: Response): AsyncGenerator<streamResponse | streamResponseComplete> {
      if (!response.body) {
         throw new Error('Response body is empty');
      }

      // Reset state for new stream
      this.completeOutput = '';
      this.model = '';
      this.chatId = '';

      const reader = response.body.getReader();
      let buffer = '';

      try {
         while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            buffer += chunk;

            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
               const trimmedLine = line.trim();
               if (trimmedLine) {
                  const processedChunk = this.processChunk(trimmedLine);
                  if (processedChunk) {
                     yield processedChunk;
                  }
               }
            }
         }

         if (buffer.trim()) {
            const processedChunk = this.processChunk(buffer.trim());
            if (processedChunk) {
               yield processedChunk;
            }
         }
      } catch (error) {
         console.error('Error in GroqStreamProcessor:', error);
         throw new Error(`Failed to process stream: ${(error as Error).message}`);
      } finally {
         reader.releaseLock();
      }
   }

   async *processRawData(rawData: string): AsyncGenerator<streamResponse | streamResponseComplete> {
      // Reset state
      this.completeOutput = '';
      this.model = '';
      this.chatId = '';

      const lines = rawData.split('\n');

      for (const line of lines) {
         const trimmedLine = line.trim();
         if (trimmedLine && !trimmedLine.startsWith('data: [DONE]')) {
            const processedChunk = this.processChunk(trimmedLine);
            if (processedChunk) {
               yield processedChunk;
            }
         }
      }

      yield {
         type: 'done',
         token: '',
      };
   }
   getCompleteOutput(): string {
      return this.completeOutput;
   }

   reset(): void {
      this.completeOutput = '';
      this.model = '';
      this.chatId = '';
   }
}
