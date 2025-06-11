// jest.config.js
// צור קובץ זה בשורש הפרויקט (ליד App.js)

module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-picker|@react-navigation)/).*/',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
  ],
  collectCoverageFrom: [
    'screens/**/*.{js,jsx}',
    'models/**/*.{js,jsx}',
    'services/**/*.{js,jsx}',
    'viewmodels/**/*.{js,jsx}',
    'hooks/**/*.{js,jsx}',
    '!**/*.test.{js,jsx}',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  verbose: true,
};