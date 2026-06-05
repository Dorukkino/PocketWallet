import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, ChevronLeft, ChevronRight, LogOut, WalletCards, X } from 'lucide-react-native';

import { BalanceHeader } from '../components/BalanceHeader';
import { DonutChart } from '../components/DonutChart';
import { ExpenseForm } from '../components/ExpenseForm';
import { LanguageToggle } from '../components/LanguageToggle';
import { TransactionList } from '../components/TransactionList';
import { CURRENCIES } from '../constants/categories';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { useBudget } from '../hooks/useBudget';
import { TranslationKey, useI18n } from '../i18n';
import { formatCurrencyValue } from '../lib/currency';
import { supabase } from '../lib/supabase';
import type { BudgetPeriod } from '../types/budget';

type Props = {
  session: Session;
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const REFRESH_PROGRESS_OFFSET = 300;
const IOS_REFRESH_INDICATOR_TOP = 132;

const formatDateLabel = (dateKey: string, locale: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(new Date(year, month - 1, day));
};

const formatMonthLabel = (monthKey: string, locale: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  const formatted = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
  return formatted.charAt(0).toLocaleUpperCase(locale) + formatted.slice(1);
};

const formatMonthName = (monthKey: string, locale: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  const formatted = new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(year, month - 1, 1));
  return formatted.charAt(0).toLocaleUpperCase(locale) + formatted.slice(1);
};

const getSavingsAdviceKey = (savingsPercent: number): TranslationKey => {
  if (savingsPercent > 74) {
    return 'adviceSavingsExcellent';
  }

  if (savingsPercent > 49) {
    return 'adviceSavingsHigh';
  }

  if (savingsPercent > 24) {
    return 'adviceSavingsMedium';
  }

  return 'adviceSavingsLow';
};

