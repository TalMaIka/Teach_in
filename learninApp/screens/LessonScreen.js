import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function LessonScreen({ teacherId, navigation }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const iso = selectedDate.toISOString().split('T')[0];
      setDate(iso);
    }
  };

  const createLesson = async () => {
    if (!title || !date || !time) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    try {
      const res = await fetch('http://10.0.2.2:3001/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, time, description, teacher_id: teacherId }),
      });
      if (res.ok) {
        Alert.alert('Success', 'Lesson created!');
        setTitle(''); setDate(''); setTime(''); setDescription('');
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to create lesson');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Lesson</Text>
      <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />

      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
        <Text style={{ color: date ? '#000' : '#888' }}>
          {date ? date : 'Select Date'}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date ? new Date(date) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}

      <TextInput placeholder="Time (HH:MM)" value={time} onChangeText={setTime} style={styles.input} />
      <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={styles.input} multiline />
      <Button title="Create Lesson" onPress={createLesson} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 12 },
});