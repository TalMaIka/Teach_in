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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

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
    warn: '#F59E0B',
    danger: '#DC2626',
    border: '#1F2937',
  },
  radius: 16,
  gap: 16,
};

function PrimaryButton({ title, onPress, tone = 'primary', disabled }) {
  const bg = tone === 'success' ? theme.colors.success : tone === 'danger' ? theme.colors.danger : theme.colors.primary;
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85} style={[styles.primaryBtn, { backgroundColor: bg }, disabled && { opacity: 0.6 }]}>
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
          const teachers = Array.from(new Map(data.map(t => [t.teacher_id, { id: t.teacher_id, name: t.teacher_name }])).values());
          setTeacherList(teachers);
        }
        if (userRole === 'teacher') {
          const students = Array.from(new Map(data.map(t => [t.student_id, { id: t.student_id, name: t.student_name }])).values());
          setStudentList(students);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        Alert.alert('Error', 'Could not load tickets: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    if ((userRole === 'student' && studentId) || (userRole === 'teacher' && teacherId) || userRole === 'admin') {
      fetchTickets();
    }
  }, [teacherId, studentId, userRole]);

  const handleResponse = async (ticketId) => {
    const responseText = responseTexts[ticketId];
    if (!responseText?.trim()) {
      Alert.alert('Error', 'Please enter a response');
      return;
    }
    try {
      const res = await fetch(`http://10.0.2.2:3001/tickets/${ticketId}/reply`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response: responseText }),
      });
      if (res.ok) {
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, response: responseText, responded_at: new Date().toISOString() } : t)));
        setResponseTexts((prev) => ({ ...prev, [ticketId]: '' }));
      } else {
        const errorText = await res.text();
        Alert.alert('Error', errorText);
      }
    } catch (error) {
      Alert.alert('Network error', 'Could not send response');
      console.error('Response error:', error);
    }
  };

  const showAttachmentModal = (filename) => {
    setModalImageUri(`http://10.0.2.2:3001/uploads/${filename}`);
    setModalVisible(true);
  };

  const filteredByTeacher = userRole === 'student' && selectedTeacher ? tickets.filter((t) => t.teacher_id === selectedTeacher) : tickets;
  const filteredTickets = userRole === 'teacher' && selectedStudent ? filteredByTeacher.filter((t) => t.student_id === selectedStudent) : filteredByTeacher;

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
                  onChangeText={(text) => setResponseTexts((prev) => ({ ...prev, [item.id]: text }))}
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

      {userRole === 'student' && teacherList.length > 0 && (
        <View style={styles.pickerContainer}>
          <Picker selectedValue={selectedTeacher} onValueChange={setSelectedTeacher} dropdownIconColor={theme.colors.text} style={styles.picker}>
            <Picker.Item label="All Teachers" value="" color="#fff" />
            {teacherList.map((teacher) => (
              <Picker.Item key={teacher.id} label={teacher.name} value={teacher.id} color="#fff" />
            ))}
          </Picker>
        </View>
      )}

      {userRole === 'teacher' && studentList.length > 0 && (
        <View style={styles.pickerContainer}>
          <Picker selectedValue={selectedStudent} onValueChange={setSelectedStudent} dropdownIconColor={theme.colors.text} style={styles.picker}>
            <Picker.Item label="All Students" value="" color="#fff" />
            {studentList.map((student) => (
              <Picker.Item key={student.id} label={student.name} value={student.id} color="#fff" />
            ))}
          </Picker>
        </View>
      )}

      {filteredTickets.length === 0 ? (
        <Text style={styles.emptyMessage}>
          {userRole === 'student' ? "You haven't sent any tickets yet." : userRole === 'teacher' ? 'No tickets received yet.' : 'No tickets in the system yet.'}
        </Text>
      ) : (
        <FlatList data={filteredTickets} keyExtractor={(item) => String(item.id)} renderItem={renderItem} style={styles.list} />
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

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 16, backgroundColor: theme.colors.bg },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16, color: theme.colors.text },
  pickerContainer: {
    marginBottom: 10,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  picker: { width: '100%', color: theme.colors.text },
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  emptyMessage: { textAlign: 'center', fontSize: 16, color: theme.colors.textMuted, marginTop: 50 },
  attachment: { width: 120, height: 120, marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  attachmentContainer: { alignItems: 'center', marginBottom: 8 },
  attachmentLabel: { color: '#60A5FA', marginTop: 4, textDecorationLine: 'underline', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: theme.colors.card, borderRadius: 12, padding: 10, alignItems: 'center', maxWidth: '94%', maxHeight: '80%', borderWidth: 1, borderColor: theme.colors.border },
  modalImage: { width: 320, height: 320, borderRadius: 10, marginTop: 10 },
  closeButton: { alignSelf: 'flex-end', padding: 4, marginBottom: 4 },
  closeButtonText: { fontSize: 22, color: theme.colors.text, fontWeight: 'bold' },
  primaryBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border },
  chipTxt: { fontSize: 12 },
});
