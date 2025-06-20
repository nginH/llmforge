import { AiRoleOmitModelToAssistant, Content, ContentPart } from 'index';
import { logger } from '../utils/logger';
import { Readable } from 'stream';

export class CommanMethods {
   public static convertReadableToResponse(readable: Readable): Response {
      return new Response(readable as unknown as ReadableStream, {
         headers: new Headers(),
         status: 200,
         statusText: 'OK',
      });
   }
   public static omitModelToAssistantInContents(contents: Content[]): AiRoleOmitModelToAssistant[] {
      logger.info('content before omitting model to assistant:', JSON.stringify(contents, null, 2));
      const result = contents.map(content => {
         const role = content.role === 'model' ? 'assistant' : content.role || 'user';
         const message: AiRoleOmitModelToAssistant = {
            role: role as 'system' | 'user' | 'assistant',
            content: Array.isArray(content.parts)
               ? content.parts
                    .map((part: ContentPart) => {
                       if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
                          return part.text;
                       }
                       return '';
                    })
                    .join('\n')
               : '',
         };
         return message;
      });
      logger.info('content after omitting model to assistant:', JSON.stringify(result, null, 2));
      return result;
   }

   static validateContents(contents: Content[]): void {
      if (!contents || contents.length === 0) {
         throw new Error('Contents array cannot be empty');
      }

      for (const content of contents) {
         CommanMethods.validateContent(content);
      }
   }

   static validateContent(content: Content): void {
      if (!content || typeof content !== 'object' || !('role' in content) || !('parts' in content)) {
         throw new Error('Invalid content object');
      }
   }
}
