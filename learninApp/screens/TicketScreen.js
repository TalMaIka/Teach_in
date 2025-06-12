import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

export default function TicketScreen({ studentId }) {
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await fetch('http://10.0.2.2:3001/teachers');
        const data = await res.json();
        setTeachers(data);
      } catch (err) {
        Alert.alert('Error', 'Could not load teachers');
      }
    };
    fetchTeachers();
  }, []);

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (!response.didCancel && !response.errorCode && response.assets && response.assets.length > 0) {
        setAttachment(response.assets[0]);
      }
    });
  };

  const takePhoto = () => {
    launchCamera({ mediaType: 'photo' }, (response) => {
      if (!response.didCancel && !response.errorCode && response.assets && response.assets.length > 0) {
        setAttachment(response.assets[0]);
      }
    });
  };

  const sendTicket = async () => {
    if (!teacherId || !subject || !message) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    const formData = new FormData();
    formData.append('student_id', studentId);
    formData.append('teacher_id', teacherId);
    formData.append('subject', subject);
    formData.append('message', message);
    if (attachment) {
      formData.append('attachment', {
        uri: attachment.uri,
        type: attachment.type,
        name: attachment.fileName || 'photo.jpg',
      });
    }

    try {
      const res = await fetch('http://10.0.2.2:3001/tickets', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.ok) {
        Alert.alert('Success', 'Ticket sent!');
        setTeacherId('');
        setSubject('');
        setMessage('');
        setAttachment(null);
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

      <View style={{ flexDirection: 'row', marginBottom: 15 }}>
        <Button title="Pick Image" onPress={pickImage} />
        <View style={{ width: 10 }} />
        <Button title="Take Photo" onPress={takePhoto} />
      </View>
      {attachment && (
        <Image
          source={{ uri: attachment.uri }}
          style={{ width: 100, height: 100, marginBottom: 15, borderRadius: 8 }}
        />
      )}

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