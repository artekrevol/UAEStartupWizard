import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: [
    '**/test/unit/**/*.test.ts',
    '**/test/integration/**/*.test.ts',
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'test/reports/coverage',
  collectCoverageFrom: [
    'server/**/*.{ts,tsx}',
    'client/src/**/*.{ts,tsx}',
    'shared/**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/vendor/**',
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  reporters: [
    'default',
    [
      'jest-html-reporter', 
      {
        pageTitle: 'UAE Business Setup Platform Test Report',
        outputPath: 'test/reports/test-report.html',
        includeFailureMsg: true,
        includeConsoleLog: true,
      }
    ]
  ],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/test/utils/jest.setup.ts'],
};

export default config;