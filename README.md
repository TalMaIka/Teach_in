
<p align="center"><img src="https://i.ibb.co/KxGTLxnw/logo-1.png" alt="Site-Scanner icon" height="100"/></p>
<p align="center">

A comprehensive learning management system built with React Native and Node.js, featuring role-based access control for students, teachers, and administrators.

## Features ✨

### 🎓 Student Features
- **User Authentication** - Secure login and registration
- **Lesson Calendar** - View and sign up for available lessons
- **Support Tickets** - Create and track support requests with file attachments
- **Grade Tracking** - View grades with class statistics and rankings
- **Smart Notifications** - Get notified about today's lessons with timing information

### 👨‍🏫 Teacher Features
- **Lesson Management** - Create and manage lessons
- **Student Attendance** - Mark and track student attendance
- **Grade Management** - Assign grades and comments to students
- **Ticket Support** - Respond to student support requests
- **Analytics** - View grading statistics and performance metrics

### 🔧 Admin Features
- **User Management** - Register new users and manage existing accounts
- **System Oversight** - View all tickets and user activities
- **Data Management** - Delete users and associated data
- **Attendance Monitoring** - Track attendance across all lessons

## Tech Stack 🛠️

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database with connection pooling
- **bcryptjs** for password hashing
- **Multer** for file upload handling
- **CORS** enabled for cross-origin requests

### Mobile App
- **React Native** for cross-platform mobile development
- **Modern UI Design** with dark theme and animated components
- **Role-based Navigation** with dynamic action buttons
- **Real-time Notifications** with animated banners

## Installation & Setup 🚀

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- React Native development environment
- Android Studio / Xcode for mobile development

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Learninig_backend
   ```

2. **Install dependencies**
   ```bash
   npm install express body-parser cors pg bcryptjs multer
   ```

3. **Database Configuration**
   - Update the PostgreSQL connection details in `server.js`
   - Create the required tables (see Database Schema below)

4. **Start the backend server**
   ```bash
   node server.js
   ```
   Server will run on `http://localhost:3001`

### Mobile App Setup

1. **Navigate to the app directory**
   ```bash
   cd learninApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **For Android development**
   ```bash
   npx react-native run-android
   ```

4. **For iOS development**
   ```bash
   npx react-native run-ios
   ```

## Database Schema 📊

The system uses PostgreSQL with the following core tables:

- **Users** - Stores user accounts with roles (student, teacher, admin)
- **Lessons** - Contains lesson information with teacher assignments
- **Tickets** - Support ticket system with file attachment support
- **Lesson Signups** - Tracks student enrollment and attendance status
- **Grades** - Manages student grades with teacher comments

All tables include proper foreign key relationships and constraints to maintain data integrity.

## API Endpoints 🌐

### Authentication
- `POST /register` - Register new user
- `POST /login` - User login

### Tickets
- `POST /tickets` - Create support ticket (with file upload)
- `GET /tickets/teacher/:teacherId` - Get tickets for teacher
- `GET /tickets/student/:studentId` - Get tickets for student
- `PUT /tickets/:ticketId/reply` - Reply to ticket

### Lessons
- `POST /lessons` - Create new lesson
- `GET /lessons` - Get all lessons
- `POST /lessons/:lessonId/signup` - Sign up for lesson
- `DELETE /lessons/:lessonId/unsign` - Unregister from lesson
- `GET /lessons/:lessonId/students` - Get lesson participants

### Attendance
- `GET /attendance` - Get attendance records
- `POST /attendance/mark` - Mark student attendance

### Grades
- `POST /grades` - Create/update grade
- `GET /students/:studentId/grades` - Get student grades
- `GET /lessons/:lessonId/grades` - Get lesson grades
- `GET /lessons/:lessonId/grade-stats` - Get grade statistics

### Admin
- `GET /admin/users` - Get all users
- `GET /admin/tickets` - Get all tickets
- `DELETE /admin/users/:userId` - Delete user

## User Roles & Permissions 👥

### Student
- ✅ Create and view support tickets
- ✅ Sign up for lessons
- ✅ View personal grades and statistics
- ✅ View lesson calendar
- ❌ Create lessons
- ❌ Grade other students

### Teacher
- ✅ Create and manage lessons
- ✅ View and respond to assigned tickets
- ✅ Mark student attendance
- ✅ Grade students
- ✅ View teaching statistics
- ❌ Delete users
- ❌ Access admin panel

### Admin
- ✅ Full system access
- ✅ User management
- ✅ View all tickets and activities
- ✅ Register new users
- ✅ Delete users and associated data

## Security Features 🔒

- **Password Hashing** - bcrypt with salt rounds
- **Role-based Access Control** - Endpoint protection by user role
- **SSL Database Connection** - Encrypted database communication
- **Input Validation** - Server-side validation for all endpoints
- **File Upload Security** - Secure file handling with Multer

## Mobile App Features 📱

- **Dark Theme UI** - Modern, elegant design
- **Animated Components** - Smooth transitions and notifications
- **Role-based Navigation** - Dynamic interface based on user role
- **Smart Notifications** - Today's lesson reminders with timing
- **File Upload Support** - Attachment handling for support tickets
