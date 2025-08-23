import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  ScrollView,
} from 'react-native';

// Screens (inchangés)
import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';
import TicketScreen from './screens/TicketScreen';
import TicketListScreen from './screens/TicketListScreen';
import AdminScreen from './screens/AdminScreen';
import LessonScreen from './screens/LessonScreen';
import StudentCalendarScreen from './screens/StudentCalendarScreen';
import TeacherLessonScreen from './screens/TeacherLessonScreen';

/**
 * THEME — palette & constantes centralisées
 */
const theme = {
  colors: {
    bg: '#0F172A', // fond app (sombre chic)
    card: '#111827',
    surface: '#0B1220',
    text: '#F3F4F6',
    textMuted: '#9CA3AF',
    primary: '#2563EB',
    primaryMuted: '#1D4ED8',
    danger: '#DC2626',
    success: '#16A34A',
    border: '#1F2937',
    banner: '#2563EB',
  },
  radius: 16,
  gap: 16,
  h: {
    touch: 56,
  },
};

/**
 * Banner (toast haut) — composant réutilisable
 */
function Banner({ visible, message, anim }) {
  if (!visible) return null;
  return (
      <Animated.View style={[styles.banner, { transform: [{ translateY: anim }] }]}>
        <Text style={styles.bannerTitle}>Aujourd'hui</Text>
        <Text style={styles.bannerText}>{message}</Text>
      </Animated.View>
  );
}

/**
 * ActionButton — carte cliquable moderne pour les actions principales
 */
function ActionButton({ label, icon, onPress, disabled }) {
  return (
      <TouchableOpacity
          onPress={onPress}
          disabled={disabled}
          style={[styles.actionBtn, disabled && { opacity: 0.5 }]}
          activeOpacity={0.8}
      >
        <View style={styles.actionIcon}>{icon}</View>
        <Text style={styles.actionLabel}>{label}</Text>
      </TouchableOpacity>
  );
}

