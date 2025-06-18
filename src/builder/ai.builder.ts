import { Content, ContentPart } from '../types';

export class ContentBuilder {
   private contents: Content[] = [];

   static create(): ContentBuilder {
      return new ContentBuilder();
   }

   addTextMessage(text: string, role: 'user' | 'model' | 'system' = 'user'): ContentBuilder {
      this.contents.push({
         role,
         parts: [{ text }],
      });
      return this;
   }

   addImageFromBase64(base64Data: string, mimeType: string, text?: string, role: 'user' | 'model' = 'user'): ContentBuilder {
      const parts: ContentPart[] = [
         {
            inline_data: {
               mime_type: mimeType,
               data: base64Data,
            },
         },
      ];

      if (text) {
         parts.push({ text });
      }

      this.contents.push({ role, parts });
      return this;
   }

   addImageFromFile(fileUri: string, mimeType: string, text?: string, role: 'user' | 'model' = 'user'): ContentBuilder {
      const parts: ContentPart[] = [
         {
            file_data: {
               mime_type: mimeType,
               file_uri: fileUri,
            },
         },
      ];

      if (text) {
         parts.push({ text });
      }

      this.contents.push({ role, parts });
      return this;
   }

   addDocumentFromBase64(base64Data: string, mimeType: string, text?: string, role: 'user' | 'model' = 'user'): ContentBuilder {
      const parts: ContentPart[] = [
         {
            inline_data: {
               mime_type: mimeType,
               data: base64Data,
            },
         },
      ];

      if (text) {
         parts.push({ text });
      }

      this.contents.push({ role, parts });
      return this;
   }

   addConversationTurn(userText: string, modelText: string): ContentBuilder {
      this.addTextMessage(userText, 'user');
      this.addTextMessage(modelText, 'model');
      return this;
   }

   build(): Content[] {
      return [...this.contents];
   }

   clear(): ContentBuilder {
      this.contents = [];
      return this;
   }

   getLastContent(): Content | undefined {
      return this.contents[this.contents.length - 1];
   }

   removeLastContent(): ContentBuilder {
      this.contents.pop();
      return this;
   }

   static fromMessages(messages: Array<{ role: 'user' | 'model' | 'system'; text: string }>): Content[] {
      return messages.map(msg => ({
         role: msg.role,
         parts: [{ text: msg.text }],
      }));
   }

   static textOnly(text: string, role: 'user' | 'model' | 'system' = 'user'): Content[] {
      return [{ role, parts: [{ text }] }];
   }
}

export class FileEncoder {
   static async encodeFileToBase64(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
         };
         reader.onerror = reject;
         reader.readAsDataURL(file);
      });
   }

   static async encodeBufferToBase64(buffer: ArrayBuffer): Promise<string> {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
         binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
   }

   static getMimeTypeFromFile(file: File): string {
      return file.type || this.getMimeTypeFromExtension(file.name);
   }

   static getMimeTypeFromExtension(filename: string): string {
      const ext = filename.toLowerCase().split('.').pop();
      const mimeTypes: Record<string, string> = {
         // Images
         jpg: 'image/jpeg',
         jpeg: 'image/jpeg',
         png: 'image/png',
         gif: 'image/gif',
         webp: 'image/webp',
         bmp: 'image/bmp',
         svg: 'image/svg+xml',

         // Documents
         pdf: 'application/pdf',
         txt: 'text/plain',
         md: 'text/markdown',
         html: 'text/html',
         css: 'text/css',
         js: 'application/javascript',
         json: 'application/json',
         xml: 'application/xml',

         // Office documents
         doc: 'application/msword',
         docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         xls: 'application/vnd.ms-excel',
         xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         ppt: 'application/vnd.ms-powerpoint',
         pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

         // Audio/Video
         mp3: 'audio/mpeg',
         wav: 'audio/wav',
         mp4: 'video/mp4',
         avi: 'video/x-msvideo',
         mov: 'video/quicktime',
      };

      return mimeTypes[ext || ''] || 'application/octet-stream';
   }
}

export class MessageValidator {
   static validateContent(content: Content): void {
      if (!content.parts || content.parts.length === 0) {
         throw new Error('Content must have at least one part');
      }

      for (const part of content.parts) {
         if ('text' in part) {
            if (!part.text || typeof part.text !== 'string') {
               throw new Error('Text part must have non-empty text string');
            }
         } else if ('inline_data' in part) {
            if (!part.inline_data.mime_type || !part.inline_data.data) {
               throw new Error('Inline data part must have mime_type and data');
            }
         } else if ('file_data' in part) {
            if (!part.file_data.mime_type || !part.file_data.file_uri) {
               throw new Error('File data part must have mime_type and file_uri');
            }
         } else {
            throw new Error('Invalid content part type');
         }
      }
   }

   static validateContents(contents: Content[]): void {
      if (!contents || contents.length === 0) {
         throw new Error('Contents array cannot be empty');
      }

      for (const content of contents) {
         this.validateContent(content);
      }
   }
}
