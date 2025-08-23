import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

/** Theme local (assorti à App.js) */
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
    warn: '#F59E0B',
  },
  radius: 16,
  gap: 16,
};

function Stat({ label, value, tone = 'default' }) {
  const toneBg = {
    default: theme.colors.card,
    primary: theme.colors.surface,
    success: theme.colors.surface,
    warn: theme.colors.surface,
  }[tone] || theme.colors.card;
  const toneValue = {
    default: theme.colors.text,
    primary: theme.colors.primary,
    success: theme.colors.success,
    warn: theme.colors.warn,
  }[tone] || theme.colors.text;
  return (
      <View style={[styles.stat, { backgroundColor: toneBg }]}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color: toneValue }]}>{value}</Text>
      </View>
  );
}

function Card({ children, style }) {
  return (
      <View style={[styles.card, style]}>
        {children}
      </View>
  );
}

function Chip({ label }) {
  return (
      <View style={styles.chip}><Text style={styles.chipText}>{label}</Text></View>
  );
}

function Row({ children }) {
  return <View style={styles.row}>{children}</View>;
}

export default function AdminScreen({ adminId }) {
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyDelete, setBusyDelete] = useState(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchUsers(), fetchAllTickets()]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://10.0.2.2:3001/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAllTickets = async () => {
    try {
      const response = await fetch('http://10.0.2.2:3001/admin/tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const deleteUser = async (userId) => {
    try {
      setBusyDelete(userId);
      const response = await fetch(`http://10.0.2.2:3001/admin/users/${userId}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchUsers();
      }
    } catch (error) {
      console.error('Failed to delete user');
    } finally {
      setBusyDelete(null);
    }
  };

  const filteredUsers = useMemo(() => (
      userRoleFilter ? users.filter(u => u.role === userRoleFilter) : users
  ), [users, userRoleFilter]);

  const filteredTickets = useMemo(() => (
      ticketStatusFilter ? tickets.filter(t => {
        if (ticketStatusFilter === 'pending') return !t.response;
        if (ticketStatusFilter === 'answered') return !!t.response;
        return true;
      }) : tickets
  ), [tickets, ticketStatusFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const students = users.filter(u => u.role === 'student').length;
    const teachers = users.filter(u => u.role === 'teacher').length;
    const admins = users.filter(u => u.role === 'admin').length;
    const totalTickets = tickets.length;
    const pending = tickets.filter(t => !t.response).length;
    const answered = totalTickets - pending;
    return { total, students, teachers, admins, totalTickets, pending, answered };
  }, [users, tickets]);

  if (loading) {
    return (
        <View style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ color: theme.colors.textMuted, marginTop: 12 }}>Chargement du tableau de bord…</Text>
        </View>
    );
  }

  return (
      <ScrollView style={styles.safe} contentContainerStyle={{ padding: theme.gap }}>
        <Text style={styles.title}>Admin Panel</Text>

        {/* Stats */}
        <Row>
          <Stat label="Utilisateurs" value={stats.total} tone="primary" />
          <Stat label="Tickets" value={stats.totalTickets} tone="primary" />
        </Row>
        <Row>
          <Stat label="Students" value={stats.students} tone="default" />
          <Stat label="Teachers" value={stats.teachers} tone="default" />
        </Row>
        <Row>
          <Stat label="Admins" value={stats.admins} tone="default" />
          <Stat label="En attente" value={stats.pending} tone="warn" />
        </Row>
        <Row>
          <Stat label="Répondus" value={stats.answered} tone="success" />
          <View style={{ flex: 1 }} />
        </Row>

        {/* Users Card */}
        <Card style={{ marginTop: theme.gap }}>
          <Text style={styles.cardTitle}>Utilisateurs</Text>
          <Text style={styles.cardHint}>Filtrer par rôle</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={userRoleFilter} onValueChange={setUserRoleFilter} dropdownIconColor={theme.colors.text} style={styles.picker}>
              <Picker.Item label="All Roles" value="" color="#fff" />
              <Picker.Item label="Student" value="student" color="#fff" />
              <Picker.Item label="Teacher" value="teacher" color="#fff" />
              <Picker.Item label="Admin" value="admin" color="#fff" />
            </Picker>
          </View>

          {filteredUsers.length === 0 ? (
              <Text style={styles.empty}>Aucun utilisateur</Text>
          ) : (
              filteredUsers.slice(0, 10).map((user) => (
                  <View key={user.id} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{user.full_name}</Text>
                      <Text style={styles.itemSub}>{user.email}</Text>
                      <View style={{ marginTop: 8 }}>
                        <Chip label={user.role} />
                      </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => deleteUser(user.id)}
                        disabled={busyDelete === user.id}
                        style={[styles.dangerBtn, busyDelete === user.id && { opacity: 0.6 }]}
                        activeOpacity={0.8}
                    >
                      <Text style={styles.dangerBtnText}>{busyDelete === user.id ? '...' : 'Delete'}</Text>
                    </TouchableOpacity>
                  </View>
              ))
          )}
        </Card>

        {/* Tickets Card */}
        <Card style={{ marginTop: theme.gap }}>
          <Text style={styles.cardTitle}>Tickets récents</Text>
          <Text style={styles.cardHint}>Filtrer par statut</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={ticketStatusFilter} onValueChange={setTicketStatusFilter} dropdownIconColor={theme.colors.text} style={styles.picker}>
              <Picker.Item label="All Statuses" value="" color="#fff" />
              <Picker.Item label="Pending" value="pending" color="#fff" />
              <Picker.Item label="Answered" value="answered" color="#fff" />
            </Picker>
          </View>

          {filteredTickets.length === 0 ? (
              <Text style={styles.empty}>Aucun ticket</Text>
          ) : (
              filteredTickets.slice(0, 10).map((t) => (
                  <View key={t.id} style={styles.ticketRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{t.subject || 'Ticket'}</Text>
                      <Text style={styles.itemSub}>{t.student_name} → {t.teacher_name}</Text>
                    </View>
                    <Chip label={t.response ? 'Answered' : 'Pending'} />
                  </View>
              ))
          )}
        </Card>

        <View style={{ height: 48 }} />
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: theme.gap,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: theme.gap,
    marginBottom: theme.gap,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 16,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: theme.gap,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: theme.gap,
    backgroundColor: theme.colors.surface,
  },
  picker: {
    color: theme.colors.text,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: 14,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: 14,
  },
  itemTitle: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  itemSub: {
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  empty: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipText: {
    color: theme.colors.text,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  dangerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.colors.danger,
    borderRadius: 12,
  },
  dangerBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
