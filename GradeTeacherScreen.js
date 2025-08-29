import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator,
  Alert, FlatList, Modal, KeyboardAvoidingView, Platform, RefreshControl, ScrollView
} from 'react-native';
import { Calendar } from 'react-native-calendars';

const theme = {
  colors: {
    bg:'#0F172A',
    card:'#111827',
    surface:'#0B1220',
    text:'#F3F4F6',
    textMuted:'#9CA3AF',
    primary:'#2563EB',
    border:'#1F2937',
    success:'#16A34A',
    danger:'#DC2626'
  },
  radius:16,
  gap:16
};

function Select({ label, value, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.select}>
      <Text style={styles.selectLabel}>{label}</Text>
      <Text style={[styles.selectValue, { color: value ? theme.colors.text : theme.colors.textMuted }]} numberOfLines={1}>
        {value || 'Select…'}
      </Text>
    </TouchableOpacity>
  );
}

function StatPill({ label, value }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

export default function GradeTeacherScreen({ teacherId }) {
  const baseURL = 'http://10.0.2.2:3001';

  const [tab, setTab] = useState('grade');

  // Data
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);

  // Form (Grade)
  const [lesson, setLesson] = useState(null);
  const [student, setStudent] = useState(null);
  const [grade, setGrade] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  // Modals (Grade)
  const [openCalendar, setOpenCalendar] = useState(false);
  const [openStudents, setOpenStudents] = useState(false);

  // Enrolled
  const [enrolled, setEnrolled] = useState([]);

  // Summary (calendar-first)
  const [sumOpenCalendar, setSumOpenCalendar] = useState(false);
  const [sumSelectedDate, setSumSelectedDate] = useState(null);
  const [sumLesson, setSumLesson] = useState(null);
  const [sumLoading, setSumLoading] = useState(false);
  const [sumRefreshing, setSumRefreshing] = useState(false);
  const [sumItems, setSumItems] = useState([]);

  // ==== Guard: teacherId required ====
  const teacherIdNum = Number(teacherId);
  const teacherIdReady = Number.isFinite(teacherIdNum) && teacherIdNum > 0;

  // Initial data (needs teacherId)
  useEffect(() => {
    if (!teacherIdReady) { setLoading(false); return; }
    (async () => {
      try {
        setLoading(true);
        const [L, S] = await Promise.all([
          fetch(`${baseURL}/teachers/${teacherIdNum}/lessons`),
          fetch(`${baseURL}/teachers/${teacherIdNum}/students`)
        ]);
        const ljs = await L.json().catch(()=>[]);
        const sjs = await S.json().catch(()=>[]);
        setLessons(Array.isArray(ljs) ? ljs : []);
        setStudents(Array.isArray(sjs) ? sjs : []);
      } catch {
        Alert.alert('Error', 'Failed to load teacher data');
      } finally {
        setLoading(false);
      }
    })();
  }, [teacherIdReady, teacherIdNum]);

  // Grade: load enrolled when lesson changes
  useEffect(() => {
    (async () => {
      if (!lesson) { setEnrolled([]); setStudent(null); return; }
      try {
        const res = await fetch(`${baseURL}/lessons/${lesson.id}/students`);
        const js = await res.json().catch(()=>[]);
        setEnrolled(Array.isArray(js) ? js : []);
        setStudent(null);
      } catch {
        setEnrolled([]);
      }
    })();
  }, [lesson]);

  // Submit grade (needs teacherId)
  const submit = async () => {
    if (!teacherIdReady) {
      return Alert.alert('Config', 'Missing teacherId. Please log in as a teacher.');
    }
    const n = Number(grade);
    if (!lesson || !student) return Alert.alert('Missing data', 'Please select a lesson and a student.');
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return Alert.alert('Invalid grade', 'Please enter a number between 0 and 100.');
    }
    try {
      setSaving(true);
      const res = await fetch(`${baseURL}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lesson.id,
          student_id: student.id,
          teacher_id: teacherIdNum,
          grade: n,
          comment: comment.trim()
        })
      });
      if (!res.ok) throw new Error(await res.text());
      Alert.alert('Saved', 'Grade recorded successfully.');
      setGrade(''); setComment('');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  // Calendar helpers
  const lessonsByDate = useMemo(() => {
    const map = {};
    for (const l of lessons) {
      const d = (l.date || '').slice(0,10);
      if (!map[d]) map[d] = [];
      map[d].push(l);
    }
    return map;
  }, [lessons]);

  const [selectedDate, setSelectedDate] = useState(null);
  const makeMarked = (dateSel) => {
    const marks = {};
    Object.keys(lessonsByDate).forEach(d => {
      marks[d] = {
        marked: true,
        dotColor: theme.colors.primary,
        selected: dateSel === d,
        selectedColor: theme.colors.primary
      };
    });
    if (dateSel && !marks[dateSel]) {
      marks[dateSel] = { selected: true, selectedColor: theme.colors.primary };
    }
    return marks;
  };
  const markedDatesGrade   = useMemo(() => makeMarked(selectedDate),    [lessonsByDate, selectedDate]);
  const markedDatesSummary = useMemo(() => makeMarked(sumSelectedDate), [lessonsByDate, sumSelectedDate]);
  const lessonsForDate = (d) => (d ? (lessonsByDate[d] || []) : []);

  // Summary: load lesson grades (NO teacherId needed)
  const loadLessonSummary = useCallback(async (lessonId) => {
    try {
      setSumLoading(true);
      const r = await fetch(`${baseURL}/lessons/${lessonId}/grades`);
      if (!r.ok) throw new Error(await r.text());
      const arr = await r.json();
      setSumItems(Array.isArray(arr) ? arr : []);
    } catch (e) {
      Alert.alert('Summary', e?.message || 'Cannot load grades for this lesson');
      setSumItems([]);
    } finally {
      setSumLoading(false);
    }
  }, []);

  const onRefreshSummary = useCallback(async () => {
    if (!sumLesson) return;
    setSumRefreshing(true);
    await loadLessonSummary(sumLesson.id);
    setSumRefreshing(false);
  }, [sumLesson, loadLessonSummary]);

  const sumStats = useMemo(() => {
    const gs = sumItems.map(i => Number(i.grade)).filter(Number.isFinite);
    const count = gs.length;
    const avg = count ? (gs.reduce((a,b)=>a+b,0)/count) : 0;
    const min = count ? Math.min(...gs) : null;
    const max = count ? Math.max(...gs) : null;
    return { count, avg: avg.toFixed(2), min, max };
  }, [sumItems]);

  // ====== Render guards ======
  if (!teacherIdReady) {
    return (
      <View style={[styles.safe, { padding:16, alignItems:'center', justifyContent:'center' }]}>
        <View style={[styles.card, { width:'100%' }]}>
          <Text style={[styles.title, { marginBottom:8 }]}>Grade — Configuration</Text>
          <Text style={{ color: theme.colors.textMuted }}>
            Missing <Text style={{ color: theme.colors.text, fontWeight:'700' }}>teacherId</Text>.
            Please log in as a teacher or pass the prop <Text style={{ color: theme.colors.text, fontWeight:'700' }}>teacherId</Text> to this screen.
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.safe, { alignItems:'center', justifyContent:'center', padding:16 }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.textMuted, marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity onPress={()=>setTab('grade')} style={[styles.tabBtn, tab==='grade' && styles.tabBtnActive]}>
          <Text style={[styles.tabTxt, tab==='grade' && styles.tabTxtActive]}>Grade</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>setTab('summary')} style={[styles.tabBtn, tab==='summary' && styles.tabBtnActive]}>
          <Text style={[styles.tabTxt, tab==='summary' && styles.tabTxtActive]}>Summary</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        {tab === 'grade' ? (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
            <Text style={styles.title}>Grade a Student</Text>

            <View style={styles.card}>
              <Select
                label="Lesson (by date)"
                value={lesson ? `${lesson.title} — ${lesson.date}` : (selectedDate ? `Date: ${selectedDate}` : '')}
                onPress={() => setOpenCalendar(true)}
              />
              <Select
                label="Student"
                value={student ? student.full_name : ''}
                onPress={() => setOpenStudents(true)}
              />

              <Text style={styles.label}>Grade (0–100)</Text>
              <TextInput
                keyboardType="numeric"
                value={grade}
                onChangeText={setGrade}
                style={styles.input}
                placeholder="e.g. 86"
                placeholderTextColor={theme.colors.textMuted}
                returnKeyType="done"
              />

              <Text style={styles.label}>Comment</Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                style={[styles.input, { height: 120, textAlignVertical:'top' }]}
                multiline
                placeholder="Optional feedback"
                placeholderTextColor={theme.colors.textMuted}
              />

              <TouchableOpacity onPress={submit} disabled={saving} style={[styles.primaryBtn, saving && { opacity: 0.6 }]}>
                <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Save Grade'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <FlatList
            style={styles.scrollContainer}
            data={sumItems}
            keyExtractor={(item, idx) => String(item.student_id ?? idx)}
            contentContainerStyle={styles.scroll}
            refreshControl={<RefreshControl refreshing={sumRefreshing} onRefresh={onRefreshSummary} />}
            ListHeaderComponent={
              <>
                <Text style={styles.title}>Teacher's Grade Summary</Text>

                {/* Calendar-driven lesson picker */}
                <Select
                  label="Pick lesson by date"
                  value={sumLesson ? `${sumLesson.title} — ${(sumLesson.date || '').slice(0,10)} ${sumLesson.time || ''}` : ''}
                  onPress={() => setSumOpenCalendar(true)}
                />

                {sumLesson ? (
                  <View style={[styles.card, { marginTop: 8 }]}>
                    <Text style={[styles.gradeSub, { marginBottom: 8 }]}>
                      {sumLesson.title} — {(sumLesson.date || '').slice(0,10)} {sumLesson.time || ''}
                    </Text>
                    <View style={styles.pillsRow}>
                      <StatPill label="Total" value={sumStats.count} />
                      <StatPill label="Average" value={sumStats.avg} />
                      <StatPill label="Min" value={sumStats.min ?? '-'} />
                      <StatPill label="Max" value={sumStats.max ?? '-'} />
                    </View>
                    {sumLoading && (
                      <View style={{ paddingVertical: 8, alignItems:'center' }}>
                        <ActivityIndicator color={theme.colors.primary} />
                        <Text style={{ color: theme.colors.textMuted, marginTop: 8 }}>Loading…</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={{ color: theme.colors.textMuted, marginTop: 8 }}>
                    Select a lesson on the calendar to see its grades.
                  </Text>
                )}
              </>
            }
            renderItem={({ item }) => (
              sumLesson ? (
                <View style={styles.gradeCard}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                    <Text style={styles.gradeTitle}>{item.full_name}</Text>
                    <Text style={styles.gradeScore}>{Number(item.grade).toFixed(1)}</Text>
                  </View>
                </View>
              ) : null
            )}
            ListEmptyComponent={
              sumLesson && !sumLoading ? (
                <Text style={{ color: theme.colors.textMuted, textAlign:'center', marginTop: 8 }}>
                  No grades for this lesson.
                </Text>
              ) : null
            }
          />
        )}
      </KeyboardAvoidingView>

      {/* ==== CALENDAR (Grade) ==== */}
      <Modal visible={openCalendar} transparent animationType="fade" onRequestClose={() => setOpenCalendar(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: 8 }]}>
            <Text style={styles.sheetTitle}>Pick a date</Text>
            <Calendar
              onDayPress={(d)=>setSelectedDate(d.dateString)}
              markedDates={markedDatesGrade}
              theme={{
                calendarBackground: theme.colors.card,
                dayTextColor: theme.colors.text,
                monthTextColor: theme.colors.text,
                textDisabledColor: theme.colors.textMuted,
                arrowColor: theme.colors.primary,
                todayTextColor: theme.colors.primary,
              }}
            />
            <View style={{ height: 12 }} />
            <Text style={[styles.sheetTitle, { marginBottom: 8 }]}>
              {selectedDate ? `Lessons on ${selectedDate}` : 'No date selected'}
            </Text>
            <FlatList
              data={lessonsForDate(selectedDate)}
              keyExtractor={(i)=>String(i.id)}
              ListEmptyComponent={
                <Text style={{ color: theme.colors.textMuted, textAlign:'center' }}>
                  {selectedDate ? "No lessons that day" : "Pick a date"}
                </Text>
              }
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => { setLesson(item); setOpenCalendar(false); }}
                >
                  <Text style={styles.rowTxt}>{item.title} — {item.time || ''}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={()=>setOpenCalendar(false)}>
              <Text style={styles.closeTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==== STUDENT PICKER (Grade) ==== */}
      <Modal visible={openStudents} transparent animationType="fade" onRequestClose={()=>setOpenStudents(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select a student</Text>
            <FlatList
              data={lesson ? enrolled : students}
              keyExtractor={(i)=>String(i.id)}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.row} onPress={()=>{ setStudent(item); setOpenStudents(false); }}>
                  <Text style={styles.rowTxt}>{item.full_name} ({item.email})</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ color: theme.colors.textMuted, textAlign:'center' }}>No students</Text>}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={()=>setOpenStudents(false)}>
              <Text style={styles.closeTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==== CALENDAR (Summary) ==== */}
      <Modal visible={sumOpenCalendar} transparent animationType="fade" onRequestClose={()=>setSumOpenCalendar(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: 8 }]}>
            <Text style={styles.sheetTitle}>Pick a date for Summary</Text>
            <Calendar
              onDayPress={(d)=>setSumSelectedDate(d.dateString)}
              markedDates={markedDatesSummary}
              theme={{
                calendarBackground: theme.colors.card,
                dayTextColor: theme.colors.text,
                monthTextColor: theme.colors.text,
                textDisabledColor: theme.colors.textMuted,
                arrowColor: theme.colors.primary,
                todayTextColor: theme.colors.primary,
              }}
            />
            <View style={{ height: 12 }} />
            <Text style={[styles.sheetTitle, { marginBottom: 8 }]}>
              {sumSelectedDate ? `Lessons on ${sumSelectedDate}` : 'No date selected'}
            </Text>
            <FlatList
              data={lessonsForDate(sumSelectedDate)}
              keyExtractor={(i)=>String(i.id)}
              ListEmptyComponent={
                <Text style={{ color: theme.colors.textMuted, textAlign:'center' }}>
                  {sumSelectedDate ? "No lessons that day" : "Pick a date"}
                </Text>
              }
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={async () => {
                    setSumLesson(item);
                    setSumOpenCalendar(false);
                    setSumItems([]);
                    await loadLessonSummary(item.id); // NO teacherId here
                  }}
                >
                  <Text style={styles.rowTxt}>{item.title} — {item.time || ''}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={()=>setSumOpenCalendar(false)}>
              <Text style={styles.closeTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:{ flex:1, backgroundColor:theme.colors.bg },
  scrollContainer: { flex: 1 },
  scroll:{ padding:16, paddingBottom:32, flexGrow: 1 },

  tabs:{ flexDirection:'row', gap:8, padding:16, paddingBottom:0 },
  tabBtn:{
    flex:1, alignItems:'center', paddingVertical:10,
    borderRadius:999, borderWidth:1, borderColor:theme.colors.border,
    backgroundColor:theme.colors.surface
  },
  tabBtnActive:{ backgroundColor:theme.colors.primary, borderColor:theme.colors.primary },
  tabTxt:{ color:theme.colors.text, fontWeight:'700' },
  tabTxtActive:{ color:'#fff' },

  title:{ color:theme.colors.text, fontSize:20, fontWeight:'800', textAlign:'center', marginBottom:16 },
  card:{ backgroundColor:theme.colors.card, borderWidth:1, borderColor:theme.colors.border, borderRadius:16, padding:16 },

  label:{ color:theme.colors.text, marginTop:12, marginBottom:6 },
  input:{ backgroundColor:theme.colors.surface, borderWidth:1, borderColor:theme.colors.border, borderRadius:12, color:theme.colors.text, paddingHorizontal:12, paddingVertical:12 },
  select:{ backgroundColor:theme.colors.surface, borderWidth:1, borderColor:theme.colors.border, borderRadius:12, padding:12, marginBottom:8 },
  selectLabel:{ color:theme.colors.textMuted, fontSize:12, marginBottom:2 },
  selectValue:{ color:theme.colors.text, fontWeight:'600' },
  primaryBtn:{ backgroundColor:theme.colors.primary, paddingVertical:12, borderRadius:12, alignItems:'center', marginTop:16 },
  primaryBtnText:{ color:'#fff', fontWeight:'700' },

  pillsRow:{ flexDirection:'row', gap:8, marginBottom:12 },
  pill:{ backgroundColor:theme.colors.surface, borderWidth:1, borderColor:theme.colors.border, borderRadius:999, paddingVertical:8, paddingHorizontal:14 },
  pillLabel:{ color:theme.colors.textMuted, fontSize:12 },
  pillValue:{ color:theme.colors.text, fontWeight:'800', fontSize:16 },

  gradeCard:{ backgroundColor:theme.colors.surface, borderWidth:1, borderColor:theme.colors.border, borderRadius:14, padding:12, marginBottom:10 },
  gradeTitle:{ color:theme.colors.text, fontWeight:'800' },
  gradeSub:{ color:theme.colors.textMuted, marginTop:2 },
  gradeScore:{ color:'#fff', backgroundColor:theme.colors.primary, borderRadius:10, paddingHorizontal:10, paddingVertical:4, overflow:'hidden', fontWeight:'800' },

  overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'center', alignItems:'center', padding:20 },
  sheet:{ backgroundColor:theme.colors.card, borderRadius:16, padding:20, width:'100%', maxHeight:'80%' },
  sheetTitle:{ color:theme.colors.text, fontSize:18, fontWeight:'700', marginBottom:16, textAlign:'center' },

  row:{ backgroundColor:theme.colors.surface, borderWidth:1, borderColor:theme.colors.border, borderRadius:12, padding:12, marginBottom:8 },
  rowTxt:{ color:theme.colors.text, fontWeight:'600' },

  closeBtn:{ backgroundColor:theme.colors.primary, paddingVertical:12, borderRadius:12, alignItems:'center', marginTop:16 },
  closeTxt:{ color:'#fff', fontWeight:'700' },
});
