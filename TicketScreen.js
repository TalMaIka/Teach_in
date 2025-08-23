import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
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

function PrimaryButton({ title, onPress, tone = 'primary', disabled, loading, icon }) {
  const bg = tone === 'success' ? theme.colors.success : tone === 'danger' ? theme.colors.danger : theme.colors.primary;
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85} style={[styles.primaryBtn, { backgroundColor: bg }, (disabled || loading) && { opacity: 0.6 }]}>
      {loading ? <ActivityIndicator color="#fff" /> : (
        <Text style={styles.primaryBtnText}>{icon ? `${icon}  ${title}` : title}</Text>
      )}
    </TouchableOpacity>
  );
}

function Label({ children }) { return <Text style={styles.label}>{children}</Text>; }
function Helper({ children, tone = 'muted' }) {
  const color = tone === 'error' ? '#FCA5A5' : theme.colors.textMuted;
  return <Text style={[styles.helper, { color }]}>{children}</Text>;
}

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
        setTeachers(Array.isArray(data) ? data : []);
      } catch (err) {
        // on affiche une aide plutôt qu'une alerte bloquante
        setErrors((e) => ({ ...e, teacher: 'Could not load teachers. Pull to retry later.' }));
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

  const takePhoto = () => {
    launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: true }, (response) => {
      if (!response.didCancel && !response.errorCode && response.assets?.length) {
        setAttachment(response.assets[0]);
      }
    });
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
        // reset
        setTeacherId(''); setSubject(''); setMessage(''); setAttachment(null);
      } else {
        const errorText = await res.text();
        setErrors((e) => ({ ...e, message: errorText || 'Failed to send ticket' }));
      }
    } catch (err) {
      setErrors((e) => ({ ...e, message: 'Network error, try again later.' }));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.title}>Send a Ticket</Text>

        <Label>Teacher *</Label>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={teacherId} onValueChange={setTeacherId} dropdownIconColor={theme.colors.text} style={styles.picker}>
            <Picker.Item label={loading ? 'Loading…' : 'Select a teacher'} value="" color="#fff" />
            {teachers.map((t) => (
              <Picker.Item key={t.id} label={t.full_name} value={t.id} color="#fff" />
            ))}
          </Picker>
        </View>
        {!!errors.teacher && <Helper tone="error">{errors.teacher}</Helper>}

        <Label style={{ marginTop: 12 }}>Subject *</Label>
        <TextInput
          style={[styles.input, errors.subject && styles.inputError]}
          value={subject}
          onChangeText={(t) => { setSubject(t); if (errors.subject) setErrors((e) => ({ ...e, subject: '' })); }}
          placeholder="e.g. Homework question about chapter 3"
          placeholderTextColor={theme.colors.textMuted}
        />
        {!!errors.subject && <Helper tone="error">{errors.subject}</Helper>}

        <Label style={{ marginTop: 12 }}>Message *</Label>
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

        <Label style={{ marginTop: 12 }}>Attachment (optional)</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <PrimaryButton title="Pick Image" onPress={pickImage} icon="🖼️" />
          <PrimaryButton title="Take Photo" onPress={takePhoto} icon="📷" />
        </View>

        {!!attachment && (
          <View style={styles.previewRow}>
            <Image source={{ uri: attachment.uri }} style={styles.preview} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.previewName} numberOfLines={1} ellipsizeMode="tail">{attachment.fileName || 'photo.jpg'}</Text>
              <Text style={styles.previewMeta}>{Math.round((attachment.fileSize || 0) / 1024)} KB</Text>
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
        <Helper>\n* fields are required</Helper>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.gap },
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  inputError: { borderColor: '#FCA5A5' },
  helper: { fontSize: 12, marginTop: 6 },
  pickerWrap: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, overflow: 'hidden', backgroundColor: theme.colors.surface },
  picker: { color: theme.colors.text },
  primaryBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  counter: { color: theme.colors.textMuted, alignSelf: 'flex-end', marginTop: 6 },
  previewRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 12, marginBottom: 8 },
  preview: { width: 72, height: 72, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border },
  previewName: { color: theme.colors.text, fontWeight: '600' },
  previewMeta: { color: theme.colors.textMuted, marginTop: 2 },
  removeBtn: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  removeTxt: { color: theme.colors.text, fontWeight: '700' },
});
