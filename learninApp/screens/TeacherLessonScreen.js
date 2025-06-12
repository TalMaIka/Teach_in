import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Modal, TouchableOpacity, Button, ScrollView, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';

export default function TeacherLessonScreen({ teacherId }) {
  const [lessons, setLessons] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonStudents, setLessonStudents] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    fetchTeacherLessons();
  }, []);

  const fetchTeacherLessons = async () => {
    try {
      const res = await fetch(`http://10.0.2.2:3001/lessons`);
      if (res.ok) {
        const data = await res.json();
        const teacherLessons = data.filter(l => l.teacher_id === teacherId);
        setLessons(teacherLessons);

        // Mark lesson dates
        const marks = {};
        teacherLessons.forEach(l => { marks[l.date] = { marked: true }; });
        setMarkedDates(marks);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not load lessons');
    }
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

  const lessonsForDate = selectedDate
    ? lessons.filter(l => l.date === selectedDate)
    : lessons;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
      <Text style={styles.title}>My Created Lessons</Text>
      <Calendar
        markedDates={{
          ...markedDates,
          ...(selectedDate ? { [selectedDate]: { selected: true, marked: true } } : {})
        }}
        onDayPress={day => setSelectedDate(day.dateString)}
        style={{ marginBottom: 20 }}
      />
      {selectedDate ? (
        <>
          <Text style={styles.subtitle}>Lessons on {selectedDate}:</Text>
          <FlatList
            data={lessonsForDate}
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
            ListEmptyComponent={<Text>No lessons on this day.</Text>}
            scrollEnabled={false}
          />
        </>
      ) : (
        <FlatList
          data={lessons}
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
          ListEmptyComponent={<Text>No lessons created yet.</Text>}
          scrollEnabled={false}
        />
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