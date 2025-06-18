import { StreamChunk, GenerateContentResponse } from '../../types';

export interface StreamOptions {
   onChunk?: (chunk: StreamChunk) => void;
   onComplete?: (response: GenerateContentResponse) => void;
   onError?: (error: Error) => void;
   onThinking?: (thinking: string) => void;
   onReasoning?: (reasoning: any) => void;
}

export interface OpenAIStreamChunk {
   id?: string;
   object?: string;
   created?: number;
   model?: string;
   choices?: Array<{
      index: number;
      delta?: {
         role?: string;
         content?: string;
      };
      message?: {
         role: string;
         content: string;
      };
      finish_reason?: string;
   }>;
   usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
   };
   // For reasoning responses
   type?: 'reasoning' | 'message';
   reasoning?: {
      id: string;
      summary: string[];
   };
}

export class OpenAIStreamProcessor {
   private decoder = new TextDecoder();

   async processStream(response: Response, options: StreamOptions = {}): Promise<GenerateContentResponse> {
      if (!response.body) {
         throw new Error('Response body is empty');
      }

      const reader = response.body.getReader();
      let buffer = '';
      let aggregatedResponse: GenerateContentResponse = {
         candidates: [],
      };

      try {
         while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += this.decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
               if (line.trim()) {
                  try {
                     const openAIChunk = this.parseOpenAIStreamChunk(line);
                     if (openAIChunk) {
                        // Handle reasoning content
                        if (this.hasReasoningContent(openAIChunk)) {
                           const reasoning = this.extractReasoningContent(openAIChunk);
                           if (reasoning && options.onReasoning) {
                              options.onReasoning(reasoning);
                           }
                        }

                        // Handle thinking content (from JSON schema responses)
                        if (this.hasThinkingContent(openAIChunk)) {
                           const thinking = this.extractThinkingContent(openAIChunk);
                           if (thinking && options.onThinking) {
                              options.onThinking(thinking);
                           }
                        }

                        // Convert to Gemini format and aggregate
                        const geminiChunk = this.convertToGeminiChunk(openAIChunk);
                        this.aggregateChunk(aggregatedResponse, geminiChunk);

                        // Call chunk handler with converted chunk
                        if (options.onChunk) {
                           options.onChunk(geminiChunk);
                        }
                     }
                  } catch (error) {
                     console.warn('Failed to parse stream chunk:', line, error);
                  }
               }
            }
         }

         // Process any remaining buffer content
         if (buffer.trim()) {
            try {
               const openAIChunk = this.parseOpenAIStreamChunk(buffer);
               if (openAIChunk) {
                  const geminiChunk = this.convertToGeminiChunk(openAIChunk);
                  this.aggregateChunk(aggregatedResponse, geminiChunk);
                  if (options.onChunk) {
                     options.onChunk(geminiChunk);
                  }
               }
            } catch (error) {
               console.warn('Failed to parse final chunk:', buffer, error);
            }
         }

         if (options.onComplete) {
            options.onComplete(aggregatedResponse);
         }