export function BudgetScreen({ session }: Props) {
  const { locale, t } = useI18n();
  const budget = useBudget(session);
  const exchange = useExchangeRates();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);
  const [formResetSignal, setFormResetSignal] = useState(0);
  const selectedMonthIndex = Math.max(
    0,
    budget.monthOptions.findIndex((period) => period.monthKey === budget.selectedPeriod.monthKey),
  );
  const newerPeriod = selectedMonthIndex > 0 ? budget.monthOptions[selectedMonthIndex - 1] : null;
  const olderPeriod =
    selectedMonthIndex < budget.monthOptions.length - 1 ? budget.monthOptions[selectedMonthIndex + 1] : null;
  const monthGroups = useMemo(() => {
    const groups: Array<{ year: string; periods: BudgetPeriod[] }> = [];

    budget.monthOptions.forEach((period) => {
      const year = period.monthKey.slice(0, 4);
      const existingGroup = groups.find((group) => group.year === year);
      if (existingGroup) {
        existingGroup.periods.push(period);
      } else {
        groups.push({ year, periods: [period] });
      }
    });

    return groups;
  }, [budget.monthOptions]);

  const selectMonth = (monthKey: string) => {
    budget.selectMonth(monthKey);
    setIsMonthPickerVisible(false);
  };

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

  const refreshScreen = useCallback(async () => {
    setIsRefreshing(true);
    setFormResetSignal((current) => current + 1);
    budget.clearError();
    await Promise.all([budget.refreshBudget(), exchange.refreshRates(), wait(800)]);
    setIsRefreshing(false);
  }, [budget, exchange]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Platform.OS !== 'ios') {
      return;
    }

    const nextPullDistance = Math.max(0, -event.nativeEvent.contentOffset.y);
    setPullDistance((currentPullDistance) =>
      Math.abs(currentPullDistance - nextPullDistance) < 2 ? currentPullDistance : nextPullDistance,
    );
  }, []);

  const savingsPercent = Math.min(
    100,
    Math.max(0, Math.round((budget.remainingBalance / Math.max(budget.income, 1)) * 100)),
  );
  const savingsAdviceKey = getSavingsAdviceKey(savingsPercent);
  const showIosRefreshIndicator = Platform.OS === 'ios' && pullDistance > 12;
  const iosRefreshIndicatorOpacity = Math.min(1, pullDistance / 76);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <LinearGradient colors={['#020617', '#07111f', '#020617']} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      {showIosRefreshIndicator ? (
        <View style={[styles.iosRefreshIndicator, { opacity: iosRefreshIndicatorOpacity }]} pointerEvents="none">
          <ActivityIndicator color="#34d399" />
        </View>
      ) : null}

      <ScrollView
        alwaysBounceVertical
        bounces
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshScreen}
            tintColor={Platform.OS === 'ios' ? 'transparent' : '#34d399'}
            colors={['#34d399']}
            progressBackgroundColor="#0f172a"
            progressViewOffset={REFRESH_PROGRESS_OFFSET}
            title={Platform.OS === 'ios' ? undefined : t('refreshing')}
            titleColor={Platform.OS === 'ios' ? 'transparent' : '#94a3b8'}
          />
        }
      >
        <View style={styles.nav}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <WalletCards color="#022c22" size={25} />
            </View>
            <View>
              <Text style={styles.brand}>PocketWallet</Text>
              <Text style={styles.brandSub}>{t('dashboardSubtitle')}</Text>
            </View>
          </View>
          <View style={styles.navActions}>
            <LanguageToggle />
            <Pressable onPress={signOut} style={styles.signOutButton} hitSlop={10}>
              <LogOut color="#94a3b8" size={18} />
            </Pressable>
          </View>
        </View>

        <View style={styles.monthCard}>
          <View style={styles.monthHeader}>
            <View style={styles.monthIcon}>
              <CalendarDays color="#5eead4" size={20} />
            </View>
            <View style={styles.monthInfo}>
              <Text style={styles.monthTitle}>{formatMonthLabel(budget.selectedPeriod.monthKey, locale)}</Text>
              <Text style={styles.monthRange}>
                {formatDateLabel(budget.selectedPeriod.startDate, locale)} -{' '}
                {formatDateLabel(budget.selectedPeriod.endDate, locale)}
              </Text>
            </View>
            <Pressable onPress={() => setIsMonthPickerVisible(true)} style={styles.monthCountBadge}>
              <Text style={styles.monthCountText}>{t('monthCount', { count: budget.monthOptions.length })}</Text>
            </Pressable>
          </View>

          <View style={styles.monthNav}>
            <Pressable
              disabled={!olderPeriod}
              onPress={() => olderPeriod && budget.selectMonth(olderPeriod.monthKey)}
              style={[styles.monthNavButton, !olderPeriod && styles.monthNavButtonDisabled]}
            >
              <ChevronLeft color={olderPeriod ? '#cbd5e1' : '#475569'} size={16} />
              <Text style={[styles.monthNavText, !olderPeriod && styles.monthNavTextDisabled]}>{t('previous')}</Text>
            </Pressable>

            <Pressable onPress={() => setIsMonthPickerVisible(true)} style={styles.monthPickerButton}>
              <Text style={styles.monthPickerButtonText}>{t('changeMonth')}</Text>
            </Pressable>

            <Pressable
              disabled={!newerPeriod}
              onPress={() => newerPeriod && budget.selectMonth(newerPeriod.monthKey)}
              style={[styles.monthNavButton, !newerPeriod && styles.monthNavButtonDisabled]}
            >
              <Text style={[styles.monthNavText, !newerPeriod && styles.monthNavTextDisabled]}>{t('next')}</Text>
              <ChevronRight color={newerPeriod ? '#cbd5e1' : '#475569'} size={16} />
            </Pressable>
          </View>
        </View>

        <View style={styles.currencyHeader}>
          <Text style={styles.currencyTitle}>{t('currencyTitle')}</Text>
          <Text style={styles.currencySub}>
            {exchange.isLoading
              ? t('rateLoading')
              : t('rateDate', {
                  date: exchange.rates.sourceDate,
                  stale: exchange.rates.isStale ? t('rateStaleInline') : '',
                })}
          </Text>
        </View>

        {exchange.error ? <Text style={styles.rateWarning}>{exchange.error}</Text> : null}

        <View style={styles.currencyRow}>
          {CURRENCIES.map((item) => {
            const isActive = budget.currency === item.code;
            return (
              <Pressable
                key={item.code}
                onPress={() => budget.updateCurrency(item.code)}
                style={[styles.currencyPill, isActive && styles.currencyPillActive]}
              >
                <Text style={[styles.currencyCode, isActive && styles.currencyTextActive]}>{item.code}</Text>
                <Text style={[styles.currencyValue, isActive && styles.currencyTextActive]}>
                  {formatCurrencyValue(budget.remainingBalance, item.code, exchange.rates, locale)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {budget.error ? (
          <Pressable onPress={budget.clearError} style={styles.errorBox}>
            <Text style={styles.errorText}>{budget.error}</Text>
          </Pressable>
        ) : null}

        <BalanceHeader
          income={budget.income}
          totalExpense={budget.totalExpense}
          remainingBalance={budget.remainingBalance}
          spendRatio={budget.spendRatio}
          currency={budget.currency}
          exchangeRates={exchange.rates}
          onIncomeChange={budget.updateIncome}
        />

        <ExpenseForm
          categories={budget.categories}
          exchangeRates={exchange.rates}
          defaultSpentOn={budget.defaultExpenseDate}
          resetSignal={formResetSignal}
          onAddExpense={budget.addExpense}
          onAddCategory={budget.addCategory}
          onDeleteCategory={budget.deleteCategory}
        />

        <DonutChart
          stats={budget.categoryStats}
          totalExpense={budget.totalExpense}
          currency={budget.currency}
          exchangeRates={exchange.rates}
        />

        <TransactionList
          expenses={budget.expenses}
          categories={budget.categories}
          currency={budget.currency}
          exchangeRates={exchange.rates}
          onDeleteExpense={budget.deleteExpense}
        />

        <View style={styles.adviceCard}>
          <Text style={styles.adviceTitle}>{t('financialAdvice')}</Text>
          <Text style={styles.adviceText}>
            {budget.income === 0 && budget.totalExpense === 0
              ? t('adviceEmpty')
              : budget.remainingBalance >= 0
                ? t(savingsAdviceKey, { percent: savingsPercent })
                : t('adviceNegative')}
          </Text>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={isMonthPickerVisible}
        onRequestClose={() => setIsMonthPickerVisible(false)}
      >
        <View style={styles.monthModalBackdrop}>
          <View style={styles.monthModalCard}>
            <View style={styles.monthModalHeader}>
              <View>
                <Text style={styles.monthModalTitle}>{t('monthSelect')}</Text>
                <Text style={styles.monthModalSubtitle}>{t('monthModalSubtitle')}</Text>
              </View>
              <Pressable onPress={() => setIsMonthPickerVisible(false)} style={styles.monthModalClose}>
                <X color="#94a3b8" size={18} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.monthModalContent}>
              {monthGroups.map((group) => (
                <View key={group.year} style={styles.monthYearGroup}>
                  <Text style={styles.monthYearTitle}>{group.year}</Text>
                  <View style={styles.monthGrid}>
                    {group.periods.map((period) => {
                      const isSelected = period.monthKey === budget.selectedPeriod.monthKey;
                      return (
                        <Pressable
                          key={period.monthKey}
                          onPress={() => selectMonth(period.monthKey)}
                          style={[styles.monthGridItem, isSelected && styles.monthGridItemActive]}
                        >
                          <Text style={[styles.monthGridLabel, isSelected && styles.monthGridTextActive]}>
                            {formatMonthName(period.monthKey, locale)}
                          </Text>
                          <Text style={[styles.monthGridRange, isSelected && styles.monthGridTextActive]}>
                            {formatDateLabel(period.startDate, locale)} - {formatDateLabel(period.endDate, locale)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#020617',
    flex: 1,
  },
  scrollView: {
    zIndex: 1,
  },
  content: {
    gap: 18,
    paddingBottom: 34,
    paddingHorizontal: 18,
    paddingTop: 62,
  },
  iosRefreshIndicator: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderColor: 'rgba(52, 211, 153, 0.28)',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    top: IOS_REFRESH_INDICATOR_TOP,
    width: 44,
    zIndex: 0,
  },
  glowTop: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderRadius: 170,
    height: 280,
    position: 'absolute',
    right: -120,
    top: -90,
    width: 280,
  },
  glowBottom: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: 190,
    bottom: 50,
    height: 320,
    left: -150,
    position: 'absolute',
    width: 320,
  },
  nav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  brandIcon: {
    alignItems: 'center',
    backgroundColor: '#34d399',
    borderRadius: 17,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  brand: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  brandSub: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  navActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  signOutButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  monthCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderColor: 'rgba(45, 212, 191, 0.2)',
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 13,
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  monthIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    borderColor: 'rgba(94, 234, 212, 0.18)',
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  monthInfo: {
    flex: 1,
  },
  monthTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '900',
  },
  monthRange: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  monthCountBadge: {
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    borderColor: 'rgba(94, 234, 212, 0.18)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  monthCountText: {
    color: '#5eead4',
    fontSize: 10,
    fontWeight: '900',
  },
  monthNav: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  monthNavButton: {
    alignItems: 'center',
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  monthNavButtonDisabled: {
    opacity: 0.55,
  },
  monthNavText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '900',
  },
  monthNavTextDisabled: {
    color: '#475569',
  },
  monthPickerButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    borderColor: 'rgba(94, 234, 212, 0.18)',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  monthPickerButtonText: {
    color: '#5eead4',
    fontSize: 11,
    fontWeight: '900',
  },
  currencyHeader: {
    gap: 3,
    marginBottom: -10,
  },
  currencyTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '900',
  },
  currencySub: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  rateWarning: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.2)',
    borderRadius: 14,
    borderWidth: 1,
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
    marginTop: -8,
    padding: 10,
  },
  currencyRow: {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderColor: '#1e293b',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 5,
  },
  currencyPill: {
    alignItems: 'center',
    borderRadius: 13,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 3,
    paddingVertical: 10,
  },
  currencyPillActive: {
    backgroundColor: '#34d399',
  },
  currencyCode: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '900',
  },
  currencyValue: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '900',
  },
  currencyTextActive: {
    color: '#022c22',
  },
  errorBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.22)',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  errorText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '800',
  },
  adviceCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.18)',
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  adviceTitle: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '900',
  },
  adviceText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 7,
  },
  monthModalBackdrop: {
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
  },
  monthModalCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 28,
    borderWidth: 1,
    maxHeight: '78%',
    padding: 18,
  },
  monthModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthModalTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
  },
  monthModalSubtitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  monthModalClose: {
    alignItems: 'center',
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderRadius: 13,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  monthModalContent: {
    gap: 18,
    paddingBottom: 8,
  },
  monthYearGroup: {
    gap: 10,
  },
  monthYearTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '900',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthGridItem: {
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '31%',
    flexGrow: 1,
    padding: 10,
  },
  monthGridItemActive: {
    backgroundColor: '#34d399',
    borderColor: '#34d399',
  },
  monthGridLabel: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '900',
  },
  monthGridRange: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 5,
  },
  monthGridTextActive: {
    color: '#022c22',
  },
});
