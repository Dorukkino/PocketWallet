import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowDownRight, ArrowUpRight, Check, Pencil, WalletCards } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useI18n } from '../i18n';
import { formatCurrencyValue } from '../lib/currency';
import type { CurrencyCode, ExchangeRates } from '../types/budget';

type Props = {
  income: number;
  totalExpense: number;
  remainingBalance: number;
  spendRatio: number;
  currency: CurrencyCode;
  exchangeRates: ExchangeRates;
  onIncomeChange: (income: number) => void;
};

export function BalanceHeader({
  income,
  totalExpense,
  remainingBalance,
  spendRatio,
  currency,
  exchangeRates,
  onIncomeChange,
}: Props) {
  const { locale, t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [incomeInput, setIncomeInput] = useState(String(income));
  const [error, setError] = useState('');

  const formattedBalance = useMemo(
    () => formatCurrencyValue(remainingBalance, currency, exchangeRates, locale),
    [currency, exchangeRates, locale, remainingBalance],
  );
  const formattedIncome = useMemo(
    () => formatCurrencyValue(income, currency, exchangeRates, locale),
    [currency, exchangeRates, income, locale],
  );
  const formattedExpense = useMemo(
    () => formatCurrencyValue(totalExpense, currency, exchangeRates, locale),
    [currency, exchangeRates, locale, totalExpense],
  );
  const balanceState = remainingBalance > 0 ? 'positive' : remainingBalance < 0 ? 'negative' : 'neutral';
  const isBalanceNegative = balanceState === 'negative';
  const balanceTone =
    balanceState === 'positive'
      ? styles.balancePositive
      : balanceState === 'negative'
        ? styles.balanceNegative
        : styles.balanceNeutral;
  const heroCardTone =
    balanceState === 'negative'
      ? styles.heroCardNegative
      : balanceState === 'neutral'
        ? styles.heroCardNeutral
        : undefined;
  const heroGradientColors =
    balanceState === 'positive'
      ? (['rgba(16,185,129,0.28)', 'rgba(20,184,166,0.08)'] as const)
      : balanceState === 'negative'
        ? (['rgba(239,68,68,0.28)', 'rgba(127,29,29,0.1)'] as const)
        : (['rgba(59,130,246,0.24)', 'rgba(14,165,233,0.08)'] as const);

  const saveIncome = () => {
    const parsed = Number(incomeInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError(t('incomeValidation'));
      return;
    }

    onIncomeChange(parsed);
    setIsEditing(false);
    setError('');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={heroGradientColors} style={[styles.heroCard, heroCardTone]}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.eyebrow}>
              {t('netRemainingBalance')} ({currency})
            </Text>
            <Text style={[styles.balance, balanceTone]}>{formattedBalance}</Text>
            {currency !== 'TRY' ? (
              <Text style={styles.tryHint}>
                {t('tryEquivalent')} ₺
                {remainingBalance.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            ) : null}
          </View>
          <View style={styles.heroIcon}>
            <WalletCards color="#5eead4" size={24} />
          </View>
        </View>
        <Text style={styles.heroHint}>
          {isBalanceNegative
            ? t('budgetExceeded')
            : t('rateDate', {
                date: exchangeRates.sourceDate,
                stale: exchangeRates.isStale ? t('rateStaleParen') : '',
              })}
        </Text>
      </LinearGradient>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryLabel}>{t('totalIncome')}</Text>
            <ArrowUpRight color="#34d399" size={17} />
          </View>
          {isEditing ? (
            <View>
              <View style={styles.incomeEditRow}>
                <TextInput
                  value={incomeInput}
                  onChangeText={setIncomeInput}
                  keyboardType="decimal-pad"
                  placeholder="TRY 0.00"
                  placeholderTextColor="#475569"
                  autoFocus
                  style={styles.incomeInput}
                />
                <Pressable onPress={saveIncome} style={styles.saveButton}>
                  <Check color="#022c22" size={18} />
                </Pressable>
              </View>
              <Text style={styles.editHint}>{t('incomeSavedAsTry')}</Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          ) : (
            <View style={styles.valueRow}>
              <Text style={[styles.summaryValue, styles.incomeValue]}>{formattedIncome}</Text>
              <Pressable
                onPress={() => {
                  setIncomeInput(String(income));
                  setIsEditing(true);
                }}
                hitSlop={10}
              >
                <Pencil color="#94a3b8" size={15} />
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryLabel}>{t('totalExpense')}</Text>
            <ArrowDownRight color="#fb7185" size={17} />
          </View>
          <Text style={[styles.summaryValue, styles.expenseValue]}>{formattedExpense}</Text>
          <Text style={styles.ratioText}>{t('usedIncomeRatio', { ratio: spendRatio })}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  heroCard: {
    borderColor: 'rgba(45, 212, 191, 0.2)',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 22,
  },
  heroCardNegative: {
    borderColor: 'rgba(248, 113, 113, 0.28)',
  },
  heroCardNeutral: {
    borderColor: 'rgba(96, 165, 250, 0.26)',
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  balance: {
    fontSize: 35,
    fontWeight: '900',
    letterSpacing: -1.2,
    marginTop: 7,
  },
  balancePositive: {
    color: '#34d399',
  },
  balanceNegative: {
    color: '#fb7185',
  },
  balanceNeutral: {
    color: '#60a5fa',
  },
  tryHint: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(94, 234, 212, 0.22)',
    borderRadius: 18,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  heroHint: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderColor: 'rgba(51, 65, 85, 0.78)',
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    minHeight: 132,
    padding: 16,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 16,
  },
  incomeValue: {
    color: '#34d399',
  },
  expenseValue: {
    color: '#fb7185',
  },
  valueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  incomeEditRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 13,
  },
  incomeInput: {
    backgroundColor: '#020617',
    borderColor: '#10b981',
    borderRadius: 14,
    borderWidth: 1,
    color: '#f8fafc',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#34d399',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  editHint: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  errorText: {
    color: '#fb7185',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  ratioText: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251, 113, 133, 0.12)',
    borderRadius: 8,
    color: '#fb7185',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 9,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
