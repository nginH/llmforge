import { logger } from '../../utils/logger';
import { StreamChunk, GenerateContentResponse, Candidate, ContentPart } from '../../types';

export interface streamResponse {
   type: 'delta' | 'done' | 'completed';
   token: string; //chunk of token
}

export interface streamResponseComplete extends streamResponse {
   completeOutput?: string;
   thinkingOutput?: string;
   model?: string;
   usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
   };
   status?: string;
   fallback?: {
      isUsed: boolean; // Indicates if fallback was used
      reason?: string; // Reason for fallback usage
   } | null;
}

export interface StreamOptions {
   onChunk?: (chunk: StreamChunk) => void;
   onComplete?: (response: GenerateContentResponse) => void;
   onError?: (error: Error) => void;
   onThinking?: (thinking: string) => void;
}

export class GoogleStreamProcessor {
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

            // Try to extract complete JSON objects from buffer
            const { objects, remainingBuffer } = this.extractCompleteJsonObjects(buffer);
            buffer = remainingBuffer;

            for (const jsonObject of objects) {
               try {
                  const chunk = JSON.parse(jsonObject);
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
                  logger.warn('Failed to parse stream chunk:', jsonObject, error);
               }
            }
         }

         // Process any remaining buffer content
         if (buffer.trim()) {
            try {
               const chunk = JSON.parse(buffer.trim());
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

   private extractCompleteJsonObjects(buffer: string): { objects: string[]; remainingBuffer: string } {
      const objects: string[] = [];
      let currentBuffer = buffer;
      let bracketCount = 0;
      let startIndex = -1;
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < currentBuffer.length; i++) {
         const char = currentBuffer[i];

         if (escapeNext) {
            escapeNext = false;
            continue;
         }

         if (char === '\\' && inString) {
            escapeNext = true;
            continue;
         }

         if (char === '"') {
            inString = !inString;
            continue;
         }

         if (inString) {
            continue;
         }

         if (char === '{') {
            if (bracketCount === 0) {
               startIndex = i;
            }
            bracketCount++;
         } else if (char === '}') {
            bracketCount--;
            if (bracketCount === 0 && startIndex !== -1) {
               // Found complete JSON object
               const jsonStr = currentBuffer.substring(startIndex, i + 1);
               objects.push(jsonStr);
               startIndex = -1;
            }
         }
      }

      // Return remaining buffer starting from the last incomplete object
      const remainingBuffer = startIndex !== -1 ? currentBuffer.substring(startIndex) : '';

      return { objects, remainingBuffer };
   }

   private parseStreamChunk(line: string): StreamChunk | null {
      logger.debug(` parseStreamChunk input:`, JSON.stringify(line));

      // Remove "data: " prefix if present (for SSE format)
      let cleanLine = line.replace(/^data:\s*/, '').trim();
      logger.debug(` After data: prefix removal:`, JSON.stringify(cleanLine));

      // Handle common SSE termination signals
      if (!cleanLine || cleanLine === '[DONE]' || cleanLine === 'data: [DONE]') {
         logger.debug(`⏹  Termination signal detected: "${cleanLine}"`);
         return null;
      }

      // Handle potential comma-separated JSON objects (streaming JSON)
      if (cleanLine.startsWith(',')) {
         cleanLine = cleanLine.substring(1).trim();
         logger.debug(`  Removed leading comma:`, JSON.stringify(cleanLine));
      }

      if (cleanLine.endsWith(',')) {
         cleanLine = cleanLine.substring(0, cleanLine.length - 1).trim();
         logger.debug(`  Removed trailing comma:`, JSON.stringify(cleanLine));
      }

      if (!cleanLine) {
         logger.debug(` Empty line after cleanup`);
         return null;
      }

      try {
         const parsed = JSON.parse(cleanLine);
         logger.debug(` Successfully parsed JSON:`, JSON.stringify(parsed, null, 2));
         return parsed;
      } catch (error) {
         logger.warn(`❌ JSON parse error for line: "${cleanLine}"`, error);
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

   async *createAsyncGenerator(response: Response): AsyncGenerator<streamResponse | streamResponseComplete> {
      if (!response.body) {
         throw new Error('Response body is empty');
      }

      logger.debug(' Starting stream processing');
      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
         headersObj[key] = value;
      });
      logger.debug(' Response headers:', headersObj);
      logger.debug(' Content-Type:', response.headers.get('content-type'));
      logger.debug(' Transfer-Encoding:', response.headers.get('transfer-encoding'));

      const reader = response.body.getReader();
      let buffer = '';
      let aggregatedText = '';
      let thinkingOutput = '';
      let model = '';
      let usage: { input_tokens?: number; output_tokens?: number; total_tokens?: number } | undefined = undefined;
      let status = '';
      let fallback: { isUsed: boolean; reason?: string } | null = null;
      let chunkCount = 0;
      let totalBytesReceived = 0;

      try {
         while (true) {
            const { done, value } = await reader.read();

            if (done) {
               logger.debug('Stream reading completed');
               break;
            }

            totalBytesReceived += value.byteLength;
            chunkCount++;

            const rawChunk = this.decoder.decode(value, { stream: true });
            logger.debug(`Raw chunk #${chunkCount} (${value.byteLength} bytes):`, JSON.stringify(rawChunk));

            buffer += rawChunk;
            logger.debug(` Current buffer length: ${buffer.length}`);

            const { objects, remainingBuffer } = this.extractCompleteJsonObjects(buffer);
            buffer = remainingBuffer;

            logger.debug(`Extracted ${objects.length} complete JSON objects, buffer remainder: ${buffer.length} chars`);

            for (let i = 0; i < objects.length; i++) {
               const jsonObject = objects[i];
               logger.debug(`rocessing JSON object ${i}:`, JSON.stringify(jsonObject));

               try {
                  const chunk = JSON.parse(jsonObject);
                  if (!chunk) {
                     logger.debug(` Failed to parse JSON object ${i}`);
                     continue;
                  }

                  logger.debug(`Parsed chunk:`, JSON.stringify(chunk, null, 2));

                  if (chunk.candidates && chunk.candidates.length > 0) {
                     logger.debug(` Processing ${chunk.candidates.length} candidates`);

                     for (let candidateIndex = 0; candidateIndex < chunk.candidates.length; candidateIndex++) {
                        const candidate = chunk.candidates[candidateIndex];
                        logger.debug(` Processing candidate ${candidateIndex}:`, JSON.stringify(candidate, null, 2));

                        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                           logger.debug(`Found ${candidate.content.parts.length} content parts`);

                           for (let partIndex = 0; partIndex < candidate.content.parts.length; partIndex++) {
                              const part = candidate.content.parts[partIndex];
                              logger.debug(` Processing part ${partIndex}:`, JSON.stringify(part));

                              if ('text' in part && part.text && part.text.trim() !== '') {
                                 logger.debug(`💬 Yielding text token: "${part.text}"`);
                                 aggregatedText += part.text;

                                 const deltaResponse: streamResponse = {
                                    type: 'delta',
                                    token: part.text,
                                 };
                                 logger.debug(` Yielding delta:`, JSON.stringify(deltaResponse));
                                 yield deltaResponse;
                              } else {
                                 logger.debug(`  Skipping empty/whitespace part ${partIndex}`);
                              }
                           }
                        } else {
                           logger.debug(` No content parts in candidate ${candidateIndex}`);
                        }

                        if (candidate.finishReason) {
                           logger.debug(` Finish reason found: ${candidate.finishReason}`);
                        }
                     }

                     const thinking = this.extractThinkingContent(chunk);
                     if (thinking) {
                        logger.debug(` Thinking content extracted: "${thinking}"`);
                        thinkingOutput = thinking;
                     }

                     if ((chunk as any).modelVersion) {
                        model = (chunk as any).modelVersion;
                        logger.debug(` Model version: ${model}`);
                     } else if ((chunk as any).responseId) {
                        model = (chunk as any).responseId;
                        logger.debug(` Response ID as model: ${model}`);
                     }
                     if (chunk.usageMetadata) {
                        usage = {
                           input_tokens: chunk.usageMetadata.promptTokenCount,
                           output_tokens: chunk.usageMetadata.candidatesTokenCount,
                           total_tokens: chunk.usageMetadata.totalTokenCount,
                        };
                        logger.debug(` Usage metadata:`, JSON.stringify(usage));
                     }
                  } else {
                     logger.debug(` No candidates found in chunk`);
                  }
               } catch (error) {
                  logger.warn(` Failed to process JSON object ${i}: "${jsonObject}"`, error);
               }
            }
         }

         if (buffer.trim()) {
            logger.debug(` Processing remaining buffer: ${buffer.length} chars`);
            logger.debug(` Buffer content: `, JSON.stringify(buffer));

            try {
               const chunk = JSON.parse(buffer.trim());
               if (chunk && chunk.candidates && chunk.candidates.length > 0) {
                  logger.debug(`✨ Final chunk parsed: `, JSON.stringify(chunk, null, 2));

                  for (const candidate of chunk.candidates) {
                     if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                        for (const part of candidate.content.parts) {
                           if ('text' in part && part.text && part.text.trim() !== '') {
                              logger.debug(`💬 Final text token: "${part.text}"`);
                              aggregatedText += part.text;

                              const deltaResponse: streamResponse = {
                                 type: 'delta',
                                 token: part.text,
                              };
                              yield deltaResponse;
                           }
                        }
                     }
                  }

                  const thinking = this.extractThinkingContent(chunk);
                  if (thinking) {
                     thinkingOutput = thinking;
                  }

                  if (chunk.usageMetadata) {
                     usage = {
                        input_tokens: chunk.usageMetadata.promptTokenCount,
                        output_tokens: chunk.usageMetadata.candidatesTokenCount,
                        total_tokens: chunk.usageMetadata.totalTokenCount,
                     };
                  }
               }
            } catch (error) {
               logger.warn(`⚠️  Failed to parse final buffer content: `, error);
            }
         }
         yield {
            // for memic the response structure of openAI
            type: 'done',
            token: '',
            completeOutput: aggregatedText,
            thinkingOutput: '',
            model: '',
            usage: {
               input_tokens: 0,
               output_tokens: 0,
               total_tokens: 0,
            },
            status: '',
            fallback: null,
         };

         const finalResponse: streamResponseComplete = {
            type: 'completed',
            token: '',
            completeOutput: aggregatedText,
            thinkingOutput,
            model,
            usage,
            status,
            fallback,
         };

         logger.debug(`🎉 Final completion response: `, JSON.stringify(finalResponse, null, 2));
         logger.debug(`📊 Stream summary: ${chunkCount} chunks, ${totalBytesReceived} bytes, aggregated text length: ${aggregatedText.length}`);

         yield finalResponse;
      } catch (error) {
         logger.error(`💥 Stream processing error: `, error);
         throw error;
      } finally {
         reader.releaseLock();
         logger.debug(`🔒 Stream reader released`);
      }
   }

   // Helper to extract all candidate content text from a StreamChunk
   private extractAllCandidateText(chunk: StreamChunk): string {
      if (!chunk.candidates || chunk.candidates.length === 0) return '';
      let text = '';
      for (const candidate of chunk.candidates) {
         if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            for (const part of candidate.content.parts) {
               if ('text' in part && part.text) {
                  text += part.text;
               }
            }
         }
      }
      return text;
   }
}
