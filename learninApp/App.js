import React, { useState } from 'react';
import { SafeAreaView, Button, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';
import TicketScreen from './screens/TicketScreen';
import TicketListScreen from './screens/TicketListScreen';
import AdminScreen from './screens/AdminScreen';
import { Image } from 'react-native';

export default function App() {
  const [screen, setScreen] = useState('login');
  const [studentId, setStudentId] = useState(null);
  const [teacherId, setTeacherId] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);

    if (user.role === 'student') {
      setStudentId(user.id);
      setScreen('tickets');
    } else if (user.role === 'teacher') {
      setTeacherId(user.id);
      setScreen('ticketList');
    } else if (user.role === 'admin') {
      setAdminId(user.id);
      setScreen('admin');
    }
  };

  const handleLogout = () => {
    // Reset all user states
    setCurrentUser(null);
    setStudentId(null);
    setTeacherId(null);
    setAdminId(null);
    setScreen('login');
  };



  return (
    <SafeAreaView style={{ flex: 1 }}>
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

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 20 }}>
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
              </>
            )}
            {currentUser.role === 'teacher' && (
             <>
              <Button title="My Tickets" onPress={() => setScreen('ticketList')} disabled={!teacherId} />
              <Button title="Register" onPress={() => setScreen('register')} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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