         return aggregatedResponse;
      } catch (error) {
         if (options.onError) {
            options.onError(error as Error);
         }
         throw error;
      } finally {
         reader.releaseLock();
      }
   }

   private parseOpenAIStreamChunk(line: string): OpenAIStreamChunk | null {
      // Remove "data: " prefix if present
      const cleanLine = line.replace(/^data:\s*/, '').trim();

      if (!cleanLine || cleanLine === '[DONE]') {
         return null;
      }

      try {
         return JSON.parse(cleanLine);
      } catch (error) {
         // Some lines might not be valid JSON
         return null;
      }
   }

   private convertToGeminiChunk(openAIChunk: OpenAIStreamChunk): StreamChunk {
      const geminiChunk: StreamChunk = {
         candidates: [],
      };

      if (openAIChunk.choices) {
         geminiChunk.candidates = openAIChunk.choices.map(choice => ({
            content: {
               role: 'model',
               parts: [
                  {
                     text: choice.delta?.content || choice.message?.content || '',
                  },
               ],
            },
            finishReason: choice.finish_reason,
            index: choice.index,
         }));
      }

      if (openAIChunk.usage) {
         geminiChunk.usageMetadata = {
            promptTokenCount: openAIChunk.usage.prompt_tokens,
            candidatesTokenCount: openAIChunk.usage.completion_tokens,
            totalTokenCount: openAIChunk.usage.total_tokens,
         };
      }

      return geminiChunk;
   }

   private hasReasoningContent(chunk: OpenAIStreamChunk): boolean {
      return chunk.type === 'reasoning' || !!chunk.reasoning;
   }

   private extractReasoningContent(chunk: OpenAIStreamChunk): any {
      return chunk.reasoning;
   }

   private hasThinkingContent(chunk: OpenAIStreamChunk): boolean {
      // Check if the content contains JSON with thinking field
      return (
         chunk.choices?.some(choice => {
            const content = choice.delta?.content || choice.message?.content;
            if (!content) return false;

            try {
               const parsed = JSON.parse(content);
               return parsed.thinking !== undefined;
            } catch {
               return content.includes('"thinking"') || content.includes('thinking:');
            }
         }) || false
      );
   }

   private extractThinkingContent(chunk: OpenAIStreamChunk): string | null {
      for (const choice of chunk.choices || []) {
         const content = choice.delta?.content || choice.message?.content;
         if (!content) continue;

         try {
            const parsed = JSON.parse(content);
            if (parsed.thinking) {
               return parsed.thinking;
            }
         } catch {
            // Try to extract thinking from partial JSON or text
            const thinkingMatch = content.match(/"thinking":\s*"([^"]*)"/) || content.match(/thinking:\s*(.+?)(?:,|\}|$)/);
            if (thinkingMatch) {
               return thinkingMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
            }
         }
      }
      return null;
   }

   private aggregateChunk(aggregated: GenerateContentResponse, chunk: StreamChunk): void {
      if (!chunk.candidates) return;

      for (let i = 0; i < chunk.candidates.length; i++) {
         const candidate = chunk.candidates[i];

         if (!aggregated.candidates) {
            aggregated.candidates = [];
         }

         if (!aggregated.candidates[i]) {
            aggregated.candidates[i] = {
               content: { parts: [] },
               index: i,
            };
         }

         const aggregatedCandidate = aggregated.candidates[i];

         // Merge content parts
         if (candidate.content?.parts) {
            for (let j = 0; j < candidate.content.parts.length; j++) {
               const part = candidate.content.parts[j];

               if (!aggregatedCandidate.content.parts[j]) {
                  aggregatedCandidate.content.parts[j] = { text: '' };
               }

               if ('text' in part && part.text) {
                  const aggregatedPart = aggregatedCandidate.content.parts[j];
                  if ('text' in aggregatedPart) {
                     aggregatedPart.text += part.text;
                  }
               }
            }
         }

         if (candidate.finishReason) {
            aggregatedCandidate.finishReason = candidate.finishReason;
         }
         if (candidate.safetyRatings) {
            aggregatedCandidate.safetyRatings = candidate.safetyRatings;
         }
      }

      if (chunk.usageMetadata) {
         aggregated.usageMetadata = chunk.usageMetadata;
      }
   }

   async *createAsyncGenerator(response: Response): AsyncGenerator<StreamChunk> {
      if (!response.body) {
         throw new Error('Response body is empty');
      }

      const reader = response.body.getReader();
      let buffer = '';

      try {
         while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += this.decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
               if (line.trim()) {
                  const openAIChunk = this.parseOpenAIStreamChunk(line);
                  if (openAIChunk) {
                     const geminiChunk = this.convertToGeminiChunk(openAIChunk);
                     yield geminiChunk;
                  }
               }
            }
         }

         if (buffer.trim()) {
            const openAIChunk = this.parseOpenAIStreamChunk(buffer);
            if (openAIChunk) {
               const geminiChunk = this.convertToGeminiChunk(openAIChunk);
               yield geminiChunk;
            }
         }
      } finally {
         reader.releaseLock();
      }
   }

   // OpenAI-specific method to handle raw OpenAI chunks without conversion
   async *createOpenAIAsyncGenerator(response: Response): AsyncGenerator<OpenAIStreamChunk> {
      if (!response.body) {
         throw new Error('Response body is empty');
      }

      const reader = response.body.getReader();
      let buffer = '';

      try {
         while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += this.decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
               if (line.trim()) {
                  const chunk = this.parseOpenAIStreamChunk(line);
                  if (chunk) {
                     yield chunk;
                  }
               }
            }
         }

         if (buffer.trim()) {
            const chunk = this.parseOpenAIStreamChunk(buffer);
            if (chunk) {
               yield chunk;
            }
         }
      } finally {
         reader.releaseLock();
      }
   }
}

// Legacy compatibility - extend the original StreamProcessor
export class StreamProcessor extends OpenAIStreamProcessor {
   // Keep the original methods for backward compatibility
   // The parent class handles both OpenAI and original formats
}
