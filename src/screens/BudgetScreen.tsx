import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { LogOut, WalletCards } from 'lucide-react-native';

import { BalanceHeader } from '../components/BalanceHeader';
import { DonutChart } from '../components/DonutChart';
import { ExpenseForm } from '../components/ExpenseForm';
import { TransactionList } from '../components/TransactionList';
import { CURRENCIES } from '../constants/categories';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { useBudget } from '../hooks/useBudget';
import { formatCurrencyValue } from '../lib/currency';
import { supabase } from '../lib/supabase';

type Props = {
  session: Session;
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function BudgetScreen({ session }: Props) {
  const budget = useBudget(session);
  const exchange = useExchangeRates();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const signOut = () => {
    Alert.alert('Çıkış Yap', 'PocketWallet hesabından çıkmak istiyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: () => {
          supabase.auth.signOut();
        },
      },
    ]);
  };

  const refreshScreen = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([budget.refreshBudget(), exchange.refreshRates(), wait(800)]);
    setIsRefreshing(false);
  }, [budget, exchange]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <LinearGradient colors={['#020617', '#07111f', '#020617']} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <ScrollView
        alwaysBounceVertical
        bounces
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshScreen}
            tintColor="#34d399"
            colors={['#34d399']}
            progressBackgroundColor="#0f172a"
            progressViewOffset={48}
            title="Yenileniyor..."
            titleColor="#94a3b8"
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
              <Text style={styles.brandSub}>Aylık finans kontrol paneli</Text>
            </View>
          </View>
          <Pressable onPress={signOut} style={styles.signOutButton} hitSlop={10}>
            <LogOut color="#94a3b8" size={18} />
          </Pressable>
        </View>

        <View style={styles.currencyHeader}>
          <Text style={styles.currencyTitle}>Günlük Kur Takibi</Text>
          <Text style={styles.currencySub}>
            {exchange.isLoading
              ? 'Kurlar alınıyor...'
              : `Kur tarihi: ${exchange.rates.sourceDate}${exchange.rates.isStale ? ' · son kayıtlı' : ''}`}
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
                  {formatCurrencyValue(budget.remainingBalance, item.code, exchange.rates)}
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
          <Text style={styles.adviceTitle}>Finansal Öneri</Text>
          <Text style={styles.adviceText}>
            {budget.remainingBalance > 0
              ? `Bu ay ${Math.max(0, Math.round((budget.remainingBalance / Math.max(budget.income, 1)) * 100))}% tasarruf alanın var. Kalan bütçeyi yatırım veya gelecek ay devri için ayırabilirsin.`
              : 'Bu ay harcamalar geliri geçti. Eğlence, giyim veya dış harcama kalemlerini sınırlamak bütçeyi hızlı toparlar.'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#020617',
    flex: 1,
  },
  content: {
    gap: 18,
    paddingBottom: 34,
    paddingHorizontal: 18,
    paddingTop: 62,
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
});
