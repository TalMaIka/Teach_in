// screens/TicketListScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

// --- THEME ---
const theme = {
  colors: {
    bg: '#0F172A',
    card: '#111827',
    surface: '#0B1220',
    text: '#F3F4F6',
    textMuted: '#9CA3AF',
    primary: '#2563EB',
    success: '#16A34A',
    warn: '#F59E0B',
    danger: '#DC2626',
    border: '#1F2937',
  },
  radius: 16,
  gap: 16,
};

// -------- ThemedSelect (remplace Picker) --------
function ThemedSelect({ label, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const currentLabel = useMemo(() => {
    const f = options.find(o => o.value === value);
    return f ? f.label : placeholder;
  }, [options, value, placeholder]);

  return (
    <View style={styles.selectContainer}>
      <Text style={styles.selectLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.selectTrigger}
        activeOpacity={0.85}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.selectValue}>{currentLabel}</Text>
        <View style={styles.selectChevron} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.selectModalCard}>
            <View style={styles.selectModalHeader}>
              <Text style={styles.selectModalTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <TouchableOpacity
                style={styles.optionRow}
                activeOpacity={0.85}
                onPress={() => { onChange(''); setOpen(false); }}
              >
                <Text style={styles.optionText}>{placeholder}</Text>
              </TouchableOpacity>

              {options.map(opt => (
                <TouchableOpacity
                  key={String(opt.value)}
                  style={[
                    styles.optionRow,
                    value === opt.value && { backgroundColor: '#0f1b33' },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => { onChange(opt.value); setOpen(false); }}
                >
                  <Text style={styles.optionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PrimaryButton({ title, onPress, tone = 'primary', disabled }) {
  const bg =
    tone === 'success'
      ? theme.colors.success
      : tone === 'danger'
      ? theme.colors.danger
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

function Chip({ label, tone = 'default' }) {
  const map = {
    default: { bg: theme.colors.surface, color: theme.colors.text },
    warn: { bg: 'rgba(245,158,11,0.15)', color: theme.colors.warn },
    success: { bg: 'rgba(22,163,74,0.15)', color: theme.colors.success },
  };
  const { bg, color } = map[tone] || map.default;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipTxt, { color }]}>{label}</Text>
    </View>
  );
}

export default function TicketListScreen({ teacherId, studentId, userRole }) {
  const [tickets, setTickets] = useState([]);
  const [responseTexts, setResponseTexts] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImageUri, setModalImageUri] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherList, setTeacherList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentList, setStudentList] = useState([]);
  const [loading, setLoading] = useState(true);

  const title = useMemo(() => {
    if (userRole === 'student') return 'My Tickets';
    if (userRole === 'teacher') return 'Tickets Received';
    if (userRole === 'admin') return 'All Tickets';
    return 'Tickets';
  }, [userRole]);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        let url;
        if (userRole === 'student') url = `http://10.0.2.2:3001/tickets/student/${studentId}`;
        else if (userRole === 'teacher') url = `http://10.0.2.2:3001/tickets/teacher/${teacherId}`;
        else if (userRole === 'admin') url = `http://10.0.2.2:3001/admin/tickets`;
        if (!url) return;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);

        if (userRole === 'student') {
          const teachers = Array.from(
            new Map(data.map(t => [t.teacher_id, { id: t.teacher_id, name: t.teacher_name }])).values()
          );
          setTeacherList(teachers);
        }
        if (userRole === 'teacher') {
          const students = Array.from(
            new Map(data.map(t => [t.student_id, { id: t.student_id, name: t.student_name }])).values()
          );
          setStudentList(students);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        Alert.alert('Error', 'Could not load tickets: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (
      (userRole === 'student' && studentId) ||
      (userRole === 'teacher' && teacherId) ||
      userRole === 'admin'
    ) {
      fetchTickets();
    }
  }, [teacherId, studentId, userRole]);

  const handleResponse = async (ticketId) => {
    const responseText = (responseTexts[ticketId] || '').trim();
    if (!responseText) return Alert.alert('Error', 'Please enter a response');

    try {
      const res = await fetch(`http://10.0.2.2:3001/tickets/${ticketId}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: responseText }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        return Alert.alert('Error', errorText || 'Failed to send');
      }
      setTickets(prev =>
        prev.map(t =>
          t.id === ticketId ? { ...t, response: responseText, responded_at: new Date().toISOString() } : t
        )
      );
      setResponseTexts(prev => ({ ...prev, [ticketId]: '' }));
    } catch (e) {
      Alert.alert('Network error', 'Could not send response');
    }
  };

  const showAttachmentModal = (filename) => {
    setModalImageUri(`http://10.0.2.2:3001/uploads/${filename}`);
    setModalVisible(true);
  };

  const filteredByTeacher =
    userRole === 'student' && selectedTeacher ? tickets.filter(t => t.teacher_id === selectedTeacher) : tickets;

  const filteredTickets =
    userRole === 'teacher' && selectedStudent
      ? filteredByTeacher.filter(t => t.student_id === selectedStudent)
      : filteredByTeacher;

  const renderAttachment = (item) => {
    if (!item.attachment) return null;
    const uri = `http://10.0.2.2:3001/uploads/${item.attachment}`;
    return (
      <TouchableOpacity onPress={() => showAttachmentModal(item.attachment)} style={styles.attachmentContainer}>
        <Image source={{ uri }} style={styles.attachment} resizeMode="cover" />
        <Text style={styles.attachmentLabel}>Tap to View Attachment</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    const isStudent = userRole === 'student';
    const isTeacher = userRole === 'teacher';
    const isAdmin = userRole === 'admin';
    const statusTone = item.response ? 'success' : 'warn';

    return (
      <View style={styles.ticket}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.subject}>{item.subject}</Text>
          <Chip label={item.response ? 'Answered' : 'Pending'} tone={statusTone} />
        </View>

        {isStudent && (
          <>
            <Text style={styles.info}>To: {item.teacher_name}</Text>
            <Text style={styles.info}>Message: {item.message}</Text>
          </>
        )}
        {isTeacher && (
          <>
            <Text style={styles.info}>From: {item.student_name}</Text>
            <Text style={styles.info}>Message: {item.message}</Text>
          </>
        )}
        {isAdmin && (
          <>
            <Text style={styles.info}>From: {item.student_name} → To: {item.teacher_name}</Text>
            <Text style={styles.info}>Message: {item.message}</Text>
          </>
        )}

        {renderAttachment(item)}

        <Text style={styles.date}>Sent: {new Date(item.created_at).toLocaleString()}</Text>

        {item.response ? (
          <>
            <Text style={styles.responseLabel}>{isStudent ? "Teacher's Response:" : 'Response:'}</Text>
            <Text style={styles.response}>{item.response}</Text>
            {item.responded_at && <Text style={styles.date}>Responded: {new Date(item.responded_at).toLocaleString()}</Text>}
          </>
        ) : (
          <>
            {isStudent && <Text style={styles.waiting}>⏳ Waiting for teacher's response...</Text>}
            {(isTeacher || isAdmin) && (
              <>
                <TextInput
                  placeholder="Write your response here..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={responseTexts[item.id] || ''}
                  onChangeText={(text) => setResponseTexts(prev => ({ ...prev, [item.id]: text }))}
                  style={styles.input}
                  multiline
                />
                <PrimaryButton title="Send Response" onPress={() => handleResponse(item.id)} tone="success" />
              </>
            )}
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.textMuted, marginTop: 12 }}>Loading tickets…</Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <Text style={styles.title}>{title}</Text>

      {/* ---- Filtres custom, plus de Picker natif ---- */}
      {userRole === 'student' && teacherList.length > 0 && (
        <ThemedSelect
          label="Filter by teacher"
          value={selectedTeacher}
          onChange={setSelectedTeacher}
          options={teacherList.map(t => ({ label: t.name, value: t.id }))}
          placeholder="All Teachers"
        />
      )}

      {userRole === 'teacher' && studentList.length > 0 && (
        <ThemedSelect
          label="Filter by student"
          value={selectedStudent}
          onChange={setSelectedStudent}
          options={studentList.map(s => ({ label: s.name, value: s.id }))}
          placeholder="All Students"
        />
      )}

      {filteredTickets.length === 0 ? (
        <Text style={styles.emptyMessage}>
          {userRole === 'student'
            ? "You haven't sent any tickets yet."
            : userRole === 'teacher'
            ? 'No tickets received yet.'
            : 'No tickets in the system yet.'}
        </Text>
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
            {modalImageUri && <Image source={{ uri: modalImageUri }} style={styles.modalImage} resizeMode="contain" />}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  safe: { flex: 1, padding: 16, backgroundColor: theme.colors.bg },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16, color: theme.colors.text },

  // ThemedSelect
  selectContainer: { marginBottom: 12 },
  selectLabel: { color: theme.colors.textMuted, marginBottom: 6, fontSize: 12 },
  selectTrigger: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectValue: { color: theme.colors.text, fontWeight: '600' },
  selectChevron: { width: 10, height: 10, borderRightWidth: 2, borderBottomWidth: 2, borderColor: theme.colors.text, transform: [{ rotate: '45deg' }] },
  selectModalCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: 12, width: '92%',
  },
  selectModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  selectModalTitle: { color: theme.colors.text, fontWeight: '800', fontSize: 16 },
  optionRow: {
    paddingVertical: 12, paddingHorizontal: 10,
    borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface, marginBottom: 8,
  },
  optionText: { color: theme.colors.text, fontWeight: '600' },

  list: { flex: 1 },

  ticket: {
    backgroundColor: theme.colors.card,
    padding: 14,
    marginBottom: 12,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  subject: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  info: { fontSize: 14, color: theme.colors.textMuted, marginTop: 4 },
  date: { fontSize: 12, color: theme.colors.textMuted, marginTop: 8 },
  responseLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.success, marginTop: 10, marginBottom: 6 },
  response: { fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surface, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border },
  waiting: { fontSize: 14, color: theme.colors.warn, fontStyle: 'italic', marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 12, padding: 12,
    marginTop: 10, marginBottom: 10, minHeight: 80,
    textAlignVertical: 'top', color: theme.colors.text, backgroundColor: theme.colors.surface,
  },
  emptyMessage: { textAlign: 'center', fontSize: 16, color: theme.colors.textMuted, marginTop: 50 },

  attachment: { width: 120, height: 120, marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  attachmentContainer: { alignItems: 'center', marginBottom: 8 },
  attachmentLabel: { color: '#60A5FA', marginTop: 4, textDecorationLine: 'underline', fontSize: 13 },

  // Modal (image)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: theme.colors.card, borderRadius: 12, padding: 10, alignItems: 'center', maxWidth: '94%', maxHeight: '80%', borderWidth: 1, borderColor: theme.colors.border },
  modalImage: { width: 320, height: 320, borderRadius: 10, marginTop: 10 },
  closeButton: { alignSelf: 'flex-end', padding: 4, marginBottom: 4 },
  closeButtonText: { fontSize: 22, color: theme.colors.text, fontWeight: 'bold' },

  // Boutons
  primaryBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },

  // Chip
  chip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border },
  chipTxt: { fontSize: 12 },
});
