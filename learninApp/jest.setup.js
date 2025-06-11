// jest.setup.js
// קובץ מתוקן ללא חבילות שלא קיימות

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock React Native Alert
jest.mock('react-native', () => {
  const actualReactNative = jest.requireActual('react-native');
  return {
    ...actualReactNative,
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Mock the picker component
jest.mock('@react-native-picker/picker', () => ({
  Picker: {
    Item: 'PickerItem'
  }
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

console.log('Jest setup loaded successfully!');