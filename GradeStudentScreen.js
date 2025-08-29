import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, RefreshControl
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

  // Selected lesson + anonymized stats
  const [selected, setSelected] = useState(null); // full row of student's grade
  const [stats, setStats] = useState({ my_grade: null, class_avg: 0, class_count: 0, my_rank: null });

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
      const r = await fetch(`${baseURL}/lessons/${row.lesson_id}/grade-stats?student_id=${studentId}`);
      if (!r.ok) throw new Error(await r.text());
      const js = await r.json();
      setStats({
        my_grade: js.my_grade ?? (row.grade != null ? Number(row.grade) : null),
        class_avg: Number(js.class_avg || 0),
        class_count: Number(js.class_count || 0),
        my_rank: js.my_rank ?? null,
      });
    } catch (e) {
      setStats({
        my_grade: row.grade != null ? Number(row.grade) : null,
        class_avg: 0,
        class_count: 0,
        my_rank: null,
      });
    }
    setOpen(true);
  };

  // clamp helper
  const clampPct = (n) => {
    const v = Number.isFinite(n) ? n : 0;
    return Math.max(0, Math.min(100, v));
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

      {/* Modal — anonymized stats + progress bar */}
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
                      {stats.my_grade != null ? Number(stats.my_grade).toFixed(1) : '-'}
                    </Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statLabel}>Class avg</Text>
                    <Text style={styles.statValue}>
                      {Number(stats.class_avg).toFixed(1)}
                    </Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statLabel}>Rank</Text>
                    <Text style={styles.statValue}>
                      {stats.my_rank ? `${stats.my_rank}/${stats.class_count}` : '-'}
                    </Text>
                  </View>
                </View>

                {/* Progress bar: green fill = your grade (0..100), red marker = class average */}
                <View style={styles.progressWrap} accessible accessibilityLabel="Your grade vs class average">
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${clampPct(stats.my_grade)}%` }
                      ]}
                    />
                    <View
                      style={[
                        styles.avgMarker,
                        { left: `${clampPct(stats.class_avg)}%` }
                      ]}
                    />
                  </View>
                  <View style={styles.progressScale}>
                    <Text style={styles.progressTick}>0</Text>
                    <Text style={styles.progressTick}>100</Text>
                  </View>
                  <Text style={styles.progressLegend}>
                    <Text style={{ color: theme.colors.success, fontWeight:'800' }}>Green</Text> = your grade • <Text style={{ color: '#EF4444', fontWeight:'800' }}>Red line</Text> = class average
                  </Text>
                </View>

                <Text style={styles.sheetSub}>
                  Class details are hidden for privacy.
                </Text>

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
  sheetSub:{ color: theme.colors.textMuted, marginTop:10 },

  statsRow:{ flexDirection:'row', gap:8, marginTop:8, marginBottom:12 },
  statPill:{
    flex:1,
    backgroundColor: theme.colors.surface,
    borderWidth:1, borderColor: theme.colors.border,
    borderRadius:999, paddingVertical:8, paddingHorizontal:12,
    alignItems:'center'
  },
  statLabel:{ color: theme.colors.textMuted, fontSize:12 },
  statValue:{ color: theme.colors.text, fontWeight:'800', fontSize:16 },

  /* Progress bar styles */
  progressWrap:{ marginTop:8, marginBottom:8 },
  progressTrack:{
    position:'relative',
    height:14,
    borderRadius:999,
    backgroundColor: theme.colors.surface,
    borderWidth:1,
    borderColor: theme.colors.border,
    overflow:'hidden'
  },
  progressFill:{
    position:'absolute',
    left:0,
    top:0,
    bottom:0,
    backgroundColor: theme.colors.success,
    borderTopLeftRadius:999,
    borderBottomLeftRadius:999,
  },
  avgMarker:{
    position:'absolute',
    top:-3,
    width:2,
    height:20,
    backgroundColor:'#EF4444',
    transform:[{ translateX:-1 }], 
  },
  progressScale:{
    flexDirection:'row',
    justifyContent:'space-between',
    marginTop:6,
  },
  progressTick:{ color: theme.colors.textMuted, fontSize:12 },
  progressLegend:{ color: theme.colors.textMuted, marginTop:6, fontSize:12 },

  closeBtn:{ alignSelf:'flex-end', paddingHorizontal:12, paddingVertical:10, borderRadius:10, borderWidth:1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop:8 },
  closeTxt:{ color: theme.colors.text, fontWeight:'700' },
});
