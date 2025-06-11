import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert, FlatList, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import * as AddCalendarEvent from 'react-native-add-calendar-event';

export default function StudentCalendarScreen({ studentId }) {
  const [lessons, setLessons] = useState([]);
  const [signedUpLessons, setSignedUpLessons] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonStudents, setLessonStudents] = useState([]);

  useEffect(() => {
    fetchLessons();
    fetchSignedUpLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const res = await fetch('http://10.0.2.2:3001/lessons');
      if (res.ok) {
        const data = await res.json();
        setLessons(data);
        const marks = {};
        data.forEach(l => { marks[l.date] = { marked: true }; });
        setMarkedDates(marks);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not load lessons');
    }
  };

  const fetchSignedUpLessons = async () => {
    try {
      const res = await fetch(`http://10.0.2.2:3001/students/${studentId}/lessons`);
      if (res.ok) {
        const data = await res.json();
        setSignedUpLessons(data);
      }
    } catch (e) {}
  };

  const fetchLessonStudents = async (lessonId) => {
    try {
      const res = await fetch(`http://10.0.2.2:3001/lessons/${lessonId}/students`);
      if (res.ok) {
        const data = await res.json();
        setLessonStudents(data);
      } else {
        setLessonStudents([]);
      }
    } catch (e) {
      setLessonStudents([]);
    }
  };

  const openLessonModal = async (lesson) => {
    setSelectedLesson(lesson);
    await fetchLessonStudents(lesson.id);
    setModalVisible(true);
  };

  const closeLessonModal = () => {
    setModalVisible(false);
    setSelectedLesson(null);
    setLessonStudents([]);
  };

  const signUp = async (lessonId) => {
    try {
      const res = await fetch(`http://10.0.2.2:3001/lessons/${lessonId}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId }),
      });
      if (res.ok) {
        Alert.alert('Signed up!', 'You have signed up for this lesson.');
        fetchSignedUpLessons();
      } else {
        Alert.alert('Error', 'Could not sign up.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    }
  };

  // --- Unsign functionality ---
  const unsign = async (lessonId) => {
    try {
      const res = await fetch(`http://10.0.2.2:3001/lessons/${lessonId}/unsign`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId }),
      });
      if (res.ok) {
        Alert.alert('Unregistered', 'You have been removed from this lesson.');
        fetchSignedUpLessons();
        closeLessonModal();
      } else {
        Alert.alert('Error', 'Could not unsign.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    }
  };

  // --- Add to Calendar functionality ---
  const addToCalendar = (lesson) => {
    const startDate = new Date(`${lesson.date}T${lesson.time}:00`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
    const eventConfig = {
      title: lesson.title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      notes: lesson.description,
      location: lesson.location || '',
    };
    AddCalendarEvent.presentEventCreatingDialog(eventConfig)
      .then(eventInfo => {
        // Optionally handle eventInfo
      })
      .catch(error => {
        // Optionally handle error
      });
  };

  const lessonsForDate = lessons.filter(l => l.date === selectedDate);

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
      <Text style={styles.title}>My Signed Up Lessons</Text>
      <FlatList
        data={signedUpLessons}
        keyExtractor={l => l.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openLessonModal(item)}>
            <View style={styles.lessonBox}>
              <Text style={styles.lessonTitle}>{item.title}</Text>
              <Text>{item.date} {item.time}</Text>
              <Text numberOfLines={1} ellipsizeMode="tail">{item.description}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>No signed up lessons yet.</Text>}
        style={{ marginBottom: 20 }}
        scrollEnabled={false}
      />
      <Text style={styles.title}>Lesson Calendar</Text>
      <Calendar
        markedDates={{
          ...markedDates,
          ...(selectedDate ? { [selectedDate]: { selected: true, marked: true } } : {})
        }}
        onDayPress={day => setSelectedDate(day.dateString)}
      />
      {selectedDate && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.subtitle}>Lessons on {selectedDate}:</Text>
          <FlatList
            data={lessonsForDate}
            keyExtractor={l => l.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.lessonBox}>
                <Text style={styles.lessonTitle}>{item.title}</Text>
                <Text>{item.time} - {item.description}</Text>
                <Button title="Sign Up" onPress={() => signUp(item.id)} />
              </View>
            )}
            ListEmptyComponent={<Text>No lessons on this day.</Text>}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Modal for lesson details */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeLessonModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedLesson && (
              <>
                <Text style={styles.modalTitle}>{selectedLesson.title}</Text>
                <Text>Date: {selectedLesson.date}</Text>
                <Text>Time: {selectedLesson.time}</Text>
                <Text>Teacher: {selectedLesson.teacher_name}</Text>
                <Text>Description: {selectedLesson.description}</Text>
                <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Signed Up Students:</Text>
                <FlatList
                  data={lessonStudents}
                  keyExtractor={s => s.id.toString()}
                  renderItem={({ item }) => (
                    <Text>- {item.full_name} ({item.email})</Text>
                  )}
                  ListEmptyComponent={<Text>No students signed up yet.</Text>}
                />
                {/* Show Unsign and Add to Calendar buttons if student is signed up for this lesson */}
                {signedUpLessons.some(l => l.id === selectedLesson?.id) && (
                  <>
                    <Button
                      title="Unsign"
                      color="#e74c3c"
                      onPress={() => unsign(selectedLesson.id)}
                    />
                    <View style={{ height: 10 }} />
                    <Button
                      title="Add to Calendar"
                      color="#27ae60"
                      onPress={() => addToCalendar(selectedLesson)}
                    />
                  </>
                )}
                <Button title="Close" onPress={closeLessonModal} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  lessonBox: { backgroundColor: '#f8f8f8', padding: 12, borderRadius: 8, marginBottom: 10 },
  lessonTitle: { fontWeight: 'bold', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10
  }
});