export default function App() {
  const [screen, setScreen] = useState('login');
  const [studentId, setStudentId] = useState(null);
  const [teacherId, setTeacherId] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Banner state
  const [bannerMessage, setBannerMessage] = useState('');
  const [showBanner, setShowBanner] = useState(false);
  const bannerAnim = useRef(new Animated.Value(-120)).current;

  const showAnimatedBanner = (message) => {
    setBannerMessage(message);
    setShowBanner(true);
    Animated.timing(bannerAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(bannerAnim, {
          toValue: -120,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setShowBanner(false));
      }, 3500);
    });
  };

  // Notif cours du jour (même logique, message formaté)
  const notifyStudentTodaysLessons = async (sid) => {
    try {
      const res = await fetch(`http://10.0.2.2:3001/students/${sid}/lessons`);
      if (res.ok) {
        const lessons = await res.json();
        const today = new Date().toISOString().split('T')[0];
        const todays = lessons.filter((l) => l.date === today);
        if (todays.length > 0) {
          const now = new Date();
          const msg = todays
              .map((l) => {
                const [hour, min] = (l.time || '00:00').split(':').map(Number);
                const lessonDate = new Date(`${l.date}T${l.time || '00:00'}:00`);
                const diffMs = lessonDate - now;
                let timeInfo = '';
                if (diffMs > 0) {
                  const diffMin = Math.floor(diffMs / 60000);
                  const hours = Math.floor(diffMin / 60);
                  const mins = diffMin % 60;
                  timeInfo = `dans ${hours > 0 ? hours + 'h ' : ''}${mins}m`;
                } else {
                  timeInfo = 'a déjà commencé';
                }
                let details = `• ${l.title || 'Cours'} — ${l.time} (${timeInfo})`;
                if (l.location) details += `\n  Lieu : ${l.location}`;
                if (l.teacher) details += `\n  Prof : ${l.teacher}`;
                return details;
              })
              .join('\n\n');
          showAnimatedBanner(msg);
        }
      }
    } catch (e) {
      // Silencieux pour l'instant (peut logger)
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user.role === 'student') {
      setStudentId(user.id);
      setScreen('calendar');
      setTimeout(() => notifyStudentTodaysLessons(user.id), 3000);
    } else if (user.role === 'teacher') {
      setTeacherId(user.id);
      setScreen('teacherLessons');
    } else if (user.role === 'admin') {
      setAdminId(user.id);
      setScreen('admin');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setStudentId(null);
    setTeacherId(null);
    setAdminId(null);
    setScreen('login');
  };

  /**
   * Icônes minimalistes (sans lib externe)
   */
  const Dot = () => <View style={styles.dot} />;

  return (
      <SafeAreaView style={styles.safe}>
        {/* Banner */}
        <Banner visible={showBanner} message={bannerMessage} anim={bannerAnim} />

        {/* Header */}
        <View style={styles.header}>
          <Image source={require('./logo.png')} style={styles.logo} resizeMode="contain" />
          {currentUser && (
              <View style={styles.userChip}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Dot />
                  <Text style={styles.userName}>{currentUser.full_name}</Text>
                  <Text style={styles.roleBadge}>{currentUser.role}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
                  <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </View>
          )}
        </View>

        {/* Body */}
        <ScrollView contentContainerStyle={styles.body}>
          {/* Actions */}
          {currentUser ? (
              <View style={styles.actionsGrid}>
                {currentUser.role === 'student' && (
                    <>
                      <ActionButton label="Ouvrir un ticket" onPress={() => setScreen('tickets')} icon={<View style={styles.simpleIcon} />} disabled={!studentId} />
                      <ActionButton label="Mes tickets" onPress={() => setScreen('ticketList')} icon={<View style={styles.simpleIcon} />} disabled={!currentUser} />
                      <ActionButton label="Mon calendrier" onPress={() => setScreen('calendar')} icon={<View style={styles.simpleIcon} />} disabled={!studentId} />
                    </>
                )}

                {currentUser.role === 'teacher' && (
                    <>
                      <ActionButton label="Mes cours" onPress={() => setScreen('teacherLessons')} icon={<View style={styles.simpleIcon} />} disabled={!teacherId} />
                      <ActionButton label="Mes tickets" onPress={() => setScreen('ticketList')} icon={<View style={styles.simpleIcon} />} disabled={!teacherId} />
                      <ActionButton label="Créer un cours" onPress={() => setScreen('lesson')} icon={<View style={styles.simpleIcon} />} disabled={!teacherId} />
                    </>
                )}

                {currentUser.role === 'admin' && (
                    <ActionButton label="Panneau admin" onPress={() => setScreen('admin')} icon={<View style={styles.simpleIcon} />} disabled={!adminId} />
                )}
              </View>
          ) : (
              <View style={styles.welcomeCard}>
                <Text style={styles.welcomeTitle}>Bienvenue 👋</Text>
                <Text style={styles.welcomeText}>
                  Connecte-toi pour accéder à tes cours, tickets et planning.
                </Text>
              </View>
          )}

          {/* Screens */}
          <View style={{ flex: 1, width: '100%' }}>
            {screen === 'register' && <RegisterScreen />}
            {screen === 'login' && <LoginScreen onLoginSuccess={handleLoginSuccess} />}
            {screen === 'tickets' && studentId && <TicketScreen studentId={studentId} />}
            {screen === 'ticketList' && currentUser && (
                <TicketListScreen teacherId={teacherId} studentId={studentId} userRole={currentUser.role} />
            )}
            {screen === 'admin' && adminId && <AdminScreen adminId={adminId} />}
            {screen === 'lesson' && teacherId && (
                <LessonScreen teacherId={teacherId} navigation={{ goBack: () => setScreen('ticketList') }} />
            )}
            {screen === 'calendar' && studentId && <StudentCalendarScreen studentId={studentId} />}
            {screen === 'teacherLessons' && teacherId && <TeacherLessonScreen teacherId={teacherId} />}
          </View>
        </ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  logo: {
    width: '60%',
    alignSelf: 'center',
    height: 48,
  },
  userChip: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  roleBadge: {
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    textTransform: 'capitalize',
    fontSize: 12,
  },
  logoutBtn: {
    backgroundColor: theme.colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  logoutText: {
    color: 'white',
    fontWeight: '700',
  },
  body: {
    padding: 16,
    gap: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionBtn: {
    width: '48%',
    height: theme.h.touch,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  actionLabel: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  welcomeCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  welcomeTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  welcomeText: {
    color: theme.colors.textMuted,
  },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.banner,
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 100,
    elevation: 10,
    borderBottomLeftRadius: theme.radius,
    borderBottomRightRadius: theme.radius,
  },
  bannerTitle: {
    color: 'white',
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
  simpleIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.success,
  },
});
