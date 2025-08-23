import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

/** Theme (assorti à App & Admin) */
const theme = {
  colors: {
    bg: '#0F172A',
    card: '#111827',
    surface: '#0B1220',
    text: '#F3F4F6',
    textMuted: '#9CA3AF',
    primary: '#2563EB',
    border: '#1F2937',
    danger: '#DC2626',
  },
  radius: 16,
  gap: 16,
};

function FieldLabel({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

function HelperText({ children, tone = 'muted' }) {
  const color = tone === 'error' ? '#FCA5A5' : theme.colors.textMuted;
  return <Text style={[styles.helper, { color }]}>{children}</Text>;
}

function PrimaryButton({ title, onPress, disabled, loading }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.primaryBtn, (disabled || loading) && { opacity: 0.6 }]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.primaryBtnText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function LessonScreen({ teacherId, navigation }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [time, setTime] = useState(''); // HH:MM
  const [description, setDescription] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({ title: '', date: '', time: '' });

  const onDateChange = (_event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const iso = selectedDate.toISOString().split('T')[0];
      setDate(iso);
      setErrors((e) => ({ ...e, date: '' }));
    }
  };

  const onTimeChange = (_event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const h = String(selectedTime.getHours()).padStart(2, '0');
      const m = String(selectedTime.getMinutes()).padStart(2, '0');
      setTime(`${h}:${m}`);
      setErrors((e) => ({ ...e, time: '' }));
    }
  };

  const isValidTime = (t) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(t);

  const validate = () => {
    const next = { title: '', date: '', time: '' };
    if (!title.trim()) next.title = 'Title is required';
    if (!date) next.date = 'Date is required';
    if (!time) next.time = 'Time is required';
    else if (!isValidTime(time)) next.time = 'Format HH:MM (24h)';
    setErrors(next);
    return !next.title && !next.date && !next.time;
  };

  const createLesson = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const res = await fetch('http://10.0.2.2:3001/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), date, time, description: description.trim(), teacher_id: teacherId }),
      });
      if (res.ok) {
        Alert.alert('Success', 'Lesson created!');
        setTitle('');
        setDate('');
        setTime('');
        setDescription('');
        navigation?.goBack?.();
      } else {
        Alert.alert('Error', 'Failed to create lesson');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
          <Text style={styles.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create New Lesson</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.card}>
        {/* Title */}
        <FieldLabel>Title *</FieldLabel>
        <TextInput
          placeholder="Algebra — Chapter 3"
          placeholderTextColor={theme.colors.textMuted}
          value={title}
          onChangeText={(t) => { setTitle(t); if (t) setErrors((e) => ({ ...e, title: '' })); }}
          style={[styles.input, errors.title && styles.inputError]}
        />
        {!!errors.title && <HelperText tone="error">{errors.title}</HelperText>}

        {/* Date */}
        <FieldLabel style={{ marginTop: 12 }}>Date *</FieldLabel>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.85} style={[styles.input, styles.selectLike, errors.date && styles.inputError]}>
          <Text style={[styles.selectText, { color: date ? theme.colors.text : theme.colors.textMuted }]}>
            {date || 'Select date'}
          </Text>
        </TouchableOpacity>
        {!!errors.date && <HelperText tone="error">{errors.date}</HelperText>}
        {showDatePicker && (
          <DateTimePicker
            value={date ? new Date(date) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
          />
        )}

        {/* Time */}
        <FieldLabel style={{ marginTop: 12 }}>Time (HH:MM) *</FieldLabel>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            placeholder="14:30"
            placeholderTextColor={theme.colors.textMuted}
            value={time}
            onChangeText={(t) => { setTime(t); if (isValidTime(t)) setErrors((e) => ({ ...e, time: '' })); }}
            style={[styles.input, { flex: 1 }, errors.time && styles.inputError]}
            keyboardType="numeric"
            maxLength={5}
          />
          <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.pickBtn]} activeOpacity={0.85}>
            <Text style={styles.pickBtnTxt}>Pick</Text>
          </TouchableOpacity>
        </View>
        {!!errors.time && <HelperText tone="error">{errors.time}</HelperText>}
        {showTimePicker && (
          <DateTimePicker
            value={new Date()}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
            is24Hour
          />
        )}

        {/* Description */}
        <FieldLabel style={{ marginTop: 12 }}>Description</FieldLabel>
        <TextInput
          placeholder="Objectives, materials, room, etc. (optional)"
          placeholderTextColor={theme.colors.textMuted}
          value={description}
          onChangeText={setDescription}
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          multiline
        />

        {/* Submit */}
        <PrimaryButton title="Create Lesson" onPress={createLesson} disabled={!title || !date || !isValidTime(time)} loading={saving} />
        <HelperText>
          * champs obligatoires
        </HelperText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    padding: theme.gap,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.gap,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  backTxt: {
    color: theme.colors.text,
    fontSize: 18,
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.gap,
  },
  label: {
    color: theme.colors.text,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  inputError: {
    borderColor: '#FCA5A5',
  },
  helper: {
    fontSize: 12,
    marginTop: 6,
  },
  selectLike: {
    justifyContent: 'center',
  },
  selectText: {
    fontSize: 16,
  },
  pickBtn: {
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primary,
  },
  pickBtnTxt: {
    color: '#fff',
    fontWeight: '700',
  },
  primaryBtn: {
    marginTop: 18,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
