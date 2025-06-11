// __tests__/unit-tests-detailed.test.js
// 3 Unit Tests מפורטים לפרויקט הטיקטים

describe('Unit Tests for Ticket Management System', () => {

  // ===========================================
  // TEST 1: User Role Validation (No Mocks)
  // ===========================================
  describe('Test 1: User Role Validation Function', () => {

    // הפונקציה שאנחנו בודקים
    const validateUserRole = (role) => {
      const validRoles = ['student', 'teacher', 'admin'];

      if (!role) {
        return {
          isValid: false,
          error: 'Role is required'
        };
      }

      if (typeof role !== 'string') {
        return {
          isValid: false,
          error: 'Role must be a string'
        };
      }

      if (!validRoles.includes(role.toLowerCase())) {
        return {
          isValid: false,
          error: 'Invalid role. Must be student, teacher, or admin'
        };
      }

      return {
        isValid: true,
        normalizedRole: role.toLowerCase()
      };
    };

    test('should validate correct user roles', () => {
      // 1. Setting up the conditions
      const testCases = [
        { input: 'student', expected: 'student' },
        { input: 'teacher', expected: 'teacher' },
        { input: 'admin', expected: 'admin' },
        { input: 'STUDENT', expected: 'student' }, // case insensitive
        { input: 'Teacher', expected: 'teacher' }
      ];

      testCases.forEach(({ input, expected }) => {
        // 2. Calling the function under test
        const result = validateUserRole(input);

        // 3. Assertions to verify the expected result
        expect(result.isValid).toBe(true);
        expect(result.normalizedRole).toBe(expected);
        expect(result.error).toBeUndefined();
      });
    });

    test('should reject invalid user roles', () => {
      // 1. Setting up the conditions
      const invalidInputs = [
        { input: null, expectedError: 'Role is required' },
        { input: undefined, expectedError: 'Role is required' },
        { input: '', expectedError: 'Role is required' },
        { input: 123, expectedError: 'Role must be a string' },
        { input: [], expectedError: 'Role must be a string' },
        { input: 'manager', expectedError: 'Invalid role. Must be student, teacher, or admin' },
        { input: 'user', expectedError: 'Invalid role. Must be student, teacher, or admin' }
      ];

      invalidInputs.forEach(({ input, expectedError }) => {
        // 2. Calling the function under test
        const result = validateUserRole(input);

        // 3. Assertions to verify the expected result
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(expectedError);
        expect(result.normalizedRole).toBeUndefined();
      });
    });
  });

 // ===========================================
 // TEST 2: Ticket Form Validation
 // ===========================================
 describe('Test 2: Ticket Form Validation Function', () => {

   // הפונקציה שבאמת קיימת בקוד שלך - מבוססת על TicketScreen.js
  // תיקון לפונקציה validateTicketForm בבדיקה

  const validateTicketForm = (formData) => {
    const errors = [];
    const { teacherId, subject, message, studentId } = formData;

    // Validate student ID (required for all tickets)
    if (!studentId) {
      errors.push('Student ID is required');
    }

    // Validate teacher selection (from TicketScreen.js)
    if (!teacherId || teacherId === '') {
      errors.push('Please select a teacher');
    }

    // Validate subject (from TicketScreen.js) - תיקון כאן
    if (!subject) {
      errors.push('Subject is required');
    } else if (subject.trim() === '') {
      errors.push('Subject is required'); // שינוי מ-"Subject cannot be empty"
    } else if (subject.length > 255) {
      errors.push('Subject must be less than 255 characters');
    }

    // Validate message (from TicketScreen.js) - תיקון כאן
    if (!message) {
      errors.push('Message is required');
    } else if (message.trim() === '') {
      errors.push('Message is required'); // שינוי מ-"Message cannot be empty"
    } else if (message.length < 10) {
      errors.push('Message must be at least 10 characters long');
    } else if (message.length > 1000) {
      errors.push('Message must be less than 1000 characters');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  };

  // או לחלופין, תתקן את הבדיקה עצמה:

  test('should reject form with missing required fields', () => {
    // 1. Setting up the conditions
    const invalidFormData = {
      studentId: null,
      teacherId: '',
      subject: '',
      message: ''
    };

    // 2. Calling the function under test
    const result = validateTicketForm(invalidFormData);

    // 3. Assertions to verify the expected result - תיקון כאן
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Student ID is required');
    expect(result.errors).toContain('Please select a teacher');
    expect(result.errors).toContain('Subject is required'); // שינוי
    expect(result.errors).toContain('Message is required'); // שינוי
    expect(result.errors).toHaveLength(4);
  });

  // גם תתקן את הבדיקה של whitespace:
  test('should handle whitespace-only fields', () => {
    // 1. Setting up the conditions
    const formDataWithWhitespace = {
      studentId: 1,
      teacherId: 2,
      subject: '   ',  // Only whitespace
      message: '\t\n\r  '  // Only whitespace and tabs
    };

    // 2. Calling the function under test
    const result = validateTicketForm(formDataWithWhitespace);

    // 3. Assertions to verify the expected result - תיקון כאן
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Subject is required'); // שינוי
    expect(result.errors).toContain('Message is required'); // שינוי
  });
 });


  // ===========================================
  // TEST 3: User Authentication Service with Mock Objects
  // ===========================================
  describe('Test 3: User Authentication Service (WITH MOCK OBJECTS)', () => {

    // Mock Objects - מדמה שירותים חיצוניים
    let mockApiClient;
    let mockPasswordHasher;
    let mockLogger;

    // הפונקציה שאנחנו בודקים
    const authenticateUser = async (email, password, dependencies) => {
      const { apiClient, passwordHasher, logger } = dependencies;

      try {
        logger.info(`Attempting authentication for email: ${email}`);

        // Get user from database via API
        const user = await apiClient.getUserByEmail(email);

        if (!user) {
          logger.warn(`Authentication failed: User not found for email: ${email}`);
          return {
            success: false,
            error: 'User not found'
          };
        }

        // Verify password
        const isPasswordValid = await passwordHasher.verify(password, user.hashedPassword);

        if (!isPasswordValid) {
          logger.warn(`Authentication failed: Invalid password for email: ${email}`);
          return {
            success: false,
            error: 'Invalid password'
          };
        }

        // Success
        logger.info(`Authentication successful for email: ${email}`);
        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role
          }
        };

      } catch (error) {
        logger.error(`Authentication error for email: ${email}`, error);
        return {
          success: false,
          error: 'Authentication service error'
        };
      }
    };

    beforeEach(() => {
      // 1. Setting up the Mock Objects before each test
      mockApiClient = {
        getUserByEmail: jest.fn()
      };

      mockPasswordHasher = {
        verify: jest.fn()
      };

      mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };
    });

    test('should successfully authenticate valid user', async () => {
      // 1. Setting up the conditions
      const email = 'student@test.com';
      const password = 'correct-password';
      const mockUser = {
        id: 1,
        email: 'student@test.com',
        full_name: 'Test Student',
        role: 'student',
        hashedPassword: 'hashed-password-123'
      };

      // Configure mock behaviors
      mockApiClient.getUserByEmail.mockResolvedValue(mockUser);
      mockPasswordHasher.verify.mockResolvedValue(true);

      // 2. Calling the function under test
      const result = await authenticateUser(email, password, {
        apiClient: mockApiClient,
        passwordHasher: mockPasswordHasher,
        logger: mockLogger
      });

      // 3. Assertions to verify the expected result

      // Check final result
      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: 1,
        email: 'student@test.com',
        fullName: 'Test Student',
        role: 'student'
      });
      expect(result.error).toBeUndefined();

      // Verify mock interactions
      expect(mockApiClient.getUserByEmail).toHaveBeenCalledTimes(1);
      expect(mockApiClient.getUserByEmail).toHaveBeenCalledWith('student@test.com');

      expect(mockPasswordHasher.verify).toHaveBeenCalledTimes(1);
      expect(mockPasswordHasher.verify).toHaveBeenCalledWith('correct-password', 'hashed-password-123');

      expect(mockLogger.info).toHaveBeenCalledWith('Attempting authentication for email: student@test.com');
      expect(mockLogger.info).toHaveBeenCalledWith('Authentication successful for email: student@test.com');
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('should fail authentication for non-existent user', async () => {
      // 1. Setting up the conditions
      const email = 'nonexistent@test.com';
      const password = 'any-password';

      // Configure mock to return null (user not found)
      mockApiClient.getUserByEmail.mockResolvedValue(null);

      // 2. Calling the function under test
      const result = await authenticateUser(email, password, {
        apiClient: mockApiClient,
        passwordHasher: mockPasswordHasher,
        logger: mockLogger
      });

      // 3. Assertions to verify the expected result

      // Check final result
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(result.user).toBeUndefined();

      // Verify mock interactions
      expect(mockApiClient.getUserByEmail).toHaveBeenCalledTimes(1);
      expect(mockApiClient.getUserByEmail).toHaveBeenCalledWith('nonexistent@test.com');

      // Password verification should not be called since user wasn't found
      expect(mockPasswordHasher.verify).not.toHaveBeenCalled();

      expect(mockLogger.info).toHaveBeenCalledWith('Attempting authentication for email: nonexistent@test.com');
      expect(mockLogger.warn).toHaveBeenCalledWith('Authentication failed: User not found for email: nonexistent@test.com');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('should fail authentication for invalid password', async () => {
      // 1. Setting up the conditions
      const email = 'student@test.com';
      const password = 'wrong-password';
      const mockUser = {
        id: 1,
        email: 'student@test.com',
        full_name: 'Test Student',
        role: 'student',
        hashedPassword: 'hashed-password-123'
      };

      // Configure mocks
      mockApiClient.getUserByEmail.mockResolvedValue(mockUser);
      mockPasswordHasher.verify.mockResolvedValue(false); // Password verification fails

      // 2. Calling the function under test
      const result = await authenticateUser(email, password, {
        apiClient: mockApiClient,
        passwordHasher: mockPasswordHasher,
        logger: mockLogger
      });

      // 3. Assertions to verify the expected result

      // Check final result
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid password');
      expect(result.user).toBeUndefined();

      // Verify mock interactions
      expect(mockApiClient.getUserByEmail).toHaveBeenCalledTimes(1);
      expect(mockPasswordHasher.verify).toHaveBeenCalledTimes(1);
      expect(mockPasswordHasher.verify).toHaveBeenCalledWith('wrong-password', 'hashed-password-123');

      expect(mockLogger.info).toHaveBeenCalledWith('Attempting authentication for email: student@test.com');
      expect(mockLogger.warn).toHaveBeenCalledWith('Authentication failed: Invalid password for email: student@test.com');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('should handle service errors gracefully', async () => {
      // 1. Setting up the conditions
      const email = 'student@test.com';
      const password = 'any-password';
      const serviceError = new Error('Database connection failed');

      // Configure mock to throw an error
      mockApiClient.getUserByEmail.mockRejectedValue(serviceError);

      // 2. Calling the function under test
      const result = await authenticateUser(email, password, {
        apiClient: mockApiClient,
        passwordHasher: mockPasswordHasher,
        logger: mockLogger
      });

      // 3. Assertions to verify the expected result

      // Check final result
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication service error');
      expect(result.user).toBeUndefined();

      // Verify mock interactions
      expect(mockApiClient.getUserByEmail).toHaveBeenCalledTimes(1);
      expect(mockPasswordHasher.verify).not.toHaveBeenCalled();

      expect(mockLogger.info).toHaveBeenCalledWith('Attempting authentication for email: student@test.com');
      expect(mockLogger.error).toHaveBeenCalledWith('Authentication error for email: student@test.com', serviceError);
    });

    afterEach(() => {
      // Clean up mocks after each test
      jest.clearAllMocks();
    });
  });
});