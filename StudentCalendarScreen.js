import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  FlatList,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import * as AddCalendarEvent from 'react-native-add-calendar-event';

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
    danger: '#DC2626',
    border: '#1F2937',
  },
  radius: 16,
  gap: 16,
};

function Pill({ label, tone = 'default' }) {
  const map = {
    default: { bg: theme.colors.surface, color: theme.colors.text },
    success: { bg: 'rgba(22,163,74,0.15)', color: theme.colors.success },
    warn: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    muted: { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8' },
    info: { bg: 'rgba(37,99,235,0.15)', color: '#60A5FA' },
  };
  const { bg, color } = map[tone] || map.default;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillTxt, { color }]}>{label}</Text>
    </View>
  );
}

function PrimaryButton({ title, onPress, disabled, tone = 'primary' }) {
  const bg =
    tone === 'danger'
      ? theme.colors.danger
      : tone === 'success'
        ? theme.colors.success
        : theme.colors.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.primaryBtn, { backgroundColor: bg }, disabled && { opacity: 0.6 }]}
    >
      <Text style={styles.primaryBtnText}>{title}</Text>
    </TouchableOpacity>
  );
}

// === Helper: past lesson check (client-side UX) ===
function isLessonPast(dateStr, timeStr) {
  if (!dateStr) return false;
  const iso = `${dateStr}T${(timeStr || '00:00')}:00`;
  const lessonTs = new Date(iso).getTime();
  const nowTs = Date.now();
  return Number.isFinite(lessonTs) && lessonTs < nowTs;
}

