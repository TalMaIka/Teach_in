
  // ===========================================
  // TEST 1: Lesson Registration System (No Mocks)
  // ===========================================
  describe('Test 1: Lesson Registration System', () => {

    const LessonRegistration = {
      lessons: [],
      registrations: [],

      // Add a lesson to the system
      addLesson: function(lesson) {
        if (!lesson || typeof lesson !== 'object') {
          throw new Error('Lesson must be an object');
        }

        if (!lesson.teacher_id || !lesson.subject || !lesson.date || !lesson.time) {
          throw new Error('Lesson must have teacher_id, subject, date, and time');
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(lesson.date)) {
          throw new Error('Date must be in YYYY-MM-DD format');
        }

        // Validate time format (HH:MM)
        const timeRegex = /^\d{2}:\d{2}$/;
        if (!timeRegex.test(lesson.time)) {
          throw new Error('Time must be in HH:MM format');
        }

        // Check for duplicate lessons (same teacher, date, time)
        const duplicate = this.lessons.find(l =>
          l.teacher_id === lesson.teacher_id &&
          l.date === lesson.date &&
          l.time === lesson.time
        );

        if (duplicate) {
          throw new Error('Teacher already has a lesson at this time');
        }

        const newLesson = {
          ...lesson,
          id: Date.now() + Math.random(),
          max_students: lesson.max_students || 20,
          created_at: new Date().toISOString()
        };

        this.lessons.push(newLesson);
        return newLesson;
      },

      // Register student for a lesson
      registerStudent: function(lessonId, studentId) {
        if (!lessonId || !studentId) {
          throw new Error('Lesson ID and Student ID are required');
        }

        const lesson = this.lessons.find(l => l.id === lessonId);
        if (!lesson) {
          return {
            success: false,
            error: 'Lesson not found'
          };
        }

        // Check if student is already registered
        const existingRegistration = this.registrations.find(r =>
          r.lesson_id === lessonId && r.student_id === studentId
        );

        if (existingRegistration) {
          return {
            success: false,
            error: 'Student already registered for this lesson'
          };
        }

        // Check if lesson is full
        const currentStudents = this.registrations.filter(r => r.lesson_id === lessonId).length;
        if (currentStudents >= lesson.max_students) {
          return {
            success: false,
            error: 'Lesson is full'
          };
        }

        // Check if lesson is in the past
        const lessonDateTime = new Date(`${lesson.date}T${lesson.time}`);
        const now = new Date();
        if (lessonDateTime < now) {
          return {
            success: false,
            error: 'Cannot register for past lessons'
          };
        }

        const registration = {
          id: Date.now() + Math.random(),
          lesson_id: lessonId,
          student_id: studentId,
          registered_at: new Date().toISOString()
        };

        this.registrations.push(registration);
        return {
          success: true,
          registration: registration
        };
      },

      // Unregister student from lesson
      unregisterStudent: function(lessonId, studentId) {
        const registrationIndex = this.registrations.findIndex(r =>
          r.lesson_id === lessonId && r.student_id === studentId
        );

        if (registrationIndex === -1) {
          return {
            success: false,
            error: 'Registration not found'
          };
        }

        // Check if lesson has already started (within 1 hour)
        const lesson = this.lessons.find(l => l.id === lessonId);
        if (lesson) {
          const lessonDateTime = new Date(`${lesson.date}T${lesson.time}`);
          const now = new Date();
          const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

          if (lessonDateTime < oneHourFromNow) {
            return {
              success: false,
              error: 'Cannot unregister less than 1 hour before lesson starts'
            };
          }
        }

        this.registrations.splice(registrationIndex, 1);
        return {
          success: true,
          message: 'Successfully unregistered from lesson'
        };
      },

      // Get available lessons (not full, future lessons)
      getAvailableLessons: function() {
        const now = new Date();

        return this.lessons.filter(lesson => {
          const lessonDateTime = new Date(`${lesson.date}T${lesson.time}`);
          const currentStudents = this.registrations.filter(r => r.lesson_id === lesson.id).length;

          return lessonDateTime > now && currentStudents < lesson.max_students;
        }).sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}`);
          const dateB = new Date(`${b.date}T${b.time}`);
          return dateA - dateB;
        });
      },

      // Clear all data (for testing)
      clear: function() {
        this.lessons = [];
        this.registrations = [];
      }
    };

    beforeEach(() => {
      LessonRegistration.clear();
    });

    test('should successfully add valid lessons', () => {
      // 1. Setting up the conditions
      const lesson1 = {
        teacher_id: 1,
        subject: 'Mathematics',
        date: '2025-07-01',
        time: '14:00',
        max_students: 15
      };

      const lesson2 = {
        teacher_id: 2,
        subject: 'Physics',
        date: '2025-07-02',
        time: '10:30'
      };

      // 2. Calling the function under test
      const result1 = LessonRegistration.addLesson(lesson1);
      const result2 = LessonRegistration.addLesson(lesson2);

      // 3. Assertions to verify the expected result
      expect(result1.subject).toBe('Mathematics');
      expect(result1.max_students).toBe(15);
      expect(result1.id).toBeDefined();

      expect(result2.subject).toBe('Physics');
      expect(result2.max_students).toBe(20); // Default value
      expect(LessonRegistration.lessons).toHaveLength(2);
    });

    test('should reject invalid lesson data', () => {
      // Test missing required fields
      expect(() => LessonRegistration.addLesson({})).toThrow('Lesson must have teacher_id, subject, date, and time');

      // Test invalid date format
      expect(() => LessonRegistration.addLesson({
        teacher_id: 1,
        subject: 'Math',
        date: '01-07-2025', // Wrong format
        time: '14:00'
      })).toThrow('Date must be in YYYY-MM-DD format');

      // Test invalid time format
      expect(() => LessonRegistration.addLesson({
        teacher_id: 1,
        subject: 'Math',
        date: '2025-07-01',
        time: '2:00 PM' // Wrong format
      })).toThrow('Time must be in HH:MM format');

      // Test duplicate lesson
      const lesson = {
        teacher_id: 1,
        subject: 'Math',
        date: '2025-07-01',
        time: '14:00'
      };

      LessonRegistration.addLesson(lesson);
      expect(() => LessonRegistration.addLesson(lesson)).toThrow('Teacher already has a lesson at this time');
    });

    test('should handle student registration correctly', () => {
      // 1. Setting up the conditions
      const lesson = LessonRegistration.addLesson({
        teacher_id: 1,
        subject: 'Math',
        date: '2025-12-01', // Future date
        time: '14:00',
        max_students: 2
      });

      // 2. Calling the function under test
      const result1 = LessonRegistration.registerStudent(lesson.id, 101);
      const result2 = LessonRegistration.registerStudent(lesson.id, 102);
      const result3 = LessonRegistration.registerStudent(lesson.id, 103); // Should fail - lesson full

      // 3. Assertions to verify the expected result
      expect(result1.success).toBe(true);
      expect(result1.registration.student_id).toBe(101);

      expect(result2.success).toBe(true);
      expect(result2.registration.student_id).toBe(102);

      expect(result3.success).toBe(false);
      expect(result3.error).toBe('Lesson is full');

      // Test duplicate registration
      const duplicate = LessonRegistration.registerStudent(lesson.id, 101);
      expect(duplicate.success).toBe(false);
      expect(duplicate.error).toBe('Student already registered for this lesson');
    });

    test('should prevent registration for past lessons', () => {
      // 1. Setting up the conditions - past lesson
      const pastLesson = LessonRegistration.addLesson({
        teacher_id: 1,
        subject: 'History',
        date: '2020-01-01', // Past date
        time: '10:00'
      });

      // 2. Calling the function under test
      const result = LessonRegistration.registerStudent(pastLesson.id, 101);

      // 3. Assertions to verify the expected result
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot register for past lessons');
    });

    test('should handle unregistration with time restrictions', () => {
      // 1. Setting up the conditions
      const futureLesson = LessonRegistration.addLesson({
        teacher_id: 1,
        subject: 'Math',
        date: '2025-12-01',
        time: '14:00'
      });

      const soonLesson = LessonRegistration.addLesson({
        teacher_id: 2,
        subject: 'Science',
        date: new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 10), // 30 minutes from now
        time: new Date(Date.now() + 30 * 60 * 1000).toTimeString().slice(0, 5)
      });

      // Register students
      LessonRegistration.registerStudent(futureLesson.id, 101);
      LessonRegistration.registerStudent(soonLesson.id, 102);

      // 2. Calling the function under test
      const futureResult = LessonRegistration.unregisterStudent(futureLesson.id, 101);
      const soonResult = LessonRegistration.unregisterStudent(soonLesson.id, 102);

      // 3. Assertions to verify the expected result
      expect(futureResult.success).toBe(true);
      expect(futureResult.message).toBe('Successfully unregistered from lesson');

      expect(soonResult.success).toBe(false);
      expect(soonResult.error).toBe('Cannot unregister less than 1 hour before lesson starts');
    });

    test('should return available lessons in chronological order', () => {
      // 1. Setting up the conditions
      const lesson1 = LessonRegistration.addLesson({
        teacher_id: 1,
        subject: 'Math',
        date: '2025-07-03',
        time: '14:00',
        max_students: 2
      });

      const lesson2 = LessonRegistration.addLesson({
        teacher_id: 2,
        subject: 'Science',
        date: '2025-07-01',
        time: '10:00',
        max_students: 1
      });

      const lesson3 = LessonRegistration.addLesson({
        teacher_id: 3,
        subject: 'History',
        date: '2025-07-02',
        time: '16:00'
      });

      // Fill up lesson2 to make it unavailable
      LessonRegistration.registerStudent(lesson2.id, 101);

      // 2. Calling the function under test
      const availableLessons = LessonRegistration.getAvailableLessons();

      // 3. Assertions to verify the expected result
      expect(availableLessons).toHaveLength(2); // lesson2 should be excluded (full)
      expect(availableLessons[0].subject).toBe('History'); // July 2nd comes before July 3rd
      expect(availableLessons[1].subject).toBe('Math');
    });
  });

  // ===========================================
  // TEST 2: File Upload Validator with Mocks
  // ===========================================
  describe('Test 2: File Upload Validator (WITH MOCKS)', () => {

    let mockFileSystem;
    let mockImageProcessor;
    let mockLogger;

    const validateAndProcessFile = async (file, dependencies) => {
      const { fileSystem, imageProcessor, logger } = dependencies;

      try {
        logger.info(`Processing file: ${file.name}`);

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
          logger.warn(`Invalid file type: ${file.type}`);
          return {
            success: false,
            error: 'Invalid file type. Only JPEG, PNG, and GIF are allowed.'
          };
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          logger.warn(`File too large: ${file.size} bytes`);
          return {
            success: false,
            error: 'File too large. Maximum size is 5MB.'
          };
        }

        // Check if file exists and is readable
        const isReadable = await fileSystem.checkReadable(file.path);
        if (!isReadable) {
          logger.error(`File not readable: ${file.path}`);
          return {
            success: false,
            error: 'File is not readable or corrupted.'
          };
        }

        // Process the image
        const processedFile = await imageProcessor.compress(file, { quality: 80 });

        // Save to uploads directory
        const savedPath = await fileSystem.save(processedFile, '/uploads/');

        logger.info(`File processed and saved: ${savedPath}`);
        return {
          success: true,
          processedFile: {
            originalName: file.name,
            savedPath: savedPath,
            size: processedFile.size,
            type: file.type
          }
        };

      } catch (error) {
        logger.error(`File processing error for ${file.name}:`, error);
        return {
          success: false,
          error: 'File processing failed'
        };
      }
    };

    beforeEach(() => {
      // 1. Setting up the Mock Objects before each test
      mockFileSystem = {
        checkReadable: jest.fn(),
        save: jest.fn()
      };

      mockImageProcessor = {
        compress: jest.fn()
      };

      mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };
    });

    test('should successfully process valid image file', async () => {
      // 1. Setting up the conditions
      const validFile = {
        name: 'test-image.jpg',
        type: 'image/jpeg',
        size: 1024 * 1024, // 1MB
        path: '/temp/test-image.jpg'
      };

      const compressedFile = {
        ...validFile,
        size: 800 * 1024 // Compressed to 800KB
      };

      // Configure mock behaviors
      mockFileSystem.checkReadable.mockResolvedValue(true);
      mockImageProcessor.compress.mockResolvedValue(compressedFile);
      mockFileSystem.save.mockResolvedValue('/uploads/test-image-123.jpg');

      // 2. Calling the function under test
      const result = await validateAndProcessFile(validFile, {
        fileSystem: mockFileSystem,
        imageProcessor: mockImageProcessor,
        logger: mockLogger
      });

      // 3. Assertions to verify the expected result
      expect(result.success).toBe(true);
      expect(result.processedFile.originalName).toBe('test-image.jpg');
      expect(result.processedFile.savedPath).toBe('/uploads/test-image-123.jpg');
      expect(result.processedFile.size).toBe(800 * 1024);

      // Verify mock interactions
      expect(mockFileSystem.checkReadable).toHaveBeenCalledWith('/temp/test-image.jpg');
      expect(mockImageProcessor.compress).toHaveBeenCalledWith(validFile, { quality: 80 });
      expect(mockFileSystem.save).toHaveBeenCalledWith(compressedFile, '/uploads/');
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });

    test('should reject invalid file types', async () => {
      // 1. Setting up the conditions
      const invalidFile = {
        name: 'document.pdf',
        type: 'application/pdf',
        size: 1024,
        path: '/temp/document.pdf'
      };

      // 2. Calling the function under test
      const result = await validateAndProcessFile(invalidFile, {
        fileSystem: mockFileSystem,
        imageProcessor: mockImageProcessor,
        logger: mockLogger
      });

      // 3. Assertions to verify the expected result
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid file type. Only JPEG, PNG, and GIF are allowed.');

      // Verify that file processing was not attempted
      expect(mockFileSystem.checkReadable).not.toHaveBeenCalled();
      expect(mockImageProcessor.compress).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid file type: application/pdf');
    });

    test('should reject files that are too large', async () => {
      // 1. Setting up the conditions
      const largeFile = {
        name: 'huge-image.jpg',
        type: 'image/jpeg',
        size: 10 * 1024 * 1024, // 10MB
        path: '/temp/huge-image.jpg'
      };

      // 2. Calling the function under test
      const result = await validateAndProcessFile(largeFile, {
        fileSystem: mockFileSystem,
        imageProcessor: mockImageProcessor,
        logger: mockLogger
      });

      // 3. Assertions to verify the expected result
      expect(result.success).toBe(false);
      expect(result.error).toBe('File too large. Maximum size is 5MB.');
      expect(mockLogger.warn).toHaveBeenCalledWith(`File too large: ${largeFile.size} bytes`);
    });

    test('should handle corrupted or unreadable files', async () => {
      // 1. Setting up the conditions
      const corruptedFile = {
        name: 'corrupted.jpg',
        type: 'image/jpeg',
        size: 1024,
        path: '/temp/corrupted.jpg'
      };

      // Configure mock to simulate unreadable file
      mockFileSystem.checkReadable.mockResolvedValue(false);

      // 2. Calling the function under test
      const result = await validateAndProcessFile(corruptedFile, {
        fileSystem: mockFileSystem,
        imageProcessor: mockImageProcessor,
        logger: mockLogger
      });

      // 3. Assertions to verify the expected result
      expect(result.success).toBe(false);
      expect(result.error).toBe('File is not readable or corrupted.');
      expect(mockFileSystem.checkReadable).toHaveBeenCalledWith('/temp/corrupted.jpg');
      expect(mockImageProcessor.compress).not.toHaveBeenCalled();
    });

    test('should handle processing errors gracefully', async () => {
      // 1. Setting up the conditions
      const validFile = {
        name: 'test.jpg',
        type: 'image/jpeg',
        size: 1024,
        path: '/temp/test.jpg'
      };

      const processingError = new Error('Image compression failed');

      // Configure mocks
      mockFileSystem.checkReadable.mockResolvedValue(true);
      mockImageProcessor.compress.mockRejectedValue(processingError);

      // 2. Calling the function under test
      const result = await validateAndProcessFile(validFile, {
        fileSystem: mockFileSystem,
        imageProcessor: mockImageProcessor,
        logger: mockLogger
      });

      // 3. Assertions to verify the expected result
      expect(result.success).toBe(false);
      expect(result.error).toBe('File processing failed');
      expect(mockLogger.error).toHaveBeenCalledWith('File processing error for test.jpg:', processingError);
    });

    afterEach(() => {
      // Clean up mocks after each test
      jest.clearAllMocks();
    });
  });

  // ===========================================
  // TEST 3: Real-time Notification System (Edge Cases)
  // ===========================================
  describe('Test 3: Notification System Edge Cases', () => {

    const NotificationManager = {
      notifications: [],
      subscribers: [],

      subscribe: function(callback) {
        if (typeof callback !== 'function') {
          throw new Error('Callback must be a function');
        }
        this.subscribers.push(callback);
        return () => {
          this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
      },

      notify: function(notification) {
        if (!notification || typeof notification !== 'object') {
          throw new Error('Notification must be an object');
        }

        if (!notification.type || !notification.message) {
          throw new Error('Notification must have type and message');
        }

        const timestamp = new Date().toISOString();
        const fullNotification = {
          ...notification,
          id: Date.now() + Math.random(),
          timestamp,
          read: false
        };

        this.notifications.push(fullNotification);

        // Notify all subscribers
        this.subscribers.forEach(callback => {
          try {
            callback(fullNotification);
          } catch (error) {
            console.error('Subscriber callback error:', error);
          }
        });

        return fullNotification;
      },

      markAsRead: function(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.read = true;
          return true;
        }
        return false;
      },

      getUnreadCount: function() {
        return this.notifications.filter(n => !n.read).length;
      },

      clear: function() {
        this.notifications = [];
        this.subscribers = [];
      }
    };

    beforeEach(() => {
      NotificationManager.clear();
    });

    test('should handle multiple subscribers correctly', () => {
      // 1. Setting up the conditions
      const subscriber1 = jest.fn();
      const subscriber2 = jest.fn();
      const subscriber3 = jest.fn();

      NotificationManager.subscribe(subscriber1);
      NotificationManager.subscribe(subscriber2);
      NotificationManager.subscribe(subscriber3);

      const notification = {
        type: 'ticket_response',
        message: 'New response received',
        ticketId: 123
      };

      // 2. Calling the function under test
      const result = NotificationManager.notify(notification);

      // 3. Assertions to verify the expected result
      expect(subscriber1).toHaveBeenCalledTimes(1);
      expect(subscriber2).toHaveBeenCalledTimes(1);
      expect(subscriber3).toHaveBeenCalledTimes(1);

      expect(subscriber1).toHaveBeenCalledWith(expect.objectContaining({
        type: 'ticket_response',
        message: 'New response received',
        ticketId: 123,
        read: false
      }));
    });

    test('should handle subscriber errors gracefully', () => {
      // 1. Setting up the conditions
      const workingSubscriber = jest.fn();
      const faultySubscriber = jest.fn(() => {
        throw new Error('Subscriber error');
      });
      const anotherWorkingSubscriber = jest.fn();

      NotificationManager.subscribe(workingSubscriber);
      NotificationManager.subscribe(faultySubscriber);
      NotificationManager.subscribe(anotherWorkingSubscriber);

      // Spy on console.error to verify error handling
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // 2. Calling the function under test
      const notification = { type: 'error_test', message: 'Test message' };
      NotificationManager.notify(notification);

      // 3. Assertions to verify the expected result
      expect(workingSubscriber).toHaveBeenCalledTimes(1);
      expect(faultySubscriber).toHaveBeenCalledTimes(1);
      expect(anotherWorkingSubscriber).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('Subscriber callback error:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    test('should track read/unread status correctly', () => {
      // 1. Setting up the conditions
      const notification1 = { type: 'type1', message: 'Message 1' };
      const notification2 = { type: 'type2', message: 'Message 2' };
      const notification3 = { type: 'type3', message: 'Message 3' };

      // 2. Calling the function under test
      const result1 = NotificationManager.notify(notification1);
      const result2 = NotificationManager.notify(notification2);
      const result3 = NotificationManager.notify(notification3);

      // 3. Assertions to verify the expected result
      expect(NotificationManager.getUnreadCount()).toBe(3);

      // Mark one as read
      const marked = NotificationManager.markAsRead(result1.id);
      expect(marked).toBe(true);
      expect(NotificationManager.getUnreadCount()).toBe(2);

      // Try to mark non-existent notification
      const notMarked = NotificationManager.markAsRead('invalid-id');
      expect(notMarked).toBe(false);
      expect(NotificationManager.getUnreadCount()).toBe(2);
    });

    test('should validate notification input properly', () => {
      // Test invalid notification objects
      expect(() => NotificationManager.notify(null)).toThrow('Notification must be an object');
      expect(() => NotificationManager.notify('string')).toThrow('Notification must be an object');
      expect(() => NotificationManager.notify(123)).toThrow('Notification must be an object');

      // Test missing required fields
      expect(() => NotificationManager.notify({})).toThrow('Notification must have type and message');
      expect(() => NotificationManager.notify({ type: 'test' })).toThrow('Notification must have type and message');
      expect(() => NotificationManager.notify({ message: 'test' })).toThrow('Notification must have type and message');
    });

    test('should validate subscriber input properly', () => {
      // Test invalid callback functions
      expect(() => NotificationManager.subscribe(null)).toThrow('Callback must be a function');
      expect(() => NotificationManager.subscribe('string')).toThrow('Callback must be a function');
      expect(() => NotificationManager.subscribe(123)).toThrow('Callback must be a function');
    });
  });