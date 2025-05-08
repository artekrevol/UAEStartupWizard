/**
 * Jest Test Setup File
 * 
 * This file runs before each test suite to set up the environment
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for all tests to 10 seconds
jest.setTimeout(10000);

// Add custom matchers if needed
// expect.extend({
//   yourCustomMatcher(received, expected) {
//     // ...
//   },
// });

// Mock global variables or functions if needed
// global.fetch = jest.fn();

// Clean up after all tests
afterAll(async () => {
  // Any cleanup needed after all tests run
  // For example, close DB connections, etc.
});