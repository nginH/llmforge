module.exports = {
   testEnvironment: 'node',
   setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
   testMatch: ['<rootDir>/tests/**/*.test.js'],
   collectCoverageFrom: ['src/**/*.js', 'dist/**/*.js', '!**/node_modules/**'],
   coverageDirectory: 'coverage',
   coverageReporters: ['text', 'lcov', 'html'],
   verbose: true,
   testTimeout: 35000,
};
