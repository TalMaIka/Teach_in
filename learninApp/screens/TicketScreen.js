import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // 🟩 Ajoute la dépendance si besoin : npm install @react-native-picker/picker

export default function TicketScreen({ studentId }) {
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        console.log('Fetching teachers...');
        const res = await fetch('http://10.0.2.2:3001/teachers');
        const data = await res.json();
        setTeachers(data);
      } catch (err) {
        Alert.alert('Error', 'Could not load teachers');
      }
    };

    fetchTeachers();
  }, []);

  const sendTicket = async () => {
    if (!teacherId || !subject || !message) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    try {
      const res = await fetch('http://10.0.2.2:3001/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          teacher_id: teacherId,
          subject,
          message,
        }),
      });

      if (res.ok) {
        Alert.alert('Success', 'Ticket sent!');
        setTeacherId('');
        setSubject('');
        setMessage('');
      } else {
        const errorText = await res.text();
        Alert.alert('Error', errorText);
      }
    } catch (err) {
      Alert.alert('Network error', 'Please try again later.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Send a Ticket</Text>

      <Text>Teacher:</Text>
      <Picker
        selectedValue={teacherId}
        onValueChange={(itemValue) => setTeacherId(itemValue)}
        style={styles.input}
      >
        <Picker.Item label="Select a teacher" value="" />
        {teachers.map((teacher) => (
          <Picker.Item key={teacher.id} label={teacher.full_name} value={teacher.id} />
        ))}
      </Picker>

      <Text>Subject:</Text>
      <TextInput
        style={styles.input}
        value={subject}
        onChangeText={setSubject}
      />

      <Text>Message:</Text>
      <TextInput
        style={styles.textArea}
        value={message}
        onChangeText={setMessage}
        multiline
      />

      <Button title="Send Ticket" onPress={sendTicket} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 15 },
  textArea: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, height: 100, marginBottom: 15 },
});