export default function StudentCalendarScreen({ studentId }) {
  const [lessons, setLessons] = useState([]);
  const [signedUpLessons, setSignedUpLessons] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonStudents, setLessonStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const init = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchLessons(), fetchSignedUpLessons()]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([fetchLessons(), fetchSignedUpLessons()]);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchLessons = async () => {
    try {
      const res = await fetch('http://10.0.2.2:3001/lessons');
      if (res.ok) {
        const data = await res.json();
        setLessons(Array.isArray(data) ? data : []);
        const marks = {};
        (Array.isArray(data) ? data : []).forEach((l) => {
          if (l?.date) marks[l.date] = { marked: true, dotColor: '#60A5FA' };
        });
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
        setSignedUpLessons(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      // silencieux
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
    setBusyAction(false);
  };

  const signUp = async (lesson) => {
    // Client-side guard
    if (isLessonPast(lesson.date, lesson.time)) {
      Alert.alert('Unavailable', 'You cannot sign up for a past lesson.');
      return;
    }
    try {
      setBusyAction(true);
      const res = await fetch(`http://10.0.2.2:3001/lessons/${lesson.id}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId }),
      });
      if (res.ok) {
        await fetchSignedUpLessons();
        Alert.alert('Signed up!', 'You have signed up for this lesson.');
      } else {
        const msg = await res.text();
        Alert.alert('Error', msg || 'Could not sign up.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setBusyAction(false);
    }
  };

  const unsign = async (lessonId) => {
    try {
      setBusyAction(true);
      const res = await fetch(`http://10.0.2.2:3001/lessons/${lessonId}/unsign`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId }),
      });
      if (res.ok) {
        await fetchSignedUpLessons();
        Alert.alert('Unregistered', 'You have been removed from this lesson.');
        closeLessonModal();
      } else {
        const msg = await res.text();
        Alert.alert('Error', msg || 'Could not unsign.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setBusyAction(false);
    }
  };

  const addToCalendar = (lesson) => {
    const startDate = new Date(`${lesson.date}T${lesson.time}:00`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const eventConfig = {
      title: lesson.title,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      notes: lesson.description,
      location: lesson.location || '',
    };
    AddCalendarEvent.presentEventCreatingDialog(eventConfig).catch(() => {});
  };

  const lessonsForDate = useMemo(
    () => lessons.filter((l) => l.date === selectedDate),
    [lessons, selectedDate]
  );
  const isSigned = useCallback(
    (id) => signedUpLessons.some((l) => l.id === id),
    [signedUpLessons]
  );

  if (loading) {
    return (
      <View style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.textMuted, marginTop: 12 }}>Chargement du calendrier…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={{ padding: theme.gap }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      <Text style={styles.title}>My Signed Up Lessons</Text>
      <FlatList
        data={signedUpLessons}
        keyExtractor={(l) => String(l.id)}
        renderItem={({ item }) => {
          const past = isLessonPast(item.date, item.time);
          return (
            <TouchableOpacity onPress={() => openLessonModal(item)} activeOpacity={0.85}>
              <View style={styles.lessonBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.lessonTitle}>{item.title}</Text>
                  <View style={{ flexDirection:'row', gap:6 }}>
                    <Pill label="Signed" tone="success" />
                    <Pill label={past ? 'Past' : 'Upcoming'} tone={past ? 'muted' : 'info'} />
                  </View>
                </View>
                <Text style={styles.lessonMeta}>{item.date} {item.time}</Text>
                {!!item.description && (
                  <Text numberOfLines={1} ellipsizeMode="tail" style={styles.lessonDesc}>
                    {item.description}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No signed up lessons yet.</Text>}
        style={{ marginBottom: 20 }}
        scrollEnabled={false}
      />

      <Text style={styles.title}>Lesson Calendar</Text>
      <View style={styles.card}>
        <Calendar
          markedDates={{
            ...markedDates,
            ...(selectedDate
              ? {
                [selectedDate]: {
                  selected: true,
                  marked: !!markedDates[selectedDate],
                  selectedColor: '#2563EB',
                },
              }
              : {}),
          }}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            dayTextColor: '#F3F4F6',
            monthTextColor: '#F3F4F6',
            textDisabledColor: '#4B5563',
            arrowColor: '#60A5FA',
          }}
        />
      </View>

      {selectedDate && (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.subtitle}>Lessons on {selectedDate}:</Text>
          <FlatList
            data={lessonsForDate}
            keyExtractor={(l) => String(l.id)}
            renderItem={({ item }) => {
              const past = isLessonPast(item.date, item.time);
              const signed = isSigned(item.id);
              return (
                <View style={styles.lessonBox}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                    <Text style={styles.lessonTitle}>{item.title}</Text>
                    <Pill label={past ? 'Past' : 'Upcoming'} tone={past ? 'muted' : 'info'} />
                  </View>
                  <Text style={styles.lessonMeta}>{item.time}</Text>
                  {!!item.description && <Text style={styles.lessonDesc}>{item.description}</Text>}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    {!past && (
                      <PrimaryButton
                        title={signed ? 'Signed' : 'Sign Up'}
                        onPress={() => signUp(item)}
                        disabled={signed || busyAction}
                        tone={signed ? 'success' : 'primary'}
                      />
                    )}
                    <PrimaryButton
                      title="Details"
                      onPress={() => openLessonModal(item)}
                      disabled={busyAction}
                    />
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>No lessons on this day.</Text>}
            scrollEnabled={false}
          />
        </View>
      )}

      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={closeLessonModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedLesson && (
              <>
                <Text style={styles.modalTitle}>{selectedLesson.title}</Text>
                <Text style={styles.modalMeta}>Date: {selectedLesson.date}</Text>
                <Text style={styles.modalMeta}>Time: {selectedLesson.time}</Text>
                {!!selectedLesson.teacher_name && (
                  <Text style={styles.modalMeta}>Teacher: {selectedLesson.teacher_name}</Text>
                )}
                {!!selectedLesson.description && (
                  <Text style={[styles.modalMeta, { marginTop: 6 }]}>
                    {selectedLesson.description}
                  </Text>
                )}

                <Text style={[styles.modalMeta, { marginTop: 12, fontWeight: '700' }]}>
                  Signed Up Students:
                </Text>
                <FlatList
                  data={lessonStudents}
                  keyExtractor={(s) => String(s.id)}
                  renderItem={({ item }) => (
                    <Text style={styles.modalMeta}>• {item.full_name} ({item.email})</Text>
                  )}
                  ListEmptyComponent={<Text style={styles.modalMeta}>No students signed up yet.</Text>}
                />

                {/* Actions (on laisse l’unsign possible même si le cours est passé — adapte si tu veux le bloquer aussi) */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  {isSigned(selectedLesson.id) && (
                    <PrimaryButton
                      title="Unsign"
                      onPress={() => unsign(selectedLesson.id)}
                      tone="danger"
                    />
                  )}
                  <PrimaryButton
                    title="Add to Calendar"
                    onPress={() => addToCalendar(selectedLesson)}
                    tone="success"
                  />
                </View>

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
  lessonMeta: { color: theme.colors.textMuted, marginTop: 4 },
  lessonDesc: { color: theme.colors.text, marginTop: 6 },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillTxt: { fontSize: 12 },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
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
});
