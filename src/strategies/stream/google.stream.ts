import { logger } from '../../utils/logger';
import { StreamChunk, GenerateContentResponse, Candidate, ContentPart } from '../../types';

export interface StreamOptions {
   onChunk?: (chunk: StreamChunk) => void;
   onComplete?: (response: GenerateContentResponse) => void;
   onError?: (error: Error) => void;
   onThinking?: (thinking: string) => void;
}

export class StreamProcessor {
   private decoder = new TextDecoder();

   async processStream(response: Response, options: StreamOptions = {}): Promise<GenerateContentResponse> {
      if (!response.body) {
         throw new Error('Response body is empty');
      }

      const reader = response.body.getReader();
      let buffer = '';
      let aggregatedResponse: GenerateContentResponse & { candidates: Candidate[] } = { candidates: [] };

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
                     const chunk = this.parseStreamChunk(line);
                     if (chunk) {
                        // Handle thinking content
                        if (this.hasThinkingContent(chunk)) {
                           const thinking = this.extractThinkingContent(chunk);
                           if (thinking && options.onThinking) {
                              options.onThinking(thinking);
                           }
                        }

                        // Aggregate the response
                        this.aggregateChunk(aggregatedResponse, chunk);

                        // Call chunk handler
                        if (options.onChunk) {
                           options.onChunk(chunk);
                        }
                     }
                  } catch (error) {
                     logger.warn('Failed to parse stream chunk:', line, error);
                  }
               }
            }
         }

         // Process any remaining buffer content
         if (buffer.trim()) {
            try {
               const chunk = this.parseStreamChunk(buffer);
               if (chunk) {
                  this.aggregateChunk(aggregatedResponse, chunk);
                  if (options.onChunk) {
                     options.onChunk(chunk);
                  }
               }
            } catch (error) {
               logger.warn('Failed to parse final chunk:', buffer, error);
            }
         }

         if (options.onComplete) {
            options.onComplete(aggregatedResponse);
         }

         // Remove candidates property if not part of original GenerateContentResponse
         return { ...aggregatedResponse };
      } catch (error) {
         if (options.onError) {
            options.onError(error as Error);
         }
         throw error;
      } finally {
         reader.releaseLock();
      }
   }

   private parseStreamChunk(line: string): StreamChunk | null {
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

   private hasThinkingContent(chunk: StreamChunk): boolean {
      return chunk.candidates?.some((candidate: Candidate) => candidate.content?.parts?.some((part: ContentPart) => 'text' in part && part.text?.includes('**'))) || false;
   }

   private extractThinkingContent(chunk: StreamChunk): string | null {
      for (const candidate of chunk.candidates || []) {
         for (const part of candidate.content?.parts || []) {
            if ('text' in part && part.text) {
               // Extract thinking content (usually between ** markers)
               const thinkingMatch = part.text.match(/\*\*([\s\S]*?)\*\*/);
               if (thinkingMatch) {
                  return thinkingMatch[1];
               }
            }
         }
      }
      return null;
   }
   private aggregateChunk(aggregated: GenerateContentResponse & { candidates: Candidate[] }, chunk: StreamChunk): void {
      if (!chunk.candidates) return;

      for (let i = 0; i < chunk.candidates.length; i++) {
         const candidate = chunk.candidates[i];

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
                  const chunk = this.parseStreamChunk(line);
                  if (chunk) {
                     yield chunk;
                  }
               }
            }
         }

         if (buffer.trim()) {
            const chunk = this.parseStreamChunk(buffer);
            if (chunk) {
               yield chunk;
            }
         }
      } finally {
         reader.releaseLock();
      }
   }
}
