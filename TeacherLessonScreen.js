import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

/** Theme (assorti au reste de l'app) */
const theme = {
  colors: {
    bg: '#0F172A',
    card: '#111827',
    surface: '#0B1220',
    text: '#F3F4F6',
    textMuted: '#9CA3AF',
    primary: '#2563EB',
    success: '#16A34A',
    border: '#1F2937',
  },
  radius: 16,
  gap: 16,
};

function Pill({ label }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillTxt}>{label}</Text>
    </View>
  );
}

function Card({ children, style }) { return <View style={[styles.card, style]}>{children}</View>; }

export default function TeacherLessonScreen({ teacherId }) {
  const [lessons, setLessons] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonStudents, setLessonStudents] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const init = useCallback(async () => {
    try {
      setLoading(true);
      await fetchTeacherLessons();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { init(); }, [init]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchTeacherLessons();
    } finally {
      setRefreshing(false);
    }
  };

  const fetchTeacherLessons = async () => {
    try {
      const res = await fetch('http://10.0.2.2:3001/lessons');
      if (res.ok) {
        const data = await res.json();
        const teacherLessons = (Array.isArray(data) ? data : []).filter((l) => l.teacher_id === teacherId);
        setLessons(teacherLessons);
        const marks = {};
        teacherLessons.forEach((l) => { if (l.date) marks[l.date] = { marked: true, dotColor: '#60A5FA' }; });
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
        setLessonStudents(Array.isArray(data) ? data : []);
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

  // >>> CHANGEMENT ICI: ne plus retourner tous les cours si aucune date n'est sélectionnée
  const lessonsForDate = useMemo(
    () => (selectedDate ? lessons.filter((l) => l.date === selectedDate) : []),
    [selectedDate, lessons]
  );

  const counts = useMemo(() => ({
    total: lessons.length,
    days: Object.keys(markedDates).length,
  }), [lessons, markedDates]);

  if (loading) {
    return (
      <View style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.textMuted, marginTop: 12 }}>Chargement de vos cours…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={{ padding: theme.gap }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      <Text style={styles.title}>My Created Lessons</Text>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.statText}>Total: <Text style={styles.statValue}>{counts.total}</Text></Text>
          <Text style={styles.statText}>Days: <Text style={styles.statValue}>{counts.days}</Text></Text>
        </View>
        <Calendar
          markedDates={{
            ...markedDates,
            ...(selectedDate ? { [selectedDate]: { selected: true, marked: !!markedDates[selectedDate], selectedColor: '#2563EB' } } : {}),
          }}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          style={{ marginTop: 8 }}
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            dayTextColor: '#F3F4F6',
            monthTextColor: '#F3F4F6',
            textDisabledColor: '#4B5563',
            arrowColor: '#60A5FA',
          }}
        />
      </Card>

      {/* >>> CHANGEMENT ICI: n'afficher que si une date est choisie, sinon un hint */}
      {!selectedDate ? (
        <Text style={[styles.empty, { marginTop: 4 }]}>
          Select a date to view lessons.
        </Text>
      ) : (
        <>
          <Text style={styles.subtitle}>Lessons on {selectedDate}:</Text>
          <FlatList
            data={lessonsForDate}
            keyExtractor={(l) => String(l.id)}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => openLessonModal(item)} activeOpacity={0.85}>
                <View style={styles.lessonBox}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.lessonTitle}>{item.title}</Text>
                    <Pill label={item.time} />
                  </View>
                  {!!item.description && (
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.lessonDesc}>{item.description}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No lessons on this day.</Text>}
            scrollEnabled={false}
          />
        </>
      )}

      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={closeLessonModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedLesson && (
              <>
                <Text style={styles.modalTitle}>{selectedLesson.title}</Text>
                <Text style={styles.modalMeta}>Date: {selectedLesson.date}</Text>
                <Text style={styles.modalMeta}>Time: {selectedLesson.time}</Text>
                {!!selectedLesson.description && <Text style={[styles.modalMeta, { marginTop: 6 }]}>{selectedLesson.description}</Text>}

                <Text style={[styles.modalMeta, { marginTop: 12, fontWeight: '700' }]}>Signed Up Students:</Text>
                <FlatList
                  data={lessonStudents}
                  keyExtractor={(s) => String(s.id)}
                  renderItem={({ item }) => (
                    <Text style={styles.modalMeta}>• {item.full_name} ({item.email})</Text>
                  )}
                  ListEmptyComponent={<Text style={styles.modalMeta}>No students signed up yet.</Text>}
                />

                <TouchableOpacity onPress={closeLessonModal} style={[styles.closeBtn]} activeOpacity={0.85}>
                  <Text style={styles.closeTxt}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  subtitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  empty: { color: theme.colors.textMuted, paddingVertical: 8 },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 8,
    marginBottom: theme.gap,
  },
  lessonBox: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 10,
  },
  lessonTitle: { color: theme.colors.text, fontWeight: '700', fontSize: 16 },
  lessonDesc: { color: theme.colors.textMuted, marginTop: 6 },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pillTxt: { color: theme.colors.text, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.gap,
    width: '94%',
    maxHeight: '80%',
  },
  modalTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  modalMeta: { color: theme.colors.textMuted, marginTop: 2 },
  closeBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  closeTxt: { color: theme.colors.text, fontWeight: '700' },
  statText: { color: theme.colors.textMuted },
  statValue: { color: theme.colors.text, fontWeight: '800' },
});
