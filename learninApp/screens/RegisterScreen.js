import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleRegister = async () => {
    setLoading(true);
    setStatusMessage('Connecting to server...');
    try {
      const res = await fetch('http://10.0.2.2:3001/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          role,
        }),
      });
      if (res.ok) {
        setStatusMessage('Connected. Registration successful.');
        Alert.alert('Success', 'Registration successful');
        setFullName('');
        setEmail('');
        setPassword('');
        setRole('student');
      } else {
        const errorText = await res.text();
        setStatusMessage('Connected. Server returned error.');
        Alert.alert('Error', errorText);
      }
    } catch (err) {
      setStatusMessage('Connection failed. Please try again.');
      Alert.alert('Error', 'Network error, try again later');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>

      <Text>Full Name</Text>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

      <Text>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

      <Text>Password</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry={true} />

      <Text>Role</Text>
      <Picker selectedValue={role} onValueChange={setRole} style={styles.picker}>
        <Picker.Item label="Student" value="student" />
        <Picker.Item label="Teacher" value="teacher" />
        <Picker.Item label="Admin" value="admin" />
      </Picker>

      <Button title={loading ? 'Registering...' : 'Register'} onPress={handleRegister} disabled={loading} />

      {loading && <ActivityIndicator style={{ marginTop: 10 }} size="small" color="#0000ff" />}
      {statusMessage !== '' && <Text style={styles.status}>{statusMessage}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 28, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 15 },
  picker: { marginBottom: 20 },
  status: { marginTop: 10, textAlign: 'center', color: '#555' }
});
