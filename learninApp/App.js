import React, { useState } from 'react';
import { SafeAreaView, Button, View, Text } from 'react-native';
import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';
import TicketScreen from './screens/TicketScreen';
import TicketListScreen from './screens/TicketListScreen';
import { Image } from 'react-native';

export default function App() {
  const [screen, setScreen] = useState('register');
  const [studentId, setStudentId] = useState(null);
  const [teacherId, setTeacherId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // 🟩 המשתמש הנוכחי

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);

    if (user.role === 'student') {
      setStudentId(user.id);
      setScreen('tickets');
    } else if (user.role === 'teacher') {
      setTeacherId(user.id);
      setScreen('ticketList');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
    <Image
          source={require('./logo.png')}
          style={{ width: '60%', alignSelf: 'center'}}
          resizeMode="contain"
        />
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 20 }}>
        <Button title="Register" onPress={() => setScreen('register')} />
        <Button title="Login" onPress={() => setScreen('login')} />
        <Button title="Open Ticket" onPress={() => setScreen('tickets')} disabled={!studentId} />
        <Button title="My Tickets" onPress={() => setScreen('ticketList')} disabled={!teacherId} />
      </View>

      {currentUser && (
        <Text style={{ textAlign: 'center', marginBottom: 10 }}>
          Logged in as: {currentUser.full_name} ({currentUser.role})
        </Text>
      )}

      {screen === 'register' && <RegisterScreen />}
      {screen === 'login' && <LoginScreen onLoginSuccess={handleLoginSuccess} />}
      {screen === 'tickets' && studentId && <TicketScreen studentId={studentId} />}
      {screen === 'ticketList' && teacherId && <TicketListScreen teacherId={teacherId} />}
    </SafeAreaView>
  );
}
