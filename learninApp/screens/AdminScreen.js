import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
// import { Picker } from '@react-native-picker/picker'  // ← plus utilisé

/** Theme (aligné sur App.js) */
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

/* ---------- Small UI helpers ---------- */
function Row({ children, style }) {
  return <View style={[styles.row, style]}>{children}</View>;
}
function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
function Chip({ label }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}
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

/* ---------- ThemedSelect (remplace Picker) ---------- */
function ThemedSelect({ value, onChange, options, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setOpen(true)}
        style={styles.selectTrigger}
      >
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

/* ===================== AdminScreen ===================== */
export default function AdminScreen({ adminId }) {
  const [tab, setTab] = useState('dashboard'); // 'dashboard' | 'users' | 'tickets'
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyDelete, setBusyDelete] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        await Promise.all([fetchUsers(), fetchAllTickets()]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
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
      if (response.ok) await fetchUsers();
    } catch (error) {
      console.error('Failed to delete user');
    } finally {
      setBusyDelete(null);
    }
  };

  const filteredUsers = useMemo(
    () => (userRoleFilter ? users.filter(u => u.role === userRoleFilter) : users),
    [users, userRoleFilter]
  );
  const filteredTickets = useMemo(
    () => (ticketStatusFilter
      ? tickets.filter(t => (ticketStatusFilter === 'pending' ? !t.response : !!t.response))
      : tickets),
    [tickets, ticketStatusFilter]
  );

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
        <Text style={{ color: theme.colors.textMuted, marginTop: 12 }}>Loading admin data…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={{ padding: theme.gap }}>
      {/* Top Tabs */}
      <Row style={{ marginBottom: theme.gap }}>
        <TouchableOpacity
          style={[styles.tab, tab === 'dashboard' && styles.tabActive]}
          onPress={() => setTab('dashboard')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, tab === 'dashboard' && styles.tabTextActive]}>Admin Panel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'users' && styles.tabActive]}
          onPress={() => setTab('users')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'tickets' && styles.tabActive]}
          onPress={() => setTab('tickets')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, tab === 'tickets' && styles.tabTextActive]}>Recent Tickets</Text>
        </TouchableOpacity>
      </Row>

      {tab === 'dashboard' && (
        <>
          <Text style={styles.title}>Admin Panel</Text>
          <Row>
            <Stat label="Users" value={stats.total} tone="primary" />
            <Stat label="Tickets" value={stats.totalTickets} tone="primary" />
          </Row>
          <Row>
            <Stat label="Students" value={stats.students} />
            <Stat label="Teachers" value={stats.teachers} />
          </Row>
          <Row>
            <Stat label="Admins" value={stats.admins} />
            <Stat label="Pending" value={stats.pending} tone="warn" />
          </Row>
          <Row>
            <Stat label="Answered" value={stats.answered} tone="success" />
            <View style={{ flex: 1 }} />
          </Row>
        </>
      )}

      {tab === 'users' && (
        <Card>
          <Text style={styles.cardTitle}>Users</Text>
          <Text style={styles.cardHint}>Filter by role</Text>

          <ThemedSelect
            value={userRoleFilter}
            onChange={setUserRoleFilter}
            placeholder="All roles"
            options={[
              { label: 'All roles', value: '' },
              { label: 'Student', value: 'student' },
              { label: 'Teacher', value: 'teacher' },
              { label: 'Admin', value: 'admin' },
            ]}
          />

          {filteredUsers.length === 0 ? (
            <Text style={styles.empty}>No users</Text>
          ) : (
            filteredUsers.slice(0, 20).map((user) => (
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
                  activeOpacity={0.85}
                >
                  <Text style={styles.dangerBtnText}>{busyDelete === user.id ? '...' : 'Delete'}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>
      )}

      {tab === 'tickets' && (
        <Card>
          <Text style={styles.cardTitle}>Recent Tickets</Text>
          <Text style={styles.cardHint}>Filter by status</Text>

          <ThemedSelect
            value={ticketStatusFilter}
            onChange={setTicketStatusFilter}
            placeholder="All statuses"
            options={[
              { label: 'All statuses', value: '' },
              { label: 'Pending', value: 'pending' },
              { label: 'Answered', value: 'answered' },
            ]}
          />

          {filteredTickets.length === 0 ? (
            <Text style={styles.empty}>No tickets</Text>
          ) : (
            filteredTickets.slice(0, 20).map((t) => (
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
      )}

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  row: { flexDirection: 'row', gap: theme.gap, marginBottom: theme.gap },
  title: {
    color: theme.colors.text, fontSize: 24, fontWeight: '800',
    marginBottom: theme.gap, textAlign: 'center',
  },
  stat: {
    flex: 1, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius, padding: 16,
  },
  statLabel: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 6 },
  statValue: { color: theme.colors.text, fontSize: 22, fontWeight: '700' },

  card: {
    backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius, padding: theme.gap,
  },
  cardTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardHint: { color: theme.colors.textMuted, fontSize: 12, marginBottom: 8 },

  /* Items */
  itemRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 14,
  },
  ticketRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 14,
  },
  itemTitle: { color: theme.colors.text, fontWeight: '600' },
  itemSub: { color: theme.colors.textMuted, marginTop: 4 },
  empty: { color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 12 },

  chip: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: theme.colors.surface, borderRadius: 999,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  chipText: { color: theme.colors.text, fontSize: 12, textTransform: 'capitalize' },

  dangerBtn: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.colors.danger, borderRadius: 12 },
  dangerBtnText: { color: '#fff', fontWeight: '700' },

  /* Top tabs */
  tab: {
    flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999,
    paddingVertical: 10, alignItems: 'center', backgroundColor: theme.colors.card,
  },
  tabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  tabText: { color: theme.colors.text },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  /* ThemedSelect */
  selectTrigger: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12,
    backgroundColor: theme.colors.surface, paddingHorizontal: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.gap,
  },
  selectText: { color: theme.colors.text, fontSize: 14 },
  selectChevron: { color: theme.colors.textMuted, marginLeft: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalSheet: {
    backgroundColor: theme.colors.card, borderRadius: theme.radius,
    borderWidth: 1, borderColor: theme.colors.border, padding: theme.gap, width: '92%', maxHeight: '80%',
  },
  modalTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  optionRow: {
    paddingVertical: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10,
    marginBottom: 8, backgroundColor: theme.colors.surface,
  },
  optionText: { color: theme.colors.text },
  modalClose: {
    marginTop: 8, alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface,
  },
  modalCloseText: { color: theme.colors.text, fontWeight: '700' },
});