import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from 'react-native';

const theme = {
    colors:{
        bg:'#0F172A',
        card:'#111827',
        surface:'#0B1220',
        text:'#F3F4F6',
        textMuted:'#9CA3AF',
        primary:'#2563EB',
        border:'#1F2937',
        success:'#16A34A'
    },
    radius:16,
    gap:16
};

export default function GradeStudentScreen({ studentId }) {
    const baseURL = 'http://10.0.2.2:3001';
    const [loading, setLoading] = useState(true);
    const [grades, setGrades] = useState([]);
    const [open, setOpen] = useState(false);
    const [dist, setDist] = useState([]); // {full_name, grade}
    const [selected, setSelected] = useState(null); // grade row

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`${baseURL}/students/${studentId}/grades`);
                const js = await res.json();
                setGrades(Array.isArray(js) ? js : []);
            } catch {
                setGrades([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [studentId]);

    const openLesson = async (row) => {
        setSelected(row);
        try {
            const r = await fetch(`${baseURL}/lessons/${row.lesson_id}/grades`);
            const js = await r.json();
            setDist(Array.isArray(js) ? js : []);
        } catch {
            setDist([]);
        }
        setOpen(true);
    };

    const avg = useMemo(() => {
        if (!dist.length) return 0;
        return Math.round(10 * dist.reduce((a,b)=>a+Number(b.grade||0),0) / dist.length) / 10;
    }, [dist]);

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
            <Text style={styles.title}>My Grades</Text>

            {grades.length === 0 ? (
                <Text style={{ color: theme.colors.textMuted, textAlign:'center' }}>No grades yet.</Text>
            ) : (
                <FlatList
                    data={grades}
                    keyExtractor={(i)=>String(i.id)}
                    contentContainerStyle={{ paddingBottom: 16 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={()=>openLesson(item)}>
                            <View style={{ flex:1 }}>
                                <Text style={styles.rowTitle}>{item.lesson_title}</Text>
                                <Text style={styles.rowSub}>{item.date} {item.time} • {item.teacher_name}</Text>
                                {item.comment ? <Text style={styles.rowCmt} numberOfLines={2}>{item.comment}</Text> : null}
                            </View>
                            <View style={styles.badge}><Text style={styles.badgeTxt}>{Number(item.grade).toFixed(0)}</Text></View>
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* Modal avec graphique */}
            <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
                <View style={styles.overlay}>
                    <View style={styles.sheet}>
                        {selected && (
                            <>
                                <Text style={styles.sheetTitle}>{selected.lesson_title}</Text>
                                <Text style={styles.sheetSub}>Your grade: <Text style={{ color: theme.colors.success, fontWeight:'800' }}>{Number(selected.grade).toFixed(1)}</Text></Text>
                                <Text style={[styles.sheetSub, { marginBottom: 8 }]}>Class average: <Text style={{ color: '#60A5FA', fontWeight:'800' }}>{avg.toFixed(1)}</Text></Text>

                                <ScrollView style={{ maxHeight: 280 }}>
                                    {/* Mini bar chart sans lib: chaque barre =  max 100% largeur */}
                                    {dist.map((s, idx) => {
                                        const w = Math.max(4, Math.min(100, Number(s.grade || 0)));
                                        const mine = s.full_name === selected.full_name; // peut être indispo, on ne colore pas spécialement
                                        return (
                                            <View key={idx} style={{ marginBottom: 8 }}>
                                                <Text style={{ color: theme.colors.text, marginBottom: 4 }} numberOfLines={1}>
                                                    {s.full_name} — {Number(s.grade).toFixed(0)}
                                                </Text>
                                                <View style={{ height: 10, backgroundColor: theme.colors.surface, borderRadius: 999, overflow:'hidden', borderWidth:1, borderColor: theme.colors.border }}>
                                                    <View style={{ width: `${w}%`, height: '100%', backgroundColor: '#3B82F6' }} />
                                                </View>
                                            </View>
                                        );
                                    })}
                                </ScrollView>

                                <TouchableOpacity style={styles.closeBtn} onPress={()=>setOpen(false)}><Text style={styles.closeTxt}>Close</Text></TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    safe:{ flex:1, backgroundColor: theme.colors.bg, padding:16 },
    title:{ color: theme.colors.text, fontSize:20, fontWeight:'800', textAlign:'center', marginBottom:16 },
    row:{
        backgroundColor: theme.colors.card, borderWidth:1, borderColor: theme.colors.border, borderRadius:16,
        padding:12, marginBottom:10, flexDirection:'row', alignItems:'center', gap:12
    },
    rowTitle:{ color: theme.colors.text, fontWeight:'700' },
    rowSub:{ color: theme.colors.textMuted, marginTop:2 },
    rowCmt:{ color: theme.colors.text, marginTop:6 },
    badge:{ backgroundColor: theme.colors.surface, borderWidth:1, borderColor: theme.colors.border, paddingHorizontal:10, paddingVertical:6, borderRadius:10 },
    badgeTxt:{ color: theme.colors.text, fontWeight:'800' },

    overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center', padding:16 },
    sheet:{ backgroundColor: theme.colors.card, borderWidth:1, borderColor: theme.colors.border, borderRadius:16, padding:16, width:'92%', maxHeight:'85%' },
    sheetTitle:{ color: theme.colors.text, fontWeight:'800', fontSize:18 },
    sheetSub:{ color: theme.colors.textMuted, marginTop:6 },
    closeBtn:{ alignSelf:'flex-end', paddingHorizontal:12, paddingVertical:10, borderRadius:10, borderWidth:1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop:8 },
    closeTxt:{ color: theme.colors.text, fontWeight:'700' },
});
