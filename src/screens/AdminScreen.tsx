import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, RefreshCw, ReceiptText, Settings, ShieldCheck, Tags, UsersRound, WalletCards } from 'lucide-react-native';

import { LanguageToggle } from '../components/LanguageToggle';
import type { AdminErrorKey, AdminStats, AdminUserSummary } from '../hooks/useAdmin';
import { useI18n } from '../i18n';
import { supabase } from '../lib/supabase';

type Props = {
  session: Session;
  stats: AdminStats;
  users: AdminUserSummary[];
  isRefreshing: boolean;
  errorKey: AdminErrorKey | null;
  onRefresh: () => void;
};

const formatDateTime = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export function AdminScreen({ session, stats, users, isRefreshing, errorKey, onRefresh }: Props) {
  const { locale, t } = useI18n();

  const signOut = () => {
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('signOutCancel'), style: 'cancel' },
      {
        text: t('signOut'),
        style: 'destructive',
        onPress: () => {
          supabase.auth.signOut();
        },
      },
    ]);
  };

  const statCards = [
    {
      key: 'users',
      label: t('adminRegisteredUsers'),
      value: stats.users,
      icon: UsersRound,
      color: '#34d399',
    },
    {
      key: 'expenses',
      label: t('adminExpenseRecords'),
      value: stats.expenses,
      icon: ReceiptText,
      color: '#60a5fa',
    },
    {
      key: 'categories',
      label: t('adminCategoryRecords'),
      value: stats.categories,
      icon: Tags,
      color: '#f59e0b',
    },
    {
      key: 'settings',
      label: t('adminSettingsRecords'),
      value: stats.settings,
      icon: Settings,
      color: '#a78bfa',
    },
  ];

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#020617', '#07111f', '#020617']} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#34d399"
            colors={['#34d399']}
            progressBackgroundColor="#0f172a"
            title={t('refreshing')}
            titleColor="#94a3b8"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.nav}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <ShieldCheck color="#022c22" size={25} />
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brand}>{t('adminPanelTitle')}</Text>
              <Text style={styles.brandSub}>{t('adminPanelSubtitle')}</Text>
            </View>
          </View>
          <View style={styles.navActions}>
            <LanguageToggle />
            <Pressable onPress={onRefresh} style={styles.iconButton} hitSlop={10}>
              <RefreshCw color="#94a3b8" size={18} />
            </Pressable>
            <Pressable onPress={signOut} style={styles.iconButton} hitSlop={10}>
              <LogOut color="#94a3b8" size={18} />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <WalletCards color="#5eead4" size={22} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t('adminWelcomeTitle')}</Text>
            <Text style={styles.heroText}>{t('adminWelcomeText', { email: session.user.email ?? '-' })}</Text>
          </View>
        </View>

        {errorKey ? <Text style={styles.warning}>{t(errorKey)}</Text> : null}

        <View style={styles.statsGrid}>
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <View key={card.key} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${card.color}24` }]}>
                  <Icon color={card.color} size={20} />
                </View>
                <Text style={styles.statValue}>{card.value}</Text>
                <Text style={styles.statLabel}>{card.label}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('adminUserListTitle')}</Text>
          <Text style={styles.sectionSub}>{t('adminUserListSubtitle', { count: users.length })}</Text>
        </View>

        <View style={styles.userList}>
          {users.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.fullName.charAt(0).toLocaleUpperCase(locale)}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.fullName}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userDate}>{formatDateTime(user.createdAt, locale)}</Text>
              </View>
              <View style={[styles.roleBadge, user.role === 'admin' && styles.adminRoleBadge]}>
                <Text style={[styles.roleText, user.role === 'admin' && styles.adminRoleText]}>
                  {user.role === 'admin' ? t('adminRoleAdmin') : t('adminRoleUser')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#020617',
    flex: 1,
  },
  glowTop: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderRadius: 180,
    height: 300,
    position: 'absolute',
    right: -90,
    top: -80,
    width: 300,
  },
  glowBottom: {
    backgroundColor: 'rgba(139, 92, 246, 0.13)',
    borderRadius: 170,
    bottom: -80,
    height: 280,
    left: -90,
    position: 'absolute',
    width: 280,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
    paddingTop: 64,
  },
  nav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brandRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  brandIcon: {
    alignItems: 'center',
    backgroundColor: '#34d399',
    borderRadius: 18,
    height: 45,
    justifyContent: 'center',
    width: 45,
  },
  brandCopy: {
    flex: 1,
  },
  brand: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSub: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  navActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(51, 65, 85, 0.9)',
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderColor: 'rgba(51, 65, 85, 0.82)',
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
    padding: 18,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.14)',
    borderRadius: 18,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '900',
  },
  heroText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 5,
  },
  warning: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderColor: 'rgba(51, 65, 85, 0.82)',
    borderRadius: 24,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: '47%',
    padding: 16,
  },
  statIcon: {
    alignItems: 'center',
    borderRadius: 15,
    height: 38,
    justifyContent: 'center',
    marginBottom: 12,
    width: 38,
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  sectionSub: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  userList: {
    gap: 10,
  },
  userCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    borderColor: 'rgba(51, 65, 85, 0.75)',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
    borderRadius: 17,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: {
    color: '#5eead4',
    fontSize: 16,
    fontWeight: '900',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  userEmail: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  userDate: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  adminRoleBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
    borderColor: 'rgba(52, 211, 153, 0.22)',
  },
  roleText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '900',
  },
  adminRoleText: {
    color: '#5eead4',
  },
});
