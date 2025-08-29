import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, RefreshControl
} from 'react-native';

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
  const [refreshing, setRefreshing] = useState(false);
  const [grades, setGrades] = useState([]);
  const [open, setOpen] = useState(false);

  // Distribution d’une leçon (liste des {student_id, full_name, grade})
  const [dist, setDist] = useState([]);
  const [selected, setSelected] = useState(null); // ligne grade sélectionnée

  const fetchGrades = useCallback(async () => {
    try {
      const res = await fetch(`${baseURL}/students/${studentId}/grades`);
      const js = await res.json();
      setGrades(Array.isArray(js) ? js : []);
    } catch {
      setGrades([]);
    }
  }, [studentId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchGrades();
      setLoading(false);
    })();
  }, [fetchGrades]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGrades();
    setRefreshing(false);
  }, [fetchGrades]);

  const openLesson = async (row) => {
    setSelected(row);
    try {
      const r = await fetch(`${baseURL}/lessons/${row.lesson_id}/grades`);
      const js = await r.json();
      // tri par note décroissante pour calcul de rang
      const arr = (Array.isArray(js) ? js : []).sort((a,b)=>Number(b.grade||0)-Number(a.grade||0));
      setDist(arr);
    } catch {
      setDist([]);
    }
    setOpen(true);
  };

  const avg = useMemo(() => {
    if (!dist.length) return 0;
    const sum = dist.reduce((a,b)=>a+Number(b.grade||0),0);
    return dist.length ? sum / dist.length : 0;
  }, [dist]);

  const myRank = useMemo(() => {
    if (!selected || !dist.length) return null;
    const idx = dist.findIndex(s => String(s.student_id) === String(selected.student_id));
    return idx >= 0 ? (idx + 1) : null; // 1-based
  }, [dist, selected]);

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          contentContainerStyle={{ paddingBottom: 16 }}
          renderItem={({ item }) => {
            const score = Number(item.grade);
            return (
              <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={()=>openLesson(item)}>
                <View style={{ flex:1 }}>
                  <Text style={styles.rowTitle}>{item.lesson_title}</Text>
                  <Text style={styles.rowSub}>
                    {(item.date || '')} {(item.time || '')} • {item.teacher_name}
                  </Text>
                  {item.comment ? <Text style={styles.rowCmt} numberOfLines={2}>{item.comment}</Text> : null}
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>
                    {Number.isFinite(score) ? score.toFixed(0) : '-'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal avec distribution */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {selected && (
              <>
                <Text style={styles.sheetTitle}>{selected.lesson_title}</Text>

                <View style={styles.statsRow}>
                  <View style={styles.statPill}>
                    <Text style={styles.statLabel}>Your grade</Text>
                    <Text style={styles.statValue}>
                      {Number(selected.grade).toFixed(1)}
                    </Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statLabel}>Class avg</Text>
                    <Text style={styles.statValue}>
                      {avg.toFixed(1)}
                    </Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statLabel}>Rank</Text>
                    <Text style={styles.statValue}>
                      {myRank ? `${myRank}/${dist.length}` : '-'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.sheetSub, { marginBottom: 8 }]}>
                  Distribution (each bar is a student)
                </Text>

                <ScrollView style={{ maxHeight: 300 }}>
                  {dist.map((s, idx) => {
                    const score = Number(s.grade || 0);
                    const widthPct = Math.max(4, Math.min(100, score)); // 0–100
                    const isMe = String(s.student_id) === String(selected.student_id);
                    return (
                      <View key={`${s.student_id}-${idx}`} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom: 4 }}>
                          <Text style={{ color: theme.colors.text }} numberOfLines={1}>
                            {s.full_name}
                          </Text>
                          <Text style={{ color: theme.colors.text }}>
                            {Number.isFinite(score) ? score.toFixed(0) : '-'}
                          </Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              { width: `${widthPct}%` },
                              isMe && { backgroundColor: theme.colors.success }
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity style={styles.closeBtn} onPress={()=>setOpen(false)}>
                  <Text style={styles.closeTxt}>Close</Text>
                </TouchableOpacity>
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
    backgroundColor: theme.colors.card,
    borderWidth:1, borderColor: theme.colors.border,
    borderRadius:16, padding:12, marginBottom:10,
    flexDirection:'row', alignItems:'center', gap:12
  },
  rowTitle:{ color: theme.colors.text, fontWeight:'700' },
  rowSub:{ color: theme.colors.textMuted, marginTop:2 },
  rowCmt:{ color: theme.colors.text, marginTop:6 },

  badge:{
    backgroundColor: theme.colors.surface,
    borderWidth:1, borderColor: theme.colors.border,
    paddingHorizontal:10, paddingVertical:6, borderRadius:10
  },
  badgeTxt:{ color: theme.colors.text, fontWeight:'800' },

  overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center', padding:16 },
  sheet:{ backgroundColor: theme.colors.card, borderWidth:1, borderColor: theme.colors.border, borderRadius:16, padding:16, width:'92%', maxHeight:'85%' },

  sheetTitle:{ color: theme.colors.text, fontWeight:'800', fontSize:18 },
  sheetSub:{ color: theme.colors.textMuted, marginTop:6 },

  statsRow:{ flexDirection:'row', gap:8, marginTop:8, marginBottom:8 },
  statPill:{
    flex:1,
    backgroundColor: theme.colors.surface,
    borderWidth:1, borderColor: theme.colors.border,
    borderRadius:999, paddingVertical:8, paddingHorizontal:12,
    alignItems:'center'
  },
  statLabel:{ color: theme.colors.textMuted, fontSize:12 },
  statValue:{ color: theme.colors.text, fontWeight:'800', fontSize:16 },

  barTrack:{
    height: 10, backgroundColor: theme.colors.surface,
    borderRadius: 999, overflow:'hidden',
    borderWidth:1, borderColor: theme.colors.border
  },
  barFill:{
    height: '100%',
    backgroundColor: '#3B82F6' // bleu; l’élève courant est en vert (success)
  },

  closeBtn:{ alignSelf:'flex-end', paddingHorizontal:12, paddingVertical:10, borderRadius:10, borderWidth:1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop:8 },
  closeTxt:{ color: theme.colors.text, fontWeight:'700' },
});
