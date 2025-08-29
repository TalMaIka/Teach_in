import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator,
    Alert, FlatList, Modal, KeyboardAvoidingView, Platform, ScrollView, RefreshControl
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
    const baseURL = 'http://10.0.2.2:3001'; // change to your LAN IP on a real device

    // Tabs: 'grade' | 'summary'
    const [tab, setTab] = useState('grade');

    // Data
    const [loading, setLoading] = useState(true);
    const [lessons, setLessons] = useState([]);
    const [students, setStudents] = useState([]);

    // Grade form
    const [lesson, setLesson] = useState(null);   // {id,title,date,time}
    const [student, setStudent] = useState(null); // {id,full_name,email}
    const [grade, setGrade] = useState('');
    const [comment, setComment] = useState('');
    const [saving, setSaving] = useState(false);

    // Modals
    const [openCalendar, setOpenCalendar] = useState(false);
    const [openStudents, setOpenStudents] = useState(false);

    // Students enrolled to selected lesson
    const [enrolled, setEnrolled] = useState([]);

    // Summary
    const [sumLoading, setSumLoading] = useState(false);
    const [sumRefreshing, setSumRefreshing] = useState(false);
    const [sumItems, setSumItems] = useState([]); // {id, student_name, lesson_title, date, grade, comment}
    const [sumStats, setSumStats] = useState({ count: 0, avg: '0.00', min: null, max: null });

    // Initial load
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const [L, S] = await Promise.all([
                    fetch(`${baseURL}/teachers/${teacherId}/lessons`),
                    fetch(`${baseURL}/teachers/${teacherId}/students`)
                ]);
                const ljs = await L.json().catch(()=>[]);
                const sjs = await S.json().catch(()=>[]);
                setLessons(Array.isArray(ljs) ? ljs : []);
                setStudents(Array.isArray(sjs) ? sjs : []);
            } catch (e) {
                Alert.alert('Error', 'Failed to load teacher data');
            } finally {
                setLoading(false);
            }
        })();
    }, [teacherId]);

    // Load enrolled students for selected lesson
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

    // Submit grade
    const submit = async () => {
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
                    teacher_id: teacherId,
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

    // ===== Calendar (choose lesson by date) =====
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
    const markedDates = useMemo(() => {
        const marks = {};
        Object.keys(lessonsByDate).forEach(d => {
            marks[d] = {
                marked: true,
                dotColor: theme.colors.primary,
                selected: selectedDate === d,
                selectedColor: theme.colors.primary
            };
        });
        if (selectedDate && !marks[selectedDate]) {
            marks[selectedDate] = { selected: true, selectedColor: theme.colors.primary };
        }
        return marks;
    }, [lessonsByDate, selectedDate]);

    const lessonsForSelectedDate = useMemo(() => {
        return selectedDate ? (lessonsByDate[selectedDate] || []) : [];
    }, [selectedDate, lessonsByDate]);

    // ===== Summary =====
    const loadSummary = useCallback(async () => {
        try {
            setSumLoading(true);
            const r = await fetch(`${baseURL}/teachers/${teacherId}/grades`);
            if (!r.ok) throw new Error(await r.text());
            const items = await r.json();
            const arr = Array.isArray(items) ? items : [];
            setSumItems(arr);

            const gs = arr.map(i => Number(i.grade)).filter(Number.isFinite);
            const count = gs.length;
            const avg = count ? (gs.reduce((a,b)=>a+b,0)/count) : 0;
            const min = count ? Math.min(...gs) : null;
            const max = count ? Math.max(...gs) : null;
            setSumStats({ count, avg: avg.toFixed(2), min, max });
        } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to load summary');
            setSumItems([]);
            setSumStats({ count:0, avg:'0.00', min:null, max:null });
        } finally {
            setSumLoading(false);
        }
    }, [teacherId]);

    const refreshSummary = useCallback(async () => {
        setSumRefreshing(true);
        await loadSummary();
        setSumRefreshing(false);
    }, [loadSummary]);

    // Auto-load summary when switching to the tab
    useEffect(() => {
        if (tab === 'summary') loadSummary();
    }, [tab, loadSummary]);

    if (loading) {
        return (
            <View style={[styles.safe, { alignItems:'center', justifyContent:'center', padding:16 }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ color: theme.colors.textMuted, marginTop: 8 }}>Loading…</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity onPress={()=>setTab('grade')} style={[styles.tabBtn, tab==='grade' && styles.tabBtnActive]}>
                    <Text style={[styles.tabTxt, tab==='grade' && styles.tabTxtActive]}>Grade</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>setTab('summary')} style={[styles.tabBtn, tab==='summary' && styles.tabBtnActive]}>
                    <Text style={[styles.tabTxt, tab==='summary' && styles.tabTxtActive]}>Summary</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {tab === 'grade' ? (
                    <>
                        <Text style={styles.title}>Grade a Student</Text>

                        <View style={styles.card}>
                            {/* Lesson via calendar */}
                            <Select
                                label="Lesson (by date)"
                                value={lesson ? `${lesson.title} — ${lesson.date}` : (selectedDate ? `Date: ${selectedDate}` : '')}
                                onPress={() => setOpenCalendar(true)}
                            />

                            {/* Student */}
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
                    </>
                ) : (
                    <>
                        <Text style={styles.title}>Teacher’s Grade Summary</Text>

                        {/* Stats */}
                        <View style={styles.pillsRow}>
                            <StatPill label="Total" value={sumStats.count} />
                            <StatPill label="Average" value={sumStats.avg} />
                            <StatPill label="Min" value={sumStats.min ?? '-'} />
                            <StatPill label="Max" value={sumStats.max ?? '-'} />
                        </View>

                        {/* Inline list */}
                        {sumLoading ? (
                            <View style={{ paddingVertical: 24, alignItems:'center' }}>
                                <ActivityIndicator color={theme.colors.primary} />
                                <Text style={{ color: theme.colors.textMuted, marginTop: 8 }}>Loading…</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={sumItems}
                                keyExtractor={(i)=>String(i.id)}
                                refreshControl={<RefreshControl refreshing={sumRefreshing} onRefresh={refreshSummary} tintColor={theme.colors.primary} />}
                                ListEmptyComponent={<Text style={{ color: theme.colors.textMuted, textAlign:'center' }}>No grades found.</Text>}
                                contentContainerStyle={{ paddingBottom: 16 }}
                                renderItem={({ item }) => (
                                    <View style={styles.gradeCard}>
                                        <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                                            <Text style={styles.gradeTitle}>{item.student_name}</Text>
                                            <Text style={styles.gradeScore}>{Number(item.grade).toFixed(1)}</Text>
                                        </View>
                                        <Text style={styles.gradeSub}>{item.lesson_title} — {item.date}</Text>
                                        {item.comment ? <Text style={styles.gradeComment}>{item.comment}</Text> : null}
                                    </View>
                                )}
                            />
                        )}
                    </>
                )}
            </ScrollView>

            {/* ==== CALENDAR MODAL (choose day + lesson) ==== */}
            <Modal visible={openCalendar} transparent animationType="fade" onRequestClose={() => setOpenCalendar(false)}>
                <View style={styles.overlay}>
                    <View style={[styles.sheet, { paddingBottom: 8 }]}>
                        <Text style={styles.sheetTitle}>Pick a date</Text>
                        <Calendar
                            onDayPress={(d)=>setSelectedDate(d.dateString)}
                            markedDates={markedDates}
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
                            data={lessonsForSelectedDate}
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

            {/* ==== STUDENT PICKER ==== */}
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
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    safe:{ flex:1, backgroundColor:theme.colors.bg },
    scroll:{ padding:16, paddingBottom:32 },

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

    pillsRow:{ flexDirection:'row', gap:8, marginBottom:12, paddingHorizontal:16 },
    pill:{ backgroundColor:theme.colors.surface, borderWidth:1, borderColor:theme.colors.border, borderRadius:999, paddingVertical:8, paddingHorizontal:14 },
    pillLabel:{ color:theme.colors.textMuted, fontSize:12 },
    pillValue:{ color:theme.colors.text, fontWeight:'800', fontSize:16 },

    gradeCard:{ backgroundColor:theme.colors.surface, borderWidth:1, borderColor:theme.colors.border, borderRadius:14, padding:12, marginBottom:10, marginHorizontal:16 },
    gradeTitle:{ color:theme.colors.text, fontWeight:'800' },
    gradeSub:{ color:theme.colors.textMuted, marginTop:2 },
    gradeScore:{ color:'#fff', backgroundColor:theme.colors.primary, borderRadius:10, paddingHorizontal:10, paddingVertical:4, overflow:'hidden', fontWeight:'800' },
    gradeComment:{ color:theme.colors.text, marginTop:8 },

    overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center', padding:16 },
    sheet:{ backgroundColor:theme.colors.card, borderWidth:1, borderColor:theme.colors.border, borderRadius:16, padding:16, width:'92%', maxHeight:'80%' },
    sheetTitle:{ color:theme.colors.text, fontWeight:'700', fontSize:16, marginBottom:8 },
    row:{ paddingVertical:12, paddingHorizontal:10, borderWidth:1, borderColor:theme.colors.border, borderRadius:10, backgroundColor:theme.colors.surface, marginBottom:8 },
    rowTxt:{ color:theme.colors.text },
    closeBtn:{ alignSelf:'flex-end', paddingHorizontal:12, paddingVertical:10, borderRadius:10, borderWidth:1, borderColor:theme.colors.border, backgroundColor:theme.colors.surface, marginTop:8 },
    closeTxt:{ color:theme.colors.text, fontWeight:'700' },
});
