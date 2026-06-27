import { useCallback, useEffect, useMemo, useState } from 'react';
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
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, ChevronLeft, ChevronRight, LogOut, Trash2, X } from 'lucide-react-native';

import { AdBanner } from '../components/AdBanner';
import { AppLogo } from '../components/AppLogo';
import { BalanceHeader } from '../components/BalanceHeader';
import { DonutChart } from '../components/DonutChart';
import { ExpenseForm } from '../components/ExpenseForm';
import { LanguageToggle } from '../components/LanguageToggle';
import { MarketAdviceCard } from '../components/MarketAdviceCard';
import { TransactionList } from '../components/TransactionList';
import { CURRENCIES } from '../constants/categories';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { useMarketAdvice } from '../hooks/useMarketAdvice';
import { useBudget } from '../hooks/useBudget';
import { TranslationKey, useI18n } from '../i18n';
import { formatCurrencyValue } from '../lib/currency';
import { recordMarketAdviceViewed } from '../lib/rateApp';
import { removeBudgetSnapshot } from '../lib/storage';
import { supabase } from '../lib/supabase';
import type { BudgetPeriod } from '../types/budget';

type Props = {
  session: Session | null;
  isGuest?: boolean;
  onExitGuest?: () => void;
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const IOS_REFRESH_INDICATOR_TOP = 132;
const IOS_REFRESH_TRIGGER_DISTANCE = 72;

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

export function BudgetScreen({ session, isGuest = false, onExitGuest }: Props) {
  const { locale, t } = useI18n();
  const exchange = useExchangeRates();
  const budget = useBudget(session, exchange.rates);
  const showMarketAdvice =
    !(budget.incomeInTry === 0 && budget.totalExpense === 0) && budget.remainingBalance >= 0;
  const {
    advice: marketInvestmentAdvice,
    isLoading: isMarketAdviceLoading,
    error: marketAdviceError,
    refreshAdvice: refreshMarketAdvice,
  } = useMarketAdvice(budget.totalExpense, budget.selectedPeriod.monthKey, showMarketAdvice);

  useEffect(() => {
    if (!showMarketAdvice || isMarketAdviceLoading || !marketInvestmentAdvice) {
      return;
    }

    void recordMarketAdviceViewed(budget.selectedPeriod.monthKey);
  }, [
    budget.selectedPeriod.monthKey,
    isMarketAdviceLoading,
    marketInvestmentAdvice,
    showMarketAdvice,
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
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
    if (isGuest) {
      Alert.alert(t('exitGuest'), t('exitGuestConfirm'), [
        { text: t('signOutCancel'), style: 'cancel' },
        {
          text: t('exitGuest'),
          style: 'destructive',
          onPress: () => {
            onExitGuest?.();
          },
        },
      ]);
      return;
    }

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

  const deleteAccount = () => {
    if (!session || isGuest) {
      return;
    }

    if (isDeletingAccount) {
      return;
    }

    Alert.alert(t('deleteAccount'), t('deleteAccountConfirm'), [
      { text: t('deleteAccountCancel'), style: 'cancel' },
      {
        text: t('deleteAccount'),
        style: 'destructive',
        onPress: async () => {
          setIsDeletingAccount(true);

          const { error } = await supabase.functions.invoke('delete-account', {
            body: {},
          });

          if (error) {
            setIsDeletingAccount(false);
            Alert.alert(t('deleteAccountFailedTitle'), t('deleteAccountFailed'));
            return;
          }

          await removeBudgetSnapshot(session.user.id);
          await supabase.auth.signOut({ scope: 'local' });
          setIsDeletingAccount(false);
        },
      },
    ]);
  };

  const refreshScreen = useCallback(async () => {
    setIsRefreshing(true);
    setFormResetSignal((current) => current + 1);
    budget.clearError();
    await Promise.all([
      budget.refreshBudget(),
      exchange.refreshRates(),
      refreshMarketAdvice(),
      wait(800),
    ]);
    setPullDistance(0);
    setIsRefreshing(false);
  }, [budget, exchange, refreshMarketAdvice]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Platform.OS !== 'ios') {
      return;
    }

    const nextPullDistance = Math.max(0, -event.nativeEvent.contentOffset.y);
    setPullDistance((currentPullDistance) =>
      Math.abs(currentPullDistance - nextPullDistance) < 2 ? currentPullDistance : nextPullDistance,
    );
  }, []);

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Platform.OS !== 'ios' || isRefreshing) {
        return;
      }

      if (event.nativeEvent.contentOffset.y <= -IOS_REFRESH_TRIGGER_DISTANCE) {
        void refreshScreen();
      }
    },
    [isRefreshing, refreshScreen],
  );

  const savingsPercent = Math.min(
    100,
    Math.max(0, Math.round((budget.remainingBalance / Math.max(budget.incomeInTry, 1)) * 100)),
  );
  const savingsAdviceKey = getSavingsAdviceKey(savingsPercent);
  const fallbackAdviceText =
    budget.incomeInTry === 0 && budget.totalExpense === 0
      ? t('adviceEmpty')
      : budget.remainingBalance >= 0
        ? t(savingsAdviceKey, { percent: savingsPercent })
        : t('adviceNegative');
  const adviceText =
    budget.incomeInTry === 0 && budget.totalExpense === 0
      ? t('adviceEmpty')
      : budget.remainingBalance < 0
        ? t('adviceNegative')
        : fallbackAdviceText;
  const showIosRefreshIndicator = Platform.OS === 'ios' && (pullDistance > 12 || isRefreshing);
  const iosRefreshIndicatorOpacity = isRefreshing ? 1 : Math.min(1, pullDistance / 76);

  return (
    <SafeAreaView style={styles.safeArea}>
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
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        refreshControl={
          Platform.OS === 'android' ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshScreen}
              colors={['#34d399']}
              progressBackgroundColor="#0f172a"
              title={t('refreshing')}
              titleColor="#94a3b8"
            />
          ) : undefined
        }
      >
        <View style={styles.nav}>
          <View style={styles.brandRow}>
            <AppLogo size={46} style={styles.brandIcon} />
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

        {budget.errors.length > 0 ? (
          <Pressable onPress={() => budget.clearError('general')} style={styles.errorBox}>
            {budget.errors.map((message) => (
              <Text key={message} style={styles.errorText}>
                {message}
              </Text>
            ))}
          </Pressable>
        ) : null}

        <BalanceHeader
          incomeEntry={budget.incomeEntry}
          totalExpense={budget.totalExpense}
          remainingBalance={budget.remainingBalance}
          spendRatio={budget.spendRatio}
          currency={budget.currency}
          exchangeRates={exchange.rates}
          resetSignal={formResetSignal}
          onIncomeChange={budget.updateIncome}
        />

        <AdBanner />

        <ExpenseForm
          categories={budget.categories}
          exchangeRates={exchange.rates}
          defaultSpentOn={budget.defaultExpenseDate}
          resetSignal={formResetSignal}
          errors={budget.expenseFormErrors}
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
          errors={budget.transactionErrors}
          onDeleteExpense={budget.deleteExpense}
        />

        <MarketAdviceCard
          advice={marketInvestmentAdvice}
          errorKey={marketAdviceError}
          fallbackText={adviceText}
          isLoading={isMarketAdviceLoading}
          locale={locale}
          showMarketAdvice={showMarketAdvice}
        />

        {!isGuest ? (
          <View style={styles.deleteAccountCard}>
            <View style={styles.deleteAccountHeader}>
              <View style={styles.deleteAccountIcon}>
                <Trash2 color="#fca5a5" size={20} />
              </View>
              <View style={styles.deleteAccountCopy}>
                <Text style={styles.deleteAccountTitle}>{t('deleteAccount')}</Text>
                <Text style={styles.deleteAccountText}>{t('deleteAccountDescription')}</Text>
              </View>
            </View>
            <Pressable
              disabled={isDeletingAccount}
              onPress={deleteAccount}
              style={[styles.deleteAccountButton, isDeletingAccount && styles.deleteAccountButtonDisabled]}
            >
              {isDeletingAccount ? (
                <ActivityIndicator color="#fee2e2" />
              ) : (
                <Text style={styles.deleteAccountButtonText}>{t('deleteAccount')}</Text>
              )}
            </Pressable>
          </View>
        ) : null}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#020617',
    flex: 1,
  },
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
    paddingTop: 18,
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
    borderColor: 'rgba(94, 234, 212, 0.2)',
    borderWidth: 1,
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
  deleteAccountCard: {
    backgroundColor: 'rgba(127, 29, 29, 0.18)',
    borderColor: 'rgba(248, 113, 113, 0.28)',
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  deleteAccountHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  deleteAccountIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.14)',
    borderColor: 'rgba(252, 165, 165, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  deleteAccountCopy: {
    flex: 1,
  },
  deleteAccountTitle: {
    color: '#fee2e2',
    fontSize: 14,
    fontWeight: '900',
  },
  deleteAccountText: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 4,
  },
  deleteAccountButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
  },
  deleteAccountButtonDisabled: {
    opacity: 0.7,
  },
  deleteAccountButtonText: {
    color: '#fff1f2',
    fontSize: 14,
    fontWeight: '900',
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
