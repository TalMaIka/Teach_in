import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    KeyboardAvoidingView,
    Platform,
    ScrollView
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
    radius: 16,
    gap: 16
};

function Select({ label, value, onPress }) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.select}>
            <Text style={styles.selectLabel}>{label}</Text>
            <Text
                style={[styles.selectValue, { color: value ? theme.colors.text : theme.colors.textMuted }]}
                numberOfLines={1}
            >
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

    const [loading, setLoading] = useState(true);
    const [lessons, setLessons] = useState([]);
    const [students, setStudents] = useState([]);

    const [lesson, setLesson] = useState(null);   // {id,title,date}
    const [student, setStudent] = useState(null); // {id,full_name}
    const [grade, setGrade] = useState('');
    const [comment, setComment] = useState('');
    const [saving, setSaving] = useState(false);

    const [openCalendar, setOpenCalendar] = useState(false);
    const [openStudents, setOpenStudents] = useState(false);
    const [openSummary, setOpenSummary] = useState(false);

    const [selectedDate, setSelectedDate] = useState(null); // 'YYYY-MM-DD'
    const [enrolled, setEnrolled] = useState([]); // students of selected lesson

    // Résumé des notes
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryItems, setSummaryItems] = useState([]); // {id, student_name, lesson_title, date, grade, comment}
    const [summaryStats, setSummaryStats] = useState({ count: 0, avg: 0, min: null, max: null });

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const [L, S] = await Promise.all([
                    fetch(`${baseURL}/teachers/${teacherId}/lessons`),
                    fetch(`${baseURL}/teachers/${teacherId}/students`)
                ]);
                const ljs = await L.json();
                const sjs = await S.json();
                setLessons(Array.isArray(ljs) ? ljs : []);
                setStudents(Array.isArray(sjs) ? sjs : []);
            } catch {
                Alert.alert('Error', 'Failed to load data');
            } finally {
                setLoading(false);
            }
        })();
    }, [teacherId]);

    // Quand on choisit un cours, charger la liste d’élèves inscrits à ce cours
    useEffect(() => {
        (async () => {
            if (!lesson) { setEnrolled([]); setStudent(null); return; }
            try {
                const res = await fetch(`${baseURL}/lessons/${lesson.id}/students`);
                const js = await res.json();
                setEnrolled(Array.isArray(js) ? js : []);
                setStudent(null);
            } catch {
                setEnrolled([]);
            }
        })();
    }, [lesson]);

    const submit = async () => {
        const n = Number(grade);
        if (!lesson || !student) return Alert.alert('Missing', 'Select a lesson and a student');
        if (!Number.isFinite(n) || n < 0 || n > 100) return Alert.alert('Invalid grade', 'Enter a number between 0 and 100');
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
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || 'Failed to save grade');
            }
            Alert.alert('Saved', 'Grade recorded');
            setGrade(''); setComment('');
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    // ======= Calendrier / filtrage par date =======
    const lessonsByDate = useMemo(() => {
        const map = {};
        for (const l of lessons) {
            const d = (l.date || '').slice(0,10);
            if (!map[d]) map[d] = [];
            map[d].push(l);
        }
        return map;
    }, [lessons]);

    const markedDates = useMemo(() => {
        // Marquer les dates ayant au moins 1 cours
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

    const onDayPress = useCallback((day) => {
        setSelectedDate(day.dateString); // 'YYYY-MM-DD'
    }, []);

    // ======= Résumé des notes (prof) =======
    const openSummaryModal = async () => {
        try {
            setSummaryLoading(true);
            setOpenSummary(true);
            // Route dédiée (voir section backend)
            const r = await fetch(`${baseURL}/teachers/${teacherId}/grades`);
            if (!r.ok) throw new Error(await r.text());
            const items = await r.json(); // {id, student_name, lesson_title, date, grade, comment}
            setSummaryItems(items);

            // stats
            const grades = items.map(i => Number(i.grade)).filter(Number.isFinite);
            const count = grades.length;
            const avg = count ? (grades.reduce((a,b)=>a+b,0)/count) : 0;
            const min = count ? Math.min(...grades) : null;
            const max = count ? Math.max(...grades) : null;
            setSummaryStats({
                count,
                avg: Number.isFinite(avg) ? avg.toFixed(2) : 0,
                min, max
            });
        } catch (e) {
            Alert.alert('Error', e.message || 'Failed to load summary');
        } finally {
            setSummaryLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.safe, { alignItems:'center', justifyContent:'center', padding:16 }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ color: theme.colors.textMuted, marginTop: 8 }}>Loading…</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.safe}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Grade a Student</Text>

                <View style={styles.card}>
                    {/* Sélection du cours par calendrier */}
                    <Select
                        label="Lesson (by date)"
                        value={lesson ? `${lesson.title} — ${lesson.date}` : (selectedDate ? `Date: ${selectedDate}` : '')}
                        onPress={() => setOpenCalendar(true)}
                    />

                    {/* Élève */}
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

                    {/* Bouton résumé des notes */}
                    <TouchableOpacity onPress={openSummaryModal} style={[styles.secondaryBtn, { marginTop: 12 }]}>
                        <Text style={styles.secondaryBtnText}>Voir le résumé des notes données</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* ==== MODAL CALENDRIER + liste des cours du jour ==== */}
            <Modal visible={openCalendar} transparent animationType="fade" onRequestClose={() => setOpenCalendar(false)}>
                <View style={styles.overlay}>
                    <View style={[styles.sheet, { paddingBottom: 8 }]}>
                        <Text style={styles.sheetTitle}>Choisir une date</Text>
                        <Calendar
                            onDayPress={onDayPress}
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
                            {selectedDate ? `Cours le ${selectedDate}` : 'Aucune date sélectionnée'}
                        </Text>
                        <FlatList
                            data={lessonsForSelectedDate}
                            keyExtractor={(i)=>String(i.id)}
                            ListEmptyComponent={
                                <Text style={{ color: theme.colors.textMuted, textAlign:'center' }}>
                                    {selectedDate ? "Aucun cours ce jour" : "Sélectionne une date"}
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

            {/* ==== MODAL CHOIX ÉLÈVE ==== */}
            <Modal visible={openStudents} transparent animationType="fade" onRequestClose={()=>setOpenStudents(false)}>
                <View style={styles.overlay}>
                    <View style={styles.sheet}>
                        <Text style={styles.sheetTitle}>Select Student</Text>
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

            {/* ==== MODAL RÉSUMÉ DES NOTES ==== */}
            <Modal visible={openSummary} transparent animationType="fade" onRequestClose={()=>setOpenSummary(false)}>
                <View style={styles.overlay}>
                    <View style={[styles.sheet, { maxHeight: '85%' }]}>
                        <Text style={styles.sheetTitle}>Résumé des notes données</Text>

                        {/* Statistiques en pills */}
                        <View style={styles.pillsRow}>
                            <StatPill label="Total" value={summaryStats.count} />
                            <StatPill label="Moyenne" value={summaryStats.avg} />
                            <StatPill label="Min" value={summaryStats.min ?? '-'} />
                            <StatPill label="Max" value={summaryStats.max ?? '-'} />
                        </View>

                        {summaryLoading ? (
                            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                                <ActivityIndicator color={theme.colors.primary} />
                                <Text style={{ color: theme.colors.textMuted, marginTop: 8 }}>Chargement…</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={summaryItems}
                                keyExtractor={(i)=>String(i.id)}
                                ListEmptyComponent={
                                    <Text style={{ color: theme.colors.textMuted, textAlign:'center', marginTop: 8 }}>
                                        Aucune note trouvée.
                                    </Text>
                                }
                                renderItem={({ item }) => (
                                    <View style={styles.gradeCard}>
                                        <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                                            <Text style={styles.gradeTitle}>{item.student_name}</Text>
                                            <Text style={styles.gradeScore}>{Number(item.grade).toFixed(2)}</Text>
                                        </View>
                                        <Text style={styles.gradeSub}>
                                            {item.lesson_title} — {item.date}
                                        </Text>
                                        {item.comment ? (
                                            <Text style={styles.gradeComment}>{item.comment}</Text>
                                        ) : null}
                                    </View>
                                )}
                            />
                        )}

                        <TouchableOpacity style={styles.closeBtn} onPress={()=>setOpenSummary(false)}>
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
    title:{ color:theme.colors.text, fontSize:20, fontWeight:'800', textAlign:'center', marginBottom:16 },
    card:{ backgroundColor:theme.colors.card, borderWidth:1, borderColor:theme.colors.border, borderRadius:16, padding:16 },

    label:{ color:theme.colors.text, marginTop:12, marginBottom:6 },
    input:{ backgroundColor:theme.colors.surface, borderWidth:1, borderColor:theme.colors.border, borderRadius:12, color:theme.colors.text, paddingHorizontal:12, paddingVertical:12 },
    select:{ backgroundColor:theme.colors.surface, borderWidth:1, borderColor:theme.colors.border, borderRadius:12, padding:12, marginBottom:8 },
    selectLabel:{ color:theme.colors.textMuted, fontSize:12, marginBottom:2 },
    selectValue:{ color:theme.colors.text, fontWeight:'600' },
    primaryBtn:{ backgroundColor:theme.colors.primary, paddingVertical:12, borderRadius:12, alignItems:'center', marginTop:16 },
    primaryBtnText:{ color:'#fff', fontWeight:'700' },

    secondaryBtn:{ backgroundColor:theme.colors.surface, borderWidth:1, borderColor:theme.colors.border, paddingVertical:12, borderRadius:12, alignItems:'center' },
    secondaryBtnText:{ color:theme.colors.text, fontWeight:'700' },

    overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center', padding:16 },
    sheet:{ backgroundColor:theme.colors.card, borderWidth:1, borderColor:theme.colors.border, borderRadius:16, padding:16, width:'92%', maxHeight:'80%' },
    sheetTitle:{ color:theme.colors.text, fontWeight:'700', fontSize:16, marginBottom:8 },
    row:{ paddingVertical:12, paddingHorizontal:10, borderWidth:1, borderColor:theme.colors.border, borderRadius:10, backgroundColor:theme.colors.surface, marginBottom:8 },
    rowTxt:{ color:theme.colors.text },
    closeBtn:{ alignSelf:'flex-end', paddingHorizontal:12, paddingVertical:10, borderRadius:10, borderWidth:1, borderColor:theme.colors.border, backgroundColor:theme.colors.surface, marginTop:8 },
    closeTxt:{ color:theme.colors.text, fontWeight:'700' },

    pillsRow:{ flexDirection:'row', gap:8, marginBottom:8 },
    pill:{ backgroundColor:theme.colors.surface, borderWidth:1, borderColor:theme.colors.border, borderRadius:999, paddingVertical:8, paddingHorizontal:14 },
    pillLabel:{ color:theme.colors.textMuted, fontSize:12 },
    pillValue:{ color:theme.colors.text, fontWeight:'800', fontSize:16 },

    gradeCard:{
        backgroundColor:theme.colors.surface,
        borderWidth:1,
        borderColor:theme.colors.border,
        borderRadius:14,
        padding:12,
        marginBottom:10
    },
    gradeTitle:{ color:theme.colors.text, fontWeight:'800' },
    gradeSub:{ color:theme.colors.textMuted, marginTop:2 },
    gradeScore:{ color:'#fff', backgroundColor:theme.colors.primary, borderRadius:10, paddingHorizontal:10, paddingVertical:4, overflow:'hidden', fontWeight:'800' },
    gradeComment:{ color:theme.colors.text, marginTop:8 }
});
