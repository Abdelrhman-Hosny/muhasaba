module.exports = {
  projects: [
    {
      displayName: 'domain',
      testMatch: ['<rootDir>/__tests__/domain/**/*.test.ts'],
      testEnvironment: 'node',
      transform: {
        '\\.[jt]sx?$': 'babel-jest',
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    {
      displayName: 'app',
      preset: 'jest-expo',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
      testPathIgnorePatterns: ['<rootDir>/__tests__/domain/'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@legendapp/.*|@supabase/.*))',
      ],
      moduleNameMapper: {
        // Prevent expo winter lazy getters from calling require() between
        // tests in jest@30 (which throws "require outside test scope").
        '^expo/src/winter$': '<rootDir>/__mocks__/expo-winter.js',
        '^expo/virtual/streams$': '<rootDir>/__mocks__/expo-virtual-streams.js',
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  ],
};
