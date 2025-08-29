import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, FlatList, Modal } from 'react-native';

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
            <Text style={[styles.selectValue, { color: value ? theme.colors.text : theme.colors.textMuted }]} numberOfLines={1}>
                {value || 'Select…'}
            </Text>
        </TouchableOpacity>
    );
}

export default function GradeTeacherScreen({ teacherId }) {
    const baseURL = 'http://10.0.2.2:3001';

    const [loading, setLoading] = useState(true);
    const [lessons, setLessons] = useState([]);
    const [students, setStudents] = useState([]);

    const [lesson, setLesson] = useState(null); // {id,title}
    const [student, setStudent] = useState(null); // {id,full_name}
    const [grade, setGrade] = useState('');
    const [comment, setComment] = useState('');
    const [saving, setSaving] = useState(false);

    const [openLessons, setOpenLessons] = useState(false);
    const [openStudents, setOpenStudents] = useState(false);
    const [enrolled, setEnrolled] = useState([]); // students of selected lesson

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

    // when lesson changes, load enrolled students for that lesson
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

    if (loading) {
        return (
            <View style={[styles.safe, { alignItems:'center', justifyContent:'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ color: theme.colors.textMuted, marginTop: 8 }}>Loading…</Text>
            </View>
        );
    }

    return (
        <View style={styles.safe}>
            <Text style={styles.title}>Grade a Student</Text>

            <View style={styles.card}>
                <Select
                    label="Lesson"
                    value={lesson ? `${lesson.title} — ${lesson.date}` : ''}
                    onPress={() => setOpenLessons(true)}
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
                />

                <Text style={styles.label}>Comment</Text>
                <TextInput
                    value={comment}
                    onChangeText={setComment}
                    style={[styles.input, { height: 100, textAlignVertical:'top' }]}
                    multiline
                    placeholder="Optional feedback"
                    placeholderTextColor={theme.colors.textMuted}
                />

                <TouchableOpacity onPress={submit} disabled={saving} style={[styles.primaryBtn, saving && { opacity: 0.6 }]}>
                    <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Save Grade'}</Text>
                </TouchableOpacity>
            </View>

            {/* Lesson chooser */}
            <Modal visible={openLessons} transparent animationType="fade" onRequestClose={()=>setOpenLessons(false)}>
                <View style={styles.overlay}>
                    <View style={styles.sheet}>
                        <Text style={styles.sheetTitle}>Select Lesson</Text>
                        <FlatList
                            data={lessons}
                            keyExtractor={(i)=>String(i.id)}
                            renderItem={({item}) => (
                                <TouchableOpacity style={styles.row} onPress={()=>{ setLesson(item); setOpenLessons(false); }}>
                                    <Text style={styles.rowTxt}>{item.title} — {item.date}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.closeBtn} onPress={()=>setOpenLessons(false)}><Text style={styles.closeTxt}>Close</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Student chooser (enrolled to selected lesson if any, sinon tous) */}
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
                        <TouchableOpacity style={styles.closeBtn} onPress={()=>setOpenStudents(false)}><Text style={styles.closeTxt}>Close</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    safe:{ flex:1, backgroundColor:theme.colors.bg, padding:16 },
    title:{ color:theme.colors.text, fontSize:20, fontWeight:'800', textAlign:'center', marginBottom:16 },
    card:{ backgroundColor:theme.colors.card, borderWidth:1, borderColor:theme.colors.border, borderRadius:16, padding:16 },
    label:{ color:theme.colors.text, marginTop:12, marginBottom:6 },
    input:{ backgroundColor:theme.colors.surface, borderWidth:1, borderColor:theme.colors.border, borderRadius:12, color:theme.colors.text, paddingHorizontal:12, paddingVertical:12 },
    select:{ backgroundColor:theme.colors.surface, borderWidth:1, borderColor:theme.colors.border, borderRadius:12, padding:12, marginBottom:8 },
    selectLabel:{ color:theme.colors.textMuted, fontSize:12, marginBottom:2 },
    selectValue:{ color:theme.colors.text, fontWeight:'600' },
    primaryBtn:{ backgroundColor:theme.colors.primary, paddingVertical:12, borderRadius:12, alignItems:'center', marginTop:16 },
    primaryBtnText:{ color:'#fff', fontWeight:'700' },

    overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center', padding:16 },
    sheet:{ backgroundColor:theme.colors.card, borderWidth:1, borderColor:theme.colors.border, borderRadius:16, padding:16, width:'92%', maxHeight:'80%' },
    sheetTitle:{ color:theme.colors.text, fontWeight:'700', fontSize:16, marginBottom:8 },
    row:{ paddingVertical:12, paddingHorizontal:10, borderWidth:1, borderColor:theme.colors.border, borderRadius:10, backgroundColor:theme.colors.surface, marginBottom:8 },
    rowTxt:{ color:theme.colors.text },
    closeBtn:{ alignSelf:'flex-end', paddingHorizontal:12, paddingVertical:10, borderRadius:10, borderWidth:1, borderColor:theme.colors.border, backgroundColor:theme.colors.surface, marginTop:8 },
    closeTxt:{ color:theme.colors.text, fontWeight:'700' },
});
