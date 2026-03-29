/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Resolve workspace packages to source for testing without build
    '^@netpad/forms$': '<rootDir>/packages/forms/src/index.ts',
    '^@netpad/forms/(.*)$': '<rootDir>/packages/forms/src/$1',
    '^@netpad/templates$': '<rootDir>/packages/templates/src/index.ts',
    '^@netpad/templates/(.*)$': '<rootDir>/packages/templates/src/$1',
    // Mock mongodb module to avoid ESM issues
    '^mongodb$': '<rootDir>/tests/__mocks__/mongodb.ts',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        moduleResolution: 'node',
        strict: true,
        target: 'ES2020',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        noEmit: true,
        module: 'esnext',
        resolveJsonModule: true,
        isolatedModules: true,
        incremental: true,
        paths: {
          '@/*': ['./src/*']
        }
      }
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(bson)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types/**',
    '!src/app/**', // Exclude Next.js app routes from unit test coverage
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.test.{ts,tsx}',
  ],
  verbose: true,
};

module.exports = config;
