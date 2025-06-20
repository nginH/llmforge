import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const logging = false;

class Logger {
   private static logFile: string = path.join(__dirname, '../../../.llmforge', 'llmforge.log');
   private static timestamp: boolean = true;
   constructor() {}

   private static formatMessage(level: string, message: any[]): string {
      const timestamp = Logger.timestamp ? `[${new Date().toISOString()}]` : '';
      const levelTag = `[${level.toUpperCase()}]`;
      const content = message
         .map(item => {
            try {
               if (typeof item === 'object') {
                  return JSON.stringify(item, null, 2);
               }
               return String(item);
            } catch (e) {
               return '[Unserializable Object]';
            }
         })
         .join(' ');

      return `${timestamp} ${levelTag} ${content}`;
   }

   private static writeToFile(message: string): void {
      try {
         const logDir = path.dirname(Logger.logFile);
         if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
         }
         fs.appendFile(Logger.logFile, message + '\n', err => {
            if (err) {
               try {
                  fs.appendFileSync(Logger.logFile, message + '\n');
               } catch (syncErr) {
                  process.stderr.write('Failed to write to log file: ' + String(syncErr) + '\n');
               }
            }
         });
      } catch (error) {
         process.stderr.write('Failed to write to log file: ' + String(error) + '\n');
      }
   }

   static info(...message: any[]): void {
      if (!logging) return; //
      const formattedMessage = Logger.formatMessage('info', message);
      Logger.writeToFile(formattedMessage);
      console.log(formattedMessage);
   }

   static debug(...message: any[]): void {
      if (!logging) return; // Skip debug logs if logging is disabled
      const formattedMessage = Logger.formatMessage('debug', message);
      Logger.writeToFile(formattedMessage);
      console.info(formattedMessage);
   }

   static error(...message: any[]): void {
      if (!logging) return; //
      const formattedMessage = Logger.formatMessage('error', message);
      Logger.writeToFile(formattedMessage);
      console.error(formattedMessage);
   }

   static warn(...message: any[]): void {
      const formattedMessage = Logger.formatMessage('warn', message);
      Logger.writeToFile(formattedMessage);
      console.warn(formattedMessage);
   }
}

export const logger = Logger;
