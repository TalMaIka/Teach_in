import React, { useState, useRef } from 'react';
import { SafeAreaView, Button, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';
import TicketScreen from './screens/TicketScreen';
import TicketListScreen from './screens/TicketListScreen';
import AdminScreen from './screens/AdminScreen';
import LessonScreen from './screens/LessonScreen';
import StudentCalendarScreen from './screens/StudentCalendarScreen';
import TeacherLessonScreen from './screens/TeacherLessonScreen';
import { Image } from 'react-native';

export default function App() {
  const [screen, setScreen] = useState('login');
  const [studentId, setStudentId] = useState(null);
  const [teacherId, setTeacherId] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Banner state
  const [bannerMessage, setBannerMessage] = useState('');
  const [showBanner, setShowBanner] = useState(false);
  const bannerAnim = useRef(new Animated.Value(-80)).current;

  // Animated banner functions
  const showAnimatedBanner = (message) => {
    setBannerMessage(message);
    setShowBanner(true);
    Animated.timing(bannerAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(bannerAnim, {
          toValue: -80,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setShowBanner(false));
      }, 3500);
    });
  };

  // More informative notification
  const notifyStudentTodaysLessons = async (studentId) => {
    try {
      const res = await fetch(`http://10.0.2.2:3001/students/${studentId}/lessons`);
      if (res.ok) {
        const lessons = await res.json();
        const today = new Date().toISOString().split('T')[0];
        const todaysLessons = lessons.filter(l => l.date === today);
        if (todaysLessons.length > 0) {
          const now = new Date();
          const lessonMsgs = todaysLessons.map(l => {
            // l.time assumed format: "HH:MM"
            const [hour, min] = l.time.split(':').map(Number);
            const lessonDate = new Date(l.date + 'T' + l.time + ':00');
            const diffMs = lessonDate - now;
            let timeInfo = '';
            if (diffMs > 0) {
              const diffMin = Math.floor(diffMs / 60000);
              const hours = Math.floor(diffMin / 60);
              const mins = diffMin % 60;
              let timeStr = '';
              if (hours > 0) timeStr += `${hours}h `;
              timeStr += `${mins}m`;
              timeInfo = `starts in ${timeStr}`;
            } else {
              timeInfo = 'already started';
            }
            let details = `${l.title} at ${l.time} (${timeInfo})`;
            if (l.location) details += `\nLocation: ${l.location}`;
            if (l.teacher) details += `\nTeacher: ${l.teacher}`;
            return details;
          });
          showAnimatedBanner(lessonMsgs.join('\n\n'));
        }
      }
    } catch (e) {
      // Optionally handle error
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);

    if (user.role === 'student') {
      setStudentId(user.id);
      setScreen('calendar');
      setTimeout(() => notifyStudentTodaysLessons(user.id), 3000); // 3s delay
    } else if (user.role === 'teacher') {
      setTeacherId(user.id);
      setScreen('teacherLessons');
    } else if (user.role === 'admin') {
      setAdminId(user.id);
      setScreen('admin');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setStudentId(null);
    setTeacherId(null);
    setAdminId(null);
    setScreen('login');
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Animated Banner */}
      {showBanner && (
        <Animated.View
          style={[
            styles.banner,
            { transform: [{ translateY: bannerAnim }] }
          ]}
        >
          <Text style={styles.bannerText}>{bannerMessage}</Text>
        </Animated.View>
      )}

      <Image
        source={require('./logo.png')}
        style={{ width: '60%', alignSelf: 'center'}}
        resizeMode="contain"
      />

      {currentUser && (
        <View style={styles.userInfoContainer}>
          <Text style={styles.userInfo}>
            Logged in as: {currentUser.full_name} ({currentUser.role})
          </Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', padding: 20 }}>
        {!currentUser ? (
          <>
            <Button title="Register" onPress={() => setScreen('register')} />
            <Button title="Login" onPress={() => setScreen('login')} />
          </>
        ) : (
          <>
            {currentUser.role === 'student' && (
              <>
                <Button title="Open Ticket" onPress={() => setScreen('tickets')} disabled={!studentId} />
                <Button title="My Tickets" onPress={() => setScreen('ticketList')} disabled={!currentUser} />
                <Button title="Lesson Calendar" onPress={() => setScreen('calendar')} disabled={!studentId} />
              </>
            )}
            {currentUser.role === 'teacher' && (
              <>
                <Button title="My Lessons" onPress={() => setScreen('teacherLessons')} disabled={!teacherId} />
                <Button title="My Tickets" onPress={() => setScreen('ticketList')} disabled={!teacherId} />
                <Button title="Create Lesson" onPress={() => setScreen('lesson')} disabled={!teacherId} />
              </>
            )}
            {currentUser.role === 'admin' && (
              <Button title="Admin Panel" onPress={() => setScreen('admin')} disabled={!adminId} />
            )}
          </>
        )}
      </View>

      {screen === 'register' && <RegisterScreen />}
      {screen === 'login' && <LoginScreen onLoginSuccess={handleLoginSuccess} />}
      {screen === 'tickets' && studentId && <TicketScreen studentId={studentId} />}
      {screen === 'ticketList' && currentUser && (
        <TicketListScreen
          teacherId={teacherId}
          studentId={studentId}
          userRole={currentUser.role}
        />
      )}
      {screen === 'admin' && adminId && <AdminScreen adminId={adminId} />}
      {screen === 'lesson' && teacherId && <LessonScreen teacherId={teacherId} navigation={{ goBack: () => setScreen('ticketList') }} />}
      {screen === 'calendar' && studentId && <StudentCalendarScreen studentId={studentId} />}
      {screen === 'teacherLessons' && teacherId && <TeacherLessonScreen teacherId={teacherId} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#2d98da',
    paddingVertical: 18,
    paddingHorizontal: 20,
    zIndex: 100,
    elevation: 10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center'
  },
  bannerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center'
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  userInfo: {
    flex: 1,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
  }
});
