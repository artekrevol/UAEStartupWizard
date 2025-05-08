/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },
  testMatch: [
    '<rootDir>/test/**/*.test.js',
    '<rootDir>/test/**/*.test.ts',
    '<rootDir>/test/**/*.spec.js',
    '<rootDir>/test/**/*.spec.ts'
  ],
  collectCoverage: false, // Disabled for now to avoid JSX parsing errors
  collectCoverageFrom: [
    'shared/**/*.{js,ts}',
    'server/**/*.{js,ts}',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  coverageDirectory: '<rootDir>/test/coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  transformIgnorePatterns: [
    '/node_modules/(?!(@replit|wouter)/)'
  ]
};

module.exports = config;