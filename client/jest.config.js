export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    // supabase.js reads import.meta.env, which Jest can't parse; tests use a stub instead.
    '^\\.{1,2}/(.*/)?supabase(\\.js)?$': '<rootDir>/src/__mocks__/supabase.js',
    '\\.css$': '<rootDir>/src/__mocks__/style.js',
  },
}
