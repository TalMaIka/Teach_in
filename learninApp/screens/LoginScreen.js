import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

/** Theme (assorti à App/Admin/Lesson) */
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

function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Helper({ children, tone = 'muted' }) {
  return (
    <Text style={[styles.helper, { color: tone === 'error' ? '#FCA5A5' : theme.colors.textMuted }]}>{children}</Text>
  );
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

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const validate = () => {
    const next = { email: '', password: '' };
    if (!email.trim()) next.email = 'Email is required';
    else if (!isEmail(email)) next.email = 'Invalid email';
    if (!password) next.password = 'Password is required';
    setErrors(next);
    return !next.email && !next.password;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const res = await fetch('http://10.0.2.2:3001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res.ok) {
        const data = await res.json();
        // On laisse l'accueil afficher la bannière bienvenue
        setEmail('');
        setPassword('');
        onLoginSuccess?.(data.user);
      } else {
        const errorText = await res.text();
        setErrors((e) => ({ ...e, password: errorText || 'Login failed' }));
      }
    } catch (err) {
      setErrors((e) => ({ ...e, password: 'Network error, try again later' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>

        <Label>Email</Label>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={email}
          onChangeText={(t) => { setEmail(t); if (errors.email) setErrors((e) => ({ ...e, email: '' })); }}
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
            onChangeText={(t) => { setPassword(t); if (errors.password) setErrors((e) => ({ ...e, password: '' })); }}
            secureTextEntry={!showPwd}
            placeholder="••••••••"
            placeholderTextColor={theme.colors.textMuted}
          />
          <TouchableOpacity onPress={() => setShowPwd((s) => !s)} style={styles.eyeBtn}>
            <Text style={styles.eyeTxt}>{showPwd ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
        {!!errors.password && <Helper tone="error">{errors.password}</Helper>}

        <PrimaryButton
          title={loading ? 'Logging in…' : 'Login'}
          onPress={handleLogin}
          disabled={loading || !email || !password}
          loading={loading}
        />

        <TouchableOpacity activeOpacity={0.8} style={{ alignSelf: 'center', marginTop: 12 }}>
          <Text style={{ color: theme.colors.textMuted }}>Forgot password?</Text>
        </TouchableOpacity>
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