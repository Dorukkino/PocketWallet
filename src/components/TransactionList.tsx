import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search, Trash2 } from 'lucide-react-native';

import { useI18n } from '../i18n';
import { formatCurrencyValue } from '../lib/currency';
import type { CategoryName, CurrencyCode, ExchangeRates, Expense, ExpenseCategory } from '../types/budget';
import { CategoryIcon } from './CategoryIcon';

type Props = {
  expenses: Expense[];
  categories: ExpenseCategory[];
  currency: CurrencyCode;
  exchangeRates: ExchangeRates;
  onDeleteExpense: (id: string) => Promise<void>;
};

type FilterName = CategoryName | 'Hepsi';

export function TransactionList({ expenses, categories, currency, exchangeRates, onDeleteExpense }: Props) {
  const { categoryLabel, expenseTitleLabel, locale, t } = useI18n();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterName>('Hepsi');

  const filteredExpenses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return expenses.filter((expense) => {
      const matchesFilter = filter === 'Hepsi' || expense.category === filter;
      const localizedCategory = categoryLabel(expense.category).toLocaleLowerCase(locale);
      const localizedTitle = expenseTitleLabel(expense.title).toLocaleLowerCase(locale);
      const matchesQuery =
        !normalizedQuery ||
        expense.title.toLocaleLowerCase(locale).includes(normalizedQuery) ||
        expense.category.toLocaleLowerCase(locale).includes(normalizedQuery) ||
        localizedTitle.includes(normalizedQuery) ||
        localizedCategory.includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [categoryLabel, expenseTitleLabel, expenses, filter, locale, query]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('latestTransactions')}</Text>
          <Text style={styles.subtitle}>{t('transactionCount', { count: expenses.length })}</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Search color="#64748b" size={16} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('searchExpenses')}
          placeholderTextColor="#475569"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filters}>
        <Pressable
          onPress={() => setFilter('Hepsi')}
          style={[styles.filterPill, filter === 'Hepsi' && styles.activeAllPill]}
        >
          <Text style={[styles.filterText, filter === 'Hepsi' && styles.activeAllText]}>{t('all')}</Text>
        </Pressable>
        {categories.map((category) => {
          const isActive = filter === category.name;
          return (
            <Pressable
              key={category.name}
              onPress={() => setFilter(category.name)}
              style={[
                styles.filterPill,
                isActive && {
                  backgroundColor: category.softColor,
                  borderColor: category.color,
                },
              ]}
            >
              <Text style={[styles.filterText, isActive && { color: '#f8fafc' }]}>{categoryLabel(category.name)}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.list}>
        {filteredExpenses.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>{t('noMatch')}</Text>
            <Text style={styles.emptyText}>{t('noMatchText')}</Text>
          </View>
        ) : (
          filteredExpenses.map((expense) => {
            const category = categories.find((item) => item.name === expense.category) ?? {
              id: 'fallback',
              name: expense.category,
              color: '#64748b',
              softColor: 'rgba(100, 116, 139, 0.16)',
              icon: 'briefcase',
            };

            return (
              <View key={expense.id} style={styles.item}>
                <View style={[styles.itemIcon, { backgroundColor: category.softColor }]}>
                  <CategoryIcon icon={category.icon} color={category.color} />
                </View>

                <View style={styles.itemContent}>
                  <Text numberOfLines={1} style={styles.itemTitle}>
                    {expenseTitleLabel(expense.title)}
                  </Text>
                  <View style={styles.itemMetaRow}>
                    <Text style={[styles.itemCategory, { color: category.color }]}>{categoryLabel(expense.category)}</Text>
                    <Text style={styles.itemDate}>{expense.spentOn}</Text>
                    {expense.pending ? <Text style={styles.pendingText}>{t('pending')}</Text> : null}
                  </View>
                </View>

                <View style={styles.itemRight}>
                  <Text style={styles.itemAmount}>-{formatCurrencyValue(expense.amount, currency, exchangeRates, locale)}</Text>
                  {currency !== 'TRY' ? (
                    <Text style={styles.itemTryAmount}>
                      ₺{expense.amount.toLocaleString(locale, { minimumFractionDigits: 2 })}
                    </Text>
                  ) : null}
                  <Pressable onPress={() => onDeleteExpense(expense.id)} hitSlop={10} style={styles.deleteButton}>
                    <Trash2 color="#fb7185" size={17} />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderColor: 'rgba(51, 65, 85, 0.78)',
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: '#f8fafc',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 12,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 14,
  },
  filterPill: {
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  activeAllPill: {
    backgroundColor: '#e2e8f0',
    borderColor: '#e2e8f0',
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '900',
  },
  activeAllText: {
    color: '#020617',
  },
  list: {
    gap: 10,
    marginTop: 16,
  },
  emptyBox: {
    alignItems: 'center',
    borderColor: '#1e293b',
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 26,
  },
  emptyTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '900',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  item: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.84)',
    borderColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    padding: 12,
  },
  itemIcon: {
    alignItems: 'center',
    borderRadius: 15,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  itemMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 5,
  },
  itemCategory: {
    fontSize: 11,
    fontWeight: '900',
  },
  itemDate: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  pendingText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '900',
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  itemAmount: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
  },
  itemTryAmount: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(251, 113, 133, 0.1)',
    borderRadius: 10,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
});
