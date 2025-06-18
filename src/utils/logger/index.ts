import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

class Logger {
   private static logFile: string = path.join(os.homedir(), '.llmforge', 'llmforge.logs');
   private static timestamp: boolean = true;
   constructor() {}

   private static formatMessage(level: string, message: any[]): string {
      const timestamp = Logger.timestamp ? `[${new Date().toISOString()}]` : '';
      const levelTag = `[${level.toUpperCase()}]`;
      const content = message.map(item => (typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item))).join(' ');

      return `${timestamp} ${levelTag} ${content}`;
   }

   private static writeToFile(message: string): void {
      try {
         const logDir = path.dirname(Logger.logFile);
         if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
         }
         fs.appendFileSync(Logger.logFile, message + '\n');
      } catch (error) {
         console.error('Failed to write to log file:', error);
      }
   }

   static info(...message: any[]): void {
      const formattedMessage = Logger.formatMessage('info', message);
      Logger.writeToFile(formattedMessage);
   }

   static debug(...message: any[]): void {
      const formattedMessage = Logger.formatMessage('debug', message);
      Logger.writeToFile(formattedMessage);
   }

   static error(...message: any[]): void {
      const formattedMessage = Logger.formatMessage('error', message);
      Logger.writeToFile(formattedMessage);
   }

   static warn(...message: any[]): void {
      const formattedMessage = Logger.formatMessage('warn', message);
      Logger.writeToFile(formattedMessage);
   }
}

export const logger = Logger;
