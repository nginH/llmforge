const { RunnerClient } = require('../../dist');
const fs = require('fs');
const path = require('path');

isLogginEnabled = false;

class TestHelpers {
   static getLogFile() {
      const logDir = path.resolve(__dirname, '../../logs');
      if (!fs.existsSync(logDir)) {
         fs.mkdirSync(logDir, { recursive: true });
      }
      return path.join(logDir, 'all.log');
   }

   static skipIfNoApiKey(apiKey, provider) {
      if (!apiKey) {
         console.warn(`Skipping ${provider} test - no API key provided`);
         return true;
      }
      return false;
   }

   static async createClientSafely(config) {
      try {
         return await RunnerClient.create(config);
      } catch (error) {
         throw new Error(`Failed to create client: ${error.message}`);
      }
   }

   static async runAndValidateResponse(client, content) {
      const response = await client.run(content);

      expect(response).toBeDefined();
      expect(typeof response).toBe('object');

      return response;
   }

   static async expectError(asyncFn, expectedErrorType = Error) {
      try {
         await asyncFn();
         throw new Error('Expected function to throw an error, but it did not');
      } catch (error) {
         expect(error).toBeInstanceOf(expectedErrorType);
         return error;
      }
   }

   static logResponse(provider, response) {
      if (isLogginEnabled) return;

      const logFile = this.getLogFile();
      const logEntry = `${new Date().toISOString()} ${provider} Response: ${JSON.stringify(response, null, 2)}\n`;
      fs.appendFileSync(logFile, logEntry, 'utf8');
   }

   static logError(context, error) {
      if (isLogginEnabled) return;
      const logFile = this.getLogFile();
      const logEntry = `${new Date().toISOString()} ${context} error: ${error.message}\n`;
      fs.appendFileSync(logFile, logEntry, 'utf8');
   }
}

module.exports = { TestHelpers };
