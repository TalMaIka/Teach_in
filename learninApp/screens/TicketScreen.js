// screens/TicketScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  FlatList,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const theme = {
  colors: {
    bg: '#0F172A',
    card: '#111827',
    surface: '#0B1220',
    text: '#F3F4F6',
    textMuted: '#9CA3AF',
    primary: '#2563EB',
    success: '#16A34A',
    danger: '#DC2626',
    border: '#1F2937',
  },
  radius: 16,
  gap: 16,
};

// ---------------- Reusable UI ----------------
function PrimaryButton({ title, onPress, tone = 'primary', disabled, loading, icon }) {
  const bg =
    tone === 'success' ? theme.colors.success
      : tone === 'danger' ? theme.colors.danger
        : theme.colors.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.primaryBtn, { backgroundColor: bg }, (disabled || loading) && { opacity: 0.6 }]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : (
        <Text style={styles.primaryBtnText}>{icon ? `${icon}  ${title}` : title}</Text>
      )}
    </TouchableOpacity>
  );
}

function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}
function Helper({ children, tone = 'muted' }) {
  const color = tone === 'error' ? '#FCA5A5' : theme.colors.textMuted;
  return <Text style={[styles.helper, { color }]}>{children}</Text>;
}

// --------------- ThemedSelect (Modal) ---------------
function ThemedSelect({ value, onChange, options, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen(true)} style={styles.selectTrigger}>
        <Text style={[styles.selectText, { color: selected ? theme.colors.text : theme.colors.textMuted }]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={styles.selectChevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{placeholder}</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionRow,
                    value === item.value && { backgroundColor: '#0F2A5A44', borderColor: '#3B82F6' },
                  ]}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No options</Text>}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setOpen(false)} activeOpacity={0.85}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ---------------- Screen ----------------
