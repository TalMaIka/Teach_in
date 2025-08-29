import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';

/** Theme (kept consistent with the rest of the app) */
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
    success: '#16A34A',
  },
  radius: 16,
  gap: 16,
};

function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Helper({ children, tone = 'muted' }) {
  const color =
    tone === 'error'
      ? '#FCA5A5'
      : tone === 'success'
        ? theme.colors.success
        : theme.colors.textMuted;
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
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{title}</Text>}
    </TouchableOpacity>
  );
}

/** Small, themed modal selector for role */
function RoleSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const roles = [
    { label: 'Student', value: 'student' },
    { label: 'Teacher', value: 'teacher' },
    { label: 'Admin', value: 'admin' },
  ];

  const current = roles.find(r => r.value === value)?.label || 'Select…';

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        style={[styles.input, styles.selectLike]}
      >
        <Text style={[styles.selectText, { color: value ? theme.colors.text : theme.colors.textMuted }]}>
          {current}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Choose a role</Text>
            <FlatList
              data={roles}
              keyExtractor={(i)=>i.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionRow,
                    value === item.value && { borderColor: theme.colors.primary },
                  ]}
                  onPress={() => { onChange(item.value); setOpen(false); }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.optionLabel}>{item.label}</Text>
                  {value === item.value && (
                    <View style={styles.checkDot}/>
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListFooterComponent={
                <TouchableOpacity style={styles.closeBtn} onPress={()=>setOpen(false)}>
                  <Text style={styles.closeTxt}>Close</Text>
                </TouchableOpacity>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

/**
 * RegisterScreen
 * Props:
 * - onDone?: () => void  // called after a successful registration (optional)
 */
export default function RegisterScreen({ onDone }) {
  const baseURL = 'http://10.0.2.2:3001';

  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('student');

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errors, setErrors] = useState({ fullName: '', email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // Password strength (0..5)
  const pwdScore = useMemo(() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^\w]/.test(password)) s++;
    return s;
  }, [password]);

  const pwdHint = useMemo(() => {
    return ['Very weak', 'Weak', 'Fair', 'Okay', 'Good', 'Excellent'][pwdScore] || 'Very weak';
  }, [pwdScore]);

  const validate = () => {
    const next = { fullName: '', email: '', password: '' };
    if (!fullName.trim()) next.fullName = 'Full name is required';
    if (!email.trim()) next.email = 'Email is required';
    else if (!isEmail(email)) next.email = 'Invalid email address';
    if (!password) next.password = 'Password is required';
    else if (password.length < 6) next.password = 'At least 6 characters';
    setErrors(next);
    return !next.fullName && !next.email && !next.password;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    setStatusMessage('Connecting to server...');
    try {
      const res = await fetch(`${baseURL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });

      if (res.ok) {
        setStatusMessage('Connected. Registration successful.');
        setFullName('');
        setEmail('');
        setPassword('');
        setRole('student');
        if (typeof onDone === 'function') onDone();
      } else {
        const errorText = await res.text();
        setStatusMessage('Connected. Server returned an error.');
        setErrors((e) => ({
          ...e,
          password: errorText || 'Registration failed',
        }));
      }
    } catch (err) {
      setStatusMessage('Connection failed. Please try again.');
      setErrors((e) => ({
        ...e,
        password: 'Network error, try again later',
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.title}>Register</Text>

        <Label>Full Name</Label>
        <TextInput
          style={[styles.input, errors.fullName && styles.inputError]}
          value={fullName}
          onChangeText={(t) => {
            setFullName(t);
            if (errors.fullName) setErrors((e) => ({ ...e, fullName: '' }));
          }}
          placeholder="Jane Doe"
          placeholderTextColor={theme.colors.textMuted}
        />
        {!!errors.fullName && <Helper tone="error">{errors.fullName}</Helper>}

        <Label style={{ marginTop: 12 }}>Email</Label>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (errors.email) setErrors((e) => ({ ...e, email: '' }));
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="you@example.com"
          placeholderTextColor={theme.colors.textMuted}
        />
        {!!errors.email && <Helper tone="error">{errors.email}</Helper>}

        <Label style={{ marginTop: 12 }}>Password</Label>
        <View style={styles.pwdRow}>
          <TextInput
            style={[styles.input, { flex: 1 }, errors.password && styles.inputError]}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errors.password) setErrors((e) => ({ ...e, password: '' }));
            }}
            secureTextEntry={!showPwd}
            placeholder="••••••••"
            placeholderTextColor={theme.colors.textMuted}
          />
          <TouchableOpacity onPress={() => setShowPwd((s) => !s)} style={styles.eyeBtn}>
            <Text style={styles.eyeTxt}>{showPwd ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
        {!!errors.password && <Helper tone="error">{errors.password}</Helper>}
        {!!password && !errors.password && (
          <Helper tone={pwdScore >= 3 ? 'success' : 'muted'}>
            Password strength: {pwdHint}
          </Helper>
        )}

        <Label style={{ marginTop: 12 }}>Role</Label>
        <RoleSelector value={role} onChange={setRole} />

        <PrimaryButton
          title={loading ? 'Registering…' : 'Register'}
          onPress={handleRegister}
          disabled={loading || !fullName || !email || !password}
          loading={loading}
        />

        {!!statusMessage && <Text style={styles.status}>{statusMessage}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    justifyContent: 'center',
    padding: theme.gap,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.gap,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: theme.gap,
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
  pwdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  eyeTxt: {
    color: theme.colors.text,
    fontSize: 16,
  },

  /** Themed modal selector **/
  selectLike: {
    justifyContent: 'center',
  },
  selectText: {
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.gap,
    width: '92%',
    maxHeight: '75%',
  },
  sheetTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  optionRow: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  closeBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  closeTxt: { color: theme.colors.text, fontWeight: '700' },

  /** Bottom **/
  primaryBtn: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  status: {
    marginTop: 12,
    textAlign: 'center',
    color: theme.colors.textMuted,
  },
});
