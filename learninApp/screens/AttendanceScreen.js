import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';

const theme = {
    colors: {
        bg: '#0F172A',
        card: '#111827',
        surface: '#0B1220',
        text: '#F3F4F6',
        textMuted: '#9CA3AF',
        primary: '#2563EB',
        border: '#1F2937',
        success: '#16A34A',
        danger: '#DC2626',
    },
    radius: 16,
    gap: 16,
};

function Pill({ tone = 'default', children }) {
    const bg = tone === 'success' ? 'rgba(22,163,74,0.14)' :
        tone === 'danger' ? 'rgba(220,38,38,0.14)' : theme.colors.surface;
    const color = tone === 'success' ? theme.colors.success :
        tone === 'danger' ? theme.colors.danger : theme.colors.text;
    return (
        <View style={[styles.pill, { backgroundColor: bg }]}>
            <Text style={[styles.pillText, { color }]}>{children}</Text>
        </View>
    );
}

export default function AttendanceScreen({ userRole, teacherId }) {
    const isTeacher = userRole === 'teacher';
    const isAdmin = userRole === 'admin';

    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [query, setQuery] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [attendance, setAttendance] = useState([]); // [{lesson_id, title, date, time, present}]
    const [busyToggleId, setBusyToggleId] = useState(null);

    const baseURL = 'http://10.0.2.2:3001';

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                // Endpoint supposé: renvoie la liste des étudiants
                // Exemples possibles côté backend :
                //  - GET /students  -> [{id, full_name, email}, ...]
                //  - ou GET /admin/students si tu veux restreindre
                const res = await fetch(`${baseURL}/students`);
                if (!res.ok) throw new Error('Failed to fetch students');
                const data = await res.json();
                setStudents(Array.isArray(data) ? data : []);
            } catch (e) {
                Alert.alert('Error', e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return students;
        return students.filter(s =>
            (s.full_name || '').toLowerCase().includes(q) ||
            (s.email || '').toLowerCase().includes(q)
        );
    }, [students, query]);

    const openStudent = async (student) => {
        try {
            setSelectedStudent(student);
            setModalOpen(true);
            // Endpoint supposé: renvoie tous les cours de l'élève + statut presence
            // Proposition backend:
            //   GET /attendance?student_id=<id>
            //   => [{ lesson_id, title, date, time, present }, ...]
            const res = await fetch(`${baseURL}/attendance?student_id=${student.id}`);
            if (!res.ok) throw new Error('Failed to fetch attendance');
            const data = await res.json();
            setAttendance(Array.isArray(data) ? data : []);
        } catch (e) {
            setAttendance([]);
            Alert.alert('Error', e.message);
        }
    };

    const toggleAttendance = async (lessonId, current) => {
        if (!isTeacher) return; // admin = read-only
        try {
            setBusyToggleId(lessonId);
            // Endpoint supposé:
            // POST /attendance/mark  body: { lesson_id, student_id, present, teacher_id }
            const res = await fetch(`${baseURL}/attendance/mark`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lesson_id: lessonId,
                    student_id: selectedStudent.id,
                    present: !current,
                    teacher_id: teacherId,
                }),
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || 'Failed to update attendance');
            }
            setAttendance(prev =>
                prev.map(a => a.lesson_id === lessonId ? { ...a, present: !current } : a)
            );
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setBusyToggleId(null);
        }
    };

    if (loading) {
        return (
            <View style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ color: theme.colors.textMuted, marginTop: 12 }}>Loading students…</Text>
            </View>
        );
    }

    return (
        <View style={styles.safe}>
            <Text style={styles.title}>Attendance</Text>

            {/* Search */}
            <View style={styles.searchBox}>
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search by name or email…"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.searchInput}
                />
            </View>

            {/* Students list */}
            {filtered.length === 0 ? (
                <Text style={styles.empty}>No students found.</Text>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(s) => String(s.id)}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.studentRow}
                            onPress={() => openStudent(item)}
                            activeOpacity={0.85}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.studentName}>{item.full_name}</Text>
                                <Text style={styles.studentSub}>{item.email}</Text>
                            </View>
                            <Pill>Details</Pill>
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* Student details modal */}
            <Modal
                visible={modalOpen}
                animationType="fade"
                transparent
                onRequestClose={() => setModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        {selectedStudent ? (
                            <>
                                <Text style={styles.modalTitle}>{selectedStudent.full_name}</Text>
                                <Text style={styles.modalSub}>{selectedStudent.email}</Text>

                                <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Lessons</Text>

                                <ScrollView style={{ maxHeight: '65%' }}>
                                    {attendance.length === 0 ? (
                                        <Text style={styles.empty}>No lessons found.</Text>
                                    ) : (
                                        attendance.map((a) => {
                                            const tone = a.present ? 'success' : 'danger';
                                            return (
                                                <View key={a.lesson_id} style={styles.lessonRow}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.lessonTitle}>{a.title || 'Lesson'}</Text>
                                                        <Text style={styles.lessonSub}>
                                                            {a.date} {a.time}
                                                        </Text>
                                                    </View>

                                                    <Pill tone={tone}>{a.present ? 'Present' : 'Absent'}</Pill>

                                                    {isTeacher && (
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.toggleBtn,
                                                                a.present ? styles.toggleDanger : styles.toggleSuccess,
                                                                busyToggleId === a.lesson_id && { opacity: 0.6 },
                                                            ]}
                                                            disabled={busyToggleId === a.lesson_id}
                                                            onPress={() => toggleAttendance(a.lesson_id, a.present)}
                                                            activeOpacity={0.85}
                                                        >
                                                            <Text style={styles.toggleText}>
                                                                {a.present ? 'Mark Absent' : 'Mark Present'}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            );
                                        })
                                    )}
                                </ScrollView>

                                <TouchableOpacity
                                    style={styles.closeBtn}
                                    onPress={() => setModalOpen(false)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.closeText}>Close</Text>
                                </TouchableOpacity>
                            </>
                        ) : null}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg, paddingTop: 8 },
    title: {
        color: theme.colors.text, fontSize: 22, fontWeight: '800',
        textAlign: 'center', marginBottom: 12,
    },
    searchBox: {
        marginHorizontal: 16,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
    },
    searchInput: {
        color: theme.colors.text,
    },
    studentRow: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 14,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    studentName: { color: theme.colors.text, fontWeight: '700', fontSize: 16 },
    studentSub: { color: theme.colors.textMuted, marginTop: 2 },

    lessonRow: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 12,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    lessonTitle: { color: theme.colors.text, fontWeight: '700' },
    lessonSub: { color: theme.colors.textMuted, marginTop: 2 },

    pill: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    pillText: { color: theme.colors.text, fontSize: 12 },

    toggleBtn: {
        paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
        borderWidth: 1, marginLeft: 6,
    },
    toggleSuccess: {
        backgroundColor: 'rgba(22,163,74,0.15)',
        borderColor: '#14532D',
    },
    toggleDanger: {
        backgroundColor: 'rgba(220,38,38,0.15)',
        borderColor: '#7F1D1D',
    },
    toggleText: { color: theme.colors.text, fontWeight: '700', fontSize: 12 },

    empty: { color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 12 },

    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center', justifyContent: 'center', padding: 16,
    },
    modalCard: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.gap,
        width: '92%',
        maxHeight: '85%',
    },
    modalTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
    modalSub: { color: theme.colors.textMuted, marginTop: 4 },
    sectionTitle: { color: theme.colors.text, fontWeight: '700', marginTop: 8, marginBottom: 8 },

    closeBtn: {
        marginTop: 10, alignSelf: 'flex-end',
        paddingHorizontal: 12, paddingVertical: 10,
        borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    closeText: { color: theme.colors.text, fontWeight: '700' },
});