export default function TicketScreen({ studentId }) {
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState({ teacher: '', subject: '', message: '' });

  const remaining = useMemo(() => 500 - message.length, [message]);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        const res = await fetch('http://10.0.2.2:3001/teachers');
        const data = await res.json();
        setTeachers(
          Array.isArray(data)
            ? data.map((t) => ({ label: t.full_name, value: t.id }))
            : []
        );
      } catch (err) {
        setErrors((e) => ({ ...e, teacher: 'Could not load teachers. Try again later.' }));
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, []);

  const validate = () => {
    const next = { teacher: '', subject: '', message: '' };
    if (!teacherId) next.teacher = 'Please select a teacher';
    if (!subject.trim()) next.subject = 'Subject is required';
    if (!message.trim()) next.message = 'Message is required';
    setErrors(next);
    return !next.teacher && !next.subject && !next.message;
  };

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 }, (response) => {
      if (!response.didCancel && !response.errorCode && response.assets?.length) {
        setAttachment(response.assets[0]);
      }
    });
  };

  // ---- Permissions + Camera ----
  async function ensureCameraPermissions() {
    if (Platform.OS !== 'android') return true;
    try {
      const cam = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);

      // Android 13+ : READ_MEDIA_IMAGES ; avant 13 : WRITE_EXTERNAL_STORAGE (si saveToPhotos true)
      const sdkInt = Number(Platform.Version); // API level
      let mediaPerm;
      if (sdkInt >= 33) {
        mediaPerm = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        );
      } else {
        mediaPerm = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
      }
      return cam === PermissionsAndroid.RESULTS.GRANTED &&
        mediaPerm === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  const takePhoto = async () => {
    const ok = await ensureCameraPermissions();
    if (!ok) {
      Alert.alert('Permission', 'Camera or media permission denied.');
      return;
    }
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
        cameraType: 'back',
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Camera error', response.errorMessage || response.errorCode);
          return;
        }
        if (response.assets?.length) {
          setAttachment(response.assets[0]);
        }
      }
    );
  };

  const sendTicket = async () => {
    if (!validate()) return;

    const formData = new FormData();
    formData.append('student_id', String(studentId));
    formData.append('teacher_id', String(teacherId));
    formData.append('subject', subject.trim());
    formData.append('message', message.trim());
    if (attachment) {
      formData.append('attachment', {
        uri: attachment.uri,
        type: attachment.type || 'image/jpeg',
        name: attachment.fileName || 'photo.jpg',
      });
    }

    try {
      setSending(true);
      const res = await fetch('http://10.0.2.2:3001/tickets', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.ok) {
        setTeacherId('');
        setSubject('');
        setMessage('');
        setAttachment(null);
      } else {
        const errorText = await res.text();
        setErrors((e) => ({ ...e, message: errorText || 'Failed to send ticket' }));
      }
    } catch {
      setErrors((e) => ({ ...e, message: 'Network error, try again later.' }));
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView style={styles.safe} contentContainerStyle={{ padding: theme.gap }}>
      <View style={styles.card}>
        <Text style={styles.title}>Send a Ticket</Text>

        <Label>Teacher *</Label>
        <ThemedSelect
          value={teacherId}
          onChange={setTeacherId}
          options={teachers}
          placeholder={loading ? 'Loading…' : 'Select a teacher'}
        />
        {!!errors.teacher && <Helper tone="error">{errors.teacher}</Helper>}

        <Label>Subject *</Label>
        <TextInput
          style={[styles.input, errors.subject && styles.inputError]}
          value={subject}
          onChangeText={(t) => { setSubject(t); if (errors.subject) setErrors((e) => ({ ...e, subject: '' })); }}
          placeholder="e.g. Homework question about chapter 3"
          placeholderTextColor={theme.colors.textMuted}
        />
        {!!errors.subject && <Helper tone="error">{errors.subject}</Helper>}

        <Label>Message *</Label>
        <TextInput
          style={[styles.input, styles.textArea, errors.message && styles.inputError]}
          value={message}
          onChangeText={(t) => { setMessage(t); if (errors.message) setErrors((e) => ({ ...e, message: '' })); }}
          multiline
          placeholder="Describe your issue or question (max 500 chars)"
          placeholderTextColor={theme.colors.textMuted}
          maxLength={500}
        />
        <Text style={styles.counter}>{remaining} characters left</Text>
        {!!errors.message && <Helper tone="error">{errors.message}</Helper>}

        <Label>Attachment (optional)</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <PrimaryButton title="Pick Image" onPress={pickImage} icon="🖼️" />
          <PrimaryButton title="Take Photo" onPress={takePhoto} icon="📷" />
        </View>

        {!!attachment && (
          <View style={styles.previewRow}>
            <Image source={{ uri: attachment.uri }} style={styles.preview} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.previewName} numberOfLines={1} ellipsizeMode="tail">
                {attachment.fileName || 'photo.jpg'}
              </Text>
              <Text style={styles.previewMeta}>
                {Math.round((attachment.fileSize || 0) / 1024)} KB
              </Text>
              <TouchableOpacity onPress={() => setAttachment(null)} style={styles.removeBtn}>
                <Text style={styles.removeTxt}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <PrimaryButton
          title={sending ? 'Sending…' : 'Send Ticket'}
          onPress={sendTicket}
          disabled={sending || !teacherId || !subject.trim() || !message.trim()}
          loading={sending}
        />
        <Helper>* fields are required</Helper>
      </View>
    </ScrollView>
  );
}

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.gap,
  },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: theme.gap },
  label: { color: theme.colors.text, fontSize: 14, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    color: theme.colors.text, backgroundColor: theme.colors.surface,
    marginBottom: theme.gap,
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  inputError: { borderColor: '#FCA5A5' },
  helper: { fontSize: 12, marginTop: 6 },
  primaryBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  counter: { color: theme.colors.textMuted, alignSelf: 'flex-end', marginTop: 6 },
  previewRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 12, marginBottom: 8 },
  preview: { width: 72, height: 72, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border },
  previewName: { color: theme.colors.text, fontWeight: '600' },
  previewMeta: { color: theme.colors.textMuted, marginTop: 2 },
  removeBtn: {
    marginTop: 6, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  removeTxt: { color: theme.colors.text, fontWeight: '700' },

  // ThemedSelect
  selectTrigger: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12,
    backgroundColor: theme.colors.surface, paddingHorizontal: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: theme.gap,
  },
  selectText: { color: theme.colors.text, fontSize: 14 },
  selectChevron: { color: theme.colors.textMuted, marginLeft: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalSheet: {
    backgroundColor: theme.colors.card, borderRadius: theme.radius,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: theme.gap, width: '92%', maxHeight: '80%',
  },
  modalTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  optionRow: {
    paddingVertical: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10,
    marginBottom: 8, backgroundColor: theme.colors.surface,
  },
  optionText: { color: theme.colors.text },
  modalClose: {
    marginTop: 8, alignSelf: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modalCloseText: { color: theme.colors.text, fontWeight: '700' },

  empty: { color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 12 },
});