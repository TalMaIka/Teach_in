// screens/TicketListScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  Button,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';

// ---- THEME (assorti à l'app) ----
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
    warn: '#F59E0B',
    danger: '#DC2626',
  },
  radius: 16,
  gap: 16,
};

/* ========= ThemedSelect =========
   Sélecteur custom avec modal sombre, pour remplacer Picker natif */
function ThemedSelect({
                        label = 'Select',
                        value,
                        onChange,
                        options, // [{label, value}]
                        placeholder = 'All',
                      }) {
  const [open, setOpen] = useState(false);

  const display = (() => {
    const found = options.find(o => o.value === value);
    return found ? found.label : placeholder;
  })();

  return (
      <View style={styles.selectContainer}>
        <Text style={styles.selectLabel}>{label}</Text>
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setOpen(true)}
            style={styles.selectTrigger}
        >
          <Text style={styles.selectValue}>{display}</Text>
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

              <ScrollView style={{ maxHeight: 360 }}>
                {/* Option "All" */}
                <TouchableOpacity
                    onPress={() => { onChange(''); setOpen(false); }}
                    style={styles.optionRow}
                    activeOpacity={0.85}
                >
                  <Text style={styles.optionText}>{placeholder}</Text>
                </TouchableOpacity>

                {options.map(opt => (
                    <TouchableOpacity
                        key={String(opt.value)}
                        onPress={() => { onChange(opt.value); setOpen(false); }}
                        style={[
                          styles.optionRow,
                          value === opt.value && { backgroundColor: '#0f1b33' },
                        ]}
                        activeOpacity={0.85}
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

export default function TicketListScreen({ teacherId, studentId, userRole }) {
  const [tickets, setTickets] = useState([]);
  const [responseTexts, setResponseTexts] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImageUri, setModalImageUri] = useState(null);

  // Filtres (remplacent les Pickers natifs)
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherList, setTeacherList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentList, setStudentList] = useState([]);

  const isStudent = userRole === 'student';
  const isTeacher = userRole === 'teacher';
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        let url;
        if (isStudent) url = `http://10.0.2.2:3001/tickets/student/${studentId}`;
        else if (isTeacher) url = `http://10.0.2.2:3001/tickets/teacher/${teacherId}`;
        else if (isAdmin) url = `http://10.0.2.2:3001/admin/tickets`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();
        setTickets(data);

        if (isStudent) {
          const teachers = Array.from(
              new Map(data.map(t => [t.teacher_id, { id: t.teacher_id, name: t.teacher_name }])).values()
          );
          setTeacherList(teachers);
        }
        if (isTeacher) {
          const students = Array.from(
              new Map(data.map(t => [t.student_id, { id: t.student_id, name: t.student_name }])).values()
          );
          setStudentList(students);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        Alert.alert('Error', 'Could not load tickets: ' + err.message);
      }
    };

    if ((isStudent && studentId) || (isTeacher && teacherId) || isAdmin) {
      fetchTickets();
    }
  }, [teacherId, studentId, userRole]);

  const handleResponse = async (ticketId) => {
    const responseText = (responseTexts[ticketId] || '').trim();
    if (!responseText) {
      Alert.alert('Error', 'Please enter a response');
      return;
    }

    try {
      const res = await fetch(`http://10.0.2.2:3001/tickets/${ticketId}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: responseText }),
      });

      if (res.ok) {
        Alert.alert('Success', 'Response sent successfully');
        setTickets(prev =>
            prev.map(t =>
                t.id === ticketId ? { ...t, response: responseText, responded_at: new Date().toISOString() } : t
            )
        );
        setResponseTexts(prev => ({ ...prev, [ticketId]: '' }));
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

  const getTitle = () => {
    if (isStudent) return 'My Tickets';
    if (isTeacher) return 'Tickets Received';
    if (isAdmin) return 'All Tickets';
    return 'Tickets';
  };

  const getEmptyMessage = () => {
    if (isStudent) return "You haven't sent any tickets yet.";
    if (isTeacher) return 'No tickets received yet.';
    if (isAdmin) return 'No tickets in the system yet.';
    return 'No tickets found.';
  };

  // --- Filters (avec notre ThemedSelect) ---
  const filteredByTeacher = isStudent && selectedTeacher
      ? tickets.filter(t => t.teacher_id === selectedTeacher)
      : tickets;

  const filteredTickets = isTeacher && selectedStudent
      ? filteredByTeacher.filter(t => t.student_id === selectedStudent)
      : filteredByTeacher;

  const renderItem = ({ item }) => (
      <View style={styles.ticket}>
        <Text style={styles.subject}>{item.subject}</Text>

        {isStudent && (
            <>
              <Text style={styles.info}>To: {item.teacher_name}</Text>
              <Text style={styles.info}>Message: {item.message}</Text>
              <Text style={[styles.status, { color: item.response ? theme.colors.success : theme.colors.warn }]}>
                Status: {item.response ? 'Answered' : 'Pending'}
              </Text>
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
              <Text style={styles.info}>
                From: {item.student_name} → To: {item.teacher_name}
              </Text>
              <Text style={styles.info}>Message: {item.message}</Text>
              <Text style={[styles.status, { color: item.response ? theme.colors.success : theme.colors.warn }]}>
                Status: {item.response ? 'Answered' : 'Pending'}
              </Text>
            </>
        )}

        {renderAttachment(item)}

        <Text style={styles.date}>Sent: {new Date(item.created_at).toLocaleString()}</Text>

        {item.response ? (
            <>
              <Text style={[styles.responseLabel, { color: theme.colors.primary }]}>
                {isStudent ? "Teacher's Response:" : 'Your Response:'}
              </Text>
              <Text style={styles.response}>{item.response}</Text>
              {item.responded_at && (
                  <Text style={styles.date}>Responded: {new Date(item.responded_at).toLocaleString()}</Text>
              )}
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
                        numberOfLines={3}
                    />
                    <View style={{ overflow: 'hidden', borderRadius: 10 }}>
                      <Button title="Send Response" onPress={() => handleResponse(item.id)} color={theme.colors.success} />
                    </View>
                  </>
              )}
            </>
        )}
      </View>
  );

  return (
      <View style={styles.container}>
        <Text style={styles.title}>{getTitle()}</Text>

        {/* Filtres custom foncés */}
        {isStudent && teacherList.length > 0 && (
            <ThemedSelect
                label="Filter by teacher"
                value={selectedTeacher}
                onChange={setSelectedTeacher}
                options={teacherList.map(t => ({ label: t.name, value: t.id }))}
                placeholder="All Teachers"
            />
        )}

        {isTeacher && studentList.length > 0 && (
            <ThemedSelect
                label="Filter by student"
                value={selectedStudent}
                onChange={setSelectedStudent}
                options={studentList.map(s => ({ label: s.name, value: s.id }))}
                placeholder="All Students"
            />
        )}

        {filteredTickets.length === 0 ? (
            <Text style={styles.emptyMessage}>{getEmptyMessage()}</Text>
        ) : (
            <FlatList
                data={filteredTickets}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                style={styles.list}
                contentContainerStyle={{ paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
            />
        )}

        {/* Modal image en sombre */}
        <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
              {modalImageUri && (
                  <Image source={{ uri: modalImageUri }} style={styles.modalImage} resizeMode="contain" />
              )}
            </View>
          </View>
        </Modal>
      </View>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 16 },
  title: {
    fontSize: 24, fontWeight: '800', textAlign: 'center',
    marginBottom: 16, color: theme.colors.text,
  },

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
  selectChevron: {
    width: 10, height: 10, borderRightWidth: 2, borderBottomWidth: 2,
    borderColor: theme.colors.text, transform: [{ rotate: '45deg' }],
  },
  selectModalCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: 12, width: '92%',
  },
  selectModalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
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
    padding: 15, marginBottom: 12,
    borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.border,
  },
  subject: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  info: { fontSize: 14, color: theme.colors.textMuted, marginBottom: 4 },
  status: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  date: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 8 },

  responseLabel: { fontSize: 14, fontWeight: '700', marginTop: 10, marginBottom: 5, color: theme.colors.primary },
  response: {
    fontSize: 14, color: theme.colors.text,
    backgroundColor: '#0f1b33', padding: 10, borderRadius: 8,
    marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border,
  },
  waiting: { fontSize: 14, color: theme.colors.warn, fontStyle: 'italic', marginTop: 10 },

  input: {
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 10, padding: 10,
    marginTop: 10, marginBottom: 10, minHeight: 80,
    textAlignVertical: 'top', color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },

  emptyMessage: { textAlign: 'center', fontSize: 16, color: theme.colors.textMuted, marginTop: 50 },

  attachment: {
    width: 120, height: 120, marginTop: 8,
    borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border,
  },
  attachmentContainer: { alignItems: 'center', marginBottom: 8 },
  attachmentLabel: { color: theme.colors.primary, marginTop: 4, textDecorationLine: 'underline', fontSize: 13 },

  // Modal image sombre
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 12,
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: 12, padding: 10, alignItems: 'center',
    maxWidth: '92%', maxHeight: '80%',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  modalImage: { width: 300, height: 300, borderRadius: 10, marginTop: 10 },
  closeButton: { alignSelf: 'flex-end', padding: 4, marginBottom: 4 },
  closeButtonText: { fontSize: 22, color: theme.colors.danger, fontWeight: 'bold' },

  // Overlay commun (pour les modales)
  modalOverlayCommon: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 12,
  },
});
