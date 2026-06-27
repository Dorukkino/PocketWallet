import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { CATEGORIES, CATEGORY_COLORS, DEFAULT_EXPENSES, resolveCategoryDisplay } from '../constants/categories';
import { useI18n } from '../i18n';
import { withTimeout } from '../lib/async';
import { convertToTry, expenseAmountInTry, getExpenseCurrency } from '../lib/currency';
import { recordSuccessfulAction } from '../lib/rateApp';
import { readBudgetSnapshot, writeBudgetSnapshot } from '../lib/storage';
import { supabase } from '../lib/supabase';
import type {
  BudgetPeriod,
  BudgetSnapshot,
  CategoryName,
  CurrencyCode,
  ExchangeRates,
  Expense,
  ExpenseCategory,
  MonthlyIncome,
} from '../types/budget';

type ExpenseInsert = {
  title: string;
  amount: number;
  currency: CurrencyCode;
  category: CategoryName;
  spentOn: string;
};

type ErrorPlacement = 'general' | 'expenseForm' | 'transactions';
type BudgetErrors = Record<ErrorPlacement, string[]>;

const padDatePart = (value: number) => String(value).padStart(2, '0');

const dateKeyFromDate = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const today = () => dateKeyFromDate(new Date());

const dateKeyFromIso = (value?: string | null) => {
  if (!value) {
    return today();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? today() : dateKeyFromDate(date);
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const monthKeyFromDateKey = (dateKey: string) => dateKey.slice(0, 7);

const monthKeyFromDate = (date: Date) => monthKeyFromDateKey(dateKeyFromDate(date));

const addMonths = (monthKey: string, offset: number) => {
  const [year, month] = monthKey.split('-').map(Number);
  return monthKeyFromDate(new Date(year, month - 1 + offset, 1));
};

const startOfMonthKey = (monthKey: string) => `${monthKey}-01`;

const endOfMonthKey = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return dateKeyFromDate(new Date(year, month, 0));
};

const formatMonthLabel = (monthKey: string, locale: string) => {
  const formatted = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    parseDateKey(startOfMonthKey(monthKey)),
  );
  return formatted.charAt(0).toLocaleUpperCase(locale) + formatted.slice(1);
};

const createBudgetPeriod = (monthKey: string, budgetStartDate: string, locale: string): BudgetPeriod => {
  const firstMonthKey = monthKeyFromDateKey(budgetStartDate);
  return {
    monthKey,
    label: formatMonthLabel(monthKey, locale),
    startDate: monthKey === firstMonthKey ? budgetStartDate : startOfMonthKey(monthKey),
    endDate: endOfMonthKey(monthKey),
  };
};

const makeUuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

const fromRemoteExpense = (row: {
  id: string;
  title: string;
  amount: number | string;
  currency?: CurrencyCode | null;
  category: CategoryName;
  spent_on: string;
  created_at: string;
}): Expense => ({
  id: row.id,
  title: row.title,
  amount: Number(row.amount),
  currency: row.currency ?? 'TRY',
  category: row.category,
  spentOn: row.spent_on,
  createdAt: row.created_at,
});

const fromRemoteCategory = (row: {
  id: string;
  name: string;
  color: string;
  soft_color: string;
  icon: string;
  is_default: boolean;
}): ExpenseCategory => ({
  id: row.id,
  name: row.name,
  color: row.color,
  softColor: row.soft_color,
  icon: row.icon,
  isDefault: row.is_default,
});

const fromRemoteMonthlyIncomes = (
  rows: Array<{ month_key: string; amount: number | string; currency?: CurrencyCode | null }>,
): Record<string, MonthlyIncome> =>
  Object.fromEntries(
    rows.map((row) => [row.month_key, { amount: Number(row.amount), currency: row.currency ?? 'TRY' }]),
  );

const colorToSoftColor = (color: string) => {
  const hex = color.replace('#', '');
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, 0.14)`;
};

const normalizeCategoryName = (name: string) => name.trim().replace(/\s+/g, ' ');

const createEmptyErrors = (): BudgetErrors => ({
  general: [],
  expenseForm: [],
  transactions: [],
});
const BUDGET_REQUEST_TIMEOUT_MS = 8000;
const LOCAL_STORAGE_TIMEOUT_MS = 3000;

const defaultMonthlyIncome = (currency: CurrencyCode = 'TRY'): MonthlyIncome => ({
  amount: 0,
  currency,
});

const normalizeExpenses = (items: Expense[]): Expense[] =>
  items.map((expense) => ({
    ...expense,
    currency: getExpenseCurrency(expense),
  }));

const normalizeMonthlyIncomes = (
  data?: BudgetSnapshot['monthlyIncomes'],
  fallbackCurrency: CurrencyCode = 'TRY',
): Record<string, MonthlyIncome> => {
  if (!data) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(data).map(([monthKey, value]) => {
      if (typeof value === 'number') {
        return [monthKey, { amount: value, currency: 'TRY' }];
      }

      return [monthKey, value];
    }),
  );
};

export function useBudget(session: Session | null, exchangeRates: ExchangeRates) {
  const { locale, t } = useI18n();
  const userId = session?.user.id;
  const fallbackBudgetStartDate = dateKeyFromIso(session?.user.created_at);
  const [currency, setCurrencyState] = useState<CurrencyCode>('TRY');
  const [expenses, setExpenses] = useState<Expense[]>(DEFAULT_EXPENSES);
  const [categories, setCategories] = useState<ExpenseCategory[]>(CATEGORIES);
  const [monthlyIncomes, setMonthlyIncomes] = useState<Record<string, MonthlyIncome>>({});
  const [budgetStartDate, setBudgetStartDate] = useState(fallbackBudgetStartDate);
  const [selectedMonthKey, setSelectedMonthKey] = useState(monthKeyFromDateKey(today()));
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errors, setErrors] = useState<BudgetErrors>(createEmptyErrors);

  const incomeEntry = monthlyIncomes[selectedMonthKey] ?? defaultMonthlyIncome(currency);
  const incomeInTry = convertToTry(incomeEntry.amount, incomeEntry.currency, exchangeRates);

  const snapshot = useMemo<BudgetSnapshot>(
    () => ({
      income: incomeInTry,
      currency,
      expenses,
      categories,
      budgetStartDate,
      monthlyIncomes,
      updatedAt: new Date().toISOString(),
    }),
    [budgetStartDate, categories, currency, expenses, incomeInTry, monthlyIncomes],
  );

  const addError = useCallback((placement: ErrorPlacement, message: string) => {
    setErrors((current) =>
      current[placement].includes(message)
        ? current
        : {
            ...current,
            [placement]: [...current[placement], message],
          },
    );
  }, []);

  const clearError = useCallback((placement?: ErrorPlacement) => {
    if (!placement) {
      setErrors(createEmptyErrors());
      return;
    }

    setErrors((current) =>
      current[placement].length === 0
        ? current
        : {
            ...current,
            [placement]: [],
          },
    );
  }, []);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      setIsHydrating(true);
      clearError();
      let cached: BudgetSnapshot | null = null;

      try {
        cached = await withTimeout(readBudgetSnapshot(userId), LOCAL_STORAGE_TIMEOUT_MS, 'Budget cache read timed out.').catch(
          () => null,
        );

        if (mounted && cached) {
          setCurrencyState(cached.currency);
          setExpenses(normalizeExpenses(cached.expenses));
          setMonthlyIncomes(normalizeMonthlyIncomes(cached.monthlyIncomes, cached.currency));
          if (cached.budgetStartDate) {
            setBudgetStartDate(cached.budgetStartDate);
          } else {
            setBudgetStartDate(fallbackBudgetStartDate);
          }
          if (cached.categories?.length) {
            setCategories(cached.categories);
          }
        } else if (mounted) {
          setBudgetStartDate(fallbackBudgetStartDate);
        }

        if (!userId) {
          return;
        }

        setIsSyncing(true);
        const [settingsResult, expensesResult, categoriesResult, incomesResult] = await withTimeout(
          Promise.all([
            supabase.from('user_settings').select('monthly_income, currency').eq('user_id', userId).maybeSingle(),
            supabase
              .from('expenses')
              .select('id, title, amount, currency, category, spent_on, created_at')
              .eq('user_id', userId)
              .order('spent_on', { ascending: false })
              .order('created_at', { ascending: false }),
            supabase
              .from('expense_categories')
              .select('id, name, color, soft_color, icon, is_default')
              .eq('user_id', userId)
              .order('is_default', { ascending: false })
              .order('created_at', { ascending: true }),
            supabase.from('monthly_incomes').select('month_key, amount, currency').eq('user_id', userId),
          ]),
          BUDGET_REQUEST_TIMEOUT_MS,
          'Budget data request timed out.',
        );

        if (!mounted) {
          return;
        }

        if (settingsResult.error || expensesResult.error || categoriesResult.error || incomesResult.error) {
          addError('general', t('remoteFetchFailed'));
        } else {
          const remoteCurrency = settingsResult.data?.currency as CurrencyCode | undefined;
          const remoteExpenses = expensesResult.data?.map(fromRemoteExpense) ?? [];
          const remoteCategories = categoriesResult.data?.map(fromRemoteCategory) ?? [];
          const remoteIncomes = fromRemoteMonthlyIncomes(incomesResult.data ?? []);

          if (remoteCurrency) {
            setCurrencyState(remoteCurrency);
          }
          setExpenses(normalizeExpenses(remoteExpenses));
          setMonthlyIncomes(remoteIncomes);
          if (remoteCategories.length > 0) {
            setCategories(remoteCategories);
          } else {
            await withTimeout(
              Promise.all(
                CATEGORIES.map((category) =>
                  supabase.from('expense_categories').upsert({
                    user_id: userId,
                    name: category.name,
                    color: category.color,
                    soft_color: category.softColor,
                    icon: category.icon,
                    is_default: true,
                  }),
                ),
              ),
              BUDGET_REQUEST_TIMEOUT_MS,
              'Default category sync timed out.',
            );
          }

          if (!settingsResult.data) {
            await withTimeout(
              supabase.from('user_settings').upsert({
                user_id: userId,
                monthly_income: 0,
                currency: cached?.currency ?? 'TRY',
              }),
              BUDGET_REQUEST_TIMEOUT_MS,
              'User settings sync timed out.',
            );
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('Budget hydration failed', error);
        }

        if (mounted) {
          addError('general', t('remoteFetchFailed'));
        }
      } finally {
        if (mounted) {
          setIsSyncing(false);
          setIsHydrating(false);
        }
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, [addError, clearError, fallbackBudgetStartDate, t, userId]);

  useEffect(() => {
    if (!isHydrating) {
      writeBudgetSnapshot(userId, snapshot).catch(() => {
        addError('general', t('localSaveFailed'));
      });
    }
  }, [addError, isHydrating, snapshot, t, userId]);

  useEffect(() => {
    if (!userId || isHydrating) {
      return;
    }

    const applyRemoteIncomeRow = (row: { month_key: string; amount: number | string; currency?: CurrencyCode | null }) => {
      setMonthlyIncomes((current) => ({
        ...current,
        [row.month_key]: { amount: Number(row.amount), currency: row.currency ?? 'TRY' },
      }));
    };

    const channel = supabase
      .channel(`budget-sync-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'monthly_incomes',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          applyRemoteIncomeRow(payload.new as { month_key: string; amount: number | string; currency?: CurrencyCode | null });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'monthly_incomes',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          applyRemoteIncomeRow(payload.new as { month_key: string; amount: number | string; currency?: CurrencyCode | null });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'monthly_incomes',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const monthKey = (payload.old as { month_key?: string }).month_key;
          if (!monthKey) {
            return;
          }

          setMonthlyIncomes((current) => {
            const next = { ...current };
            delete next[monthKey];
            return next;
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const expense = fromRemoteExpense(
            payload.new as Parameters<typeof fromRemoteExpense>[0],
          );
          setExpenses((current) => {
            if (current.some((item) => item.id === expense.id)) {
              return current;
            }

            return normalizeExpenses([expense, ...current]);
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const expense = fromRemoteExpense(
            payload.new as Parameters<typeof fromRemoteExpense>[0],
          );
          setExpenses((current) =>
            normalizeExpenses(
              current.map((item) => (item.id === expense.id ? { ...expense, pending: false } : item)),
            ),
          );
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const expenseId = (payload.old as { id?: string }).id;
          if (!expenseId) {
            return;
          }

          setExpenses((current) => current.filter((item) => item.id !== expenseId));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isHydrating, userId]);

  const selectedPeriod = useMemo(
    () => createBudgetPeriod(selectedMonthKey, budgetStartDate, locale),
    [budgetStartDate, locale, selectedMonthKey],
  );

  const monthOptions = useMemo(() => {
    const firstMonthKey = monthKeyFromDateKey(budgetStartDate);
    const lastMonthKey = monthKeyFromDate(new Date());
    const options: BudgetPeriod[] = [];
    let nextMonthKey = firstMonthKey;

    while (nextMonthKey <= lastMonthKey) {
      options.push(createBudgetPeriod(nextMonthKey, budgetStartDate, locale));
      nextMonthKey = addMonths(nextMonthKey, 1);
    }

    return options.reverse();
  }, [budgetStartDate, locale]);

  const periodExpenses = useMemo(
    () =>
      expenses.filter((expense) => expense.spentOn >= selectedPeriod.startDate && expense.spentOn <= selectedPeriod.endDate),
    [expenses, selectedPeriod.endDate, selectedPeriod.startDate],
  );

  const defaultExpenseDate = useMemo(() => {
    const currentDate = today();
    return currentDate >= selectedPeriod.startDate && currentDate <= selectedPeriod.endDate
      ? currentDate
      : selectedPeriod.startDate;
  }, [selectedPeriod.endDate, selectedPeriod.startDate]);

  const totals = useMemo(() => {
    const totalExpense = periodExpenses.reduce((sum, item) => sum + expenseAmountInTry(item, exchangeRates), 0);
    const remainingBalance = incomeInTry - totalExpense;
    return {
      totalExpense,
      remainingBalance,
      spendRatio: incomeInTry > 0 ? Math.round((totalExpense / incomeInTry) * 100) : 0,
    };
  }, [exchangeRates, incomeInTry, periodExpenses]);

  const categoryStats = useMemo(() => {
    const totalsByCategory = new Map<CategoryName, number>();

    periodExpenses.forEach((expense) => {
      const nextTotal = (totalsByCategory.get(expense.category) ?? 0) + expenseAmountInTry(expense, exchangeRates);
      totalsByCategory.set(expense.category, nextTotal);
    });

    return [...totalsByCategory.entries()]
      .map(([categoryName, total]) => {
        const category = resolveCategoryDisplay(categoryName, categories);

        return {
          name: categoryName,
          color: category.color,
          icon: category.icon,
          total,
          percentage: totals.totalExpense > 0 ? Math.round((total / totals.totalExpense) * 100) : 0,
        };
      })
      .filter((item) => item.total > 0)
      .sort((first, second) => second.total - first.total);
  }, [categories, exchangeRates, periodExpenses, totals.totalExpense]);

  const updateIncome = useCallback(
    async (nextIncome: number, incomeCurrency: CurrencyCode) => {
      setMonthlyIncomes((current) => ({
        ...current,
        [selectedMonthKey]: { amount: nextIncome, currency: incomeCurrency },
      }));

      if (!userId) {
        return;
      }

      const { error: upsertError } = await supabase.from('monthly_incomes').upsert(
        {
          user_id: userId,
          month_key: selectedMonthKey,
          amount: nextIncome,
          currency: incomeCurrency,
        },
        { onConflict: 'user_id,month_key' },
      );

      if (upsertError) {
        addError('general', t('incomeSaveFailed'));
      }
    },
    [addError, selectedMonthKey, t, userId],
  );

  const updateCurrency = useCallback(
    async (nextCurrency: CurrencyCode) => {
      clearError('general');
      setCurrencyState(nextCurrency);

      if (!userId) {
        return;
      }

      const { error: updateError } = await supabase.from('user_settings').upsert({
        user_id: userId,
        monthly_income: 0,
        currency: nextCurrency,
      });

      if (updateError) {
        addError('general', t('currencySavedFailed'));
      }
    },
    [addError, clearError, t, userId],
  );

  const addExpense = useCallback(
    async (input: ExpenseInsert) => {
      clearError('expenseForm');
      const newExpense: Expense = {
        id: makeUuid(),
        title: input.title.trim(),
        amount: input.amount,
        currency: input.currency,
        category: input.category,
        spentOn: input.spentOn || today(),
        createdAt: new Date().toISOString(),
        pending: Boolean(userId),
      };

      setExpenses((current) => [newExpense, ...current]);

      if (!userId) {
        void recordSuccessfulAction();
        return;
      }

      const { error: insertError } = await supabase.from('expenses').insert({
        id: newExpense.id,
        user_id: userId,
        title: newExpense.title,
        amount: newExpense.amount,
        currency: newExpense.currency,
        category: newExpense.category,
        spent_on: newExpense.spentOn,
      });

      if (insertError) {
        addError('expenseForm', t('expenseSaveFailed'));
        setExpenses((current) => current.map((item) => (item.id === newExpense.id ? { ...item, pending: true } : item)));
        return;
      }

      setExpenses((current) => current.map((item) => (item.id === newExpense.id ? { ...item, pending: false } : item)));
      void recordSuccessfulAction();
    },
    [addError, clearError, t, userId],
  );

  const addCategory = useCallback(
    async (name: string, icon = 'briefcase', selectedColor?: string) => {
      clearError('expenseForm');
      const normalizedName = normalizeCategoryName(name);
      if (normalizedName.length < 2) {
        addError('expenseForm', t('categoryNameMin'));
        return false;
      }

      const duplicate = categories.some(
        (category) => category.name.toLocaleLowerCase(locale) === normalizedName.toLocaleLowerCase(locale),
      );
      if (duplicate) {
        addError('expenseForm', t('categoryAlreadyExists'));
        return false;
      }

      const color = selectedColor ?? CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length];
      const newCategory: ExpenseCategory = {
        id: makeUuid(),
        name: normalizedName,
        color,
        softColor: colorToSoftColor(color),
        icon,
        isDefault: false,
        pending: Boolean(userId),
      };

      setCategories((current) => [...current, newCategory]);

      if (!userId) {
        return true;
      }

      const { error: insertError } = await supabase.from('expense_categories').insert({
        id: newCategory.id,
        user_id: userId,
        name: newCategory.name,
        color: newCategory.color,
        soft_color: newCategory.softColor,
        icon: newCategory.icon,
        is_default: false,
      });

      if (insertError) {
        addError('expenseForm', t('categorySaveFailed'));
        return true;
      }

      setCategories((current) =>
        current.map((category) => (category.id === newCategory.id ? { ...category, pending: false } : category)),
      );
      return true;
    },
    [addError, categories, clearError, locale, t, userId],
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      clearError('expenseForm');
      const category = categories.find((item) => item.id === categoryId);
      if (!category) {
        return false;
      }

      if (categories.length <= 1) {
        addError('expenseForm', t('atLeastOneCategory'));
        return false;
      }

      setCategories((current) => current.filter((item) => item.id !== categoryId));

      if (!userId || category.id.startsWith('default-')) {
        return true;
      }

      const { error: deleteError } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', userId);

      if (deleteError) {
        addError('expenseForm', t('categoryDeleteFailed'));
        setCategories((current) => [...current, category]);
        return false;
      }

      return true;
    },
    [addError, categories, clearError, t, userId],
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      clearError('transactions');
      let removed: Expense | undefined;
      setExpenses((current) => {
        removed = current.find((item) => item.id === expenseId);
        return current.filter((item) => item.id !== expenseId);
      });

      if (!userId) {
        return;
      }

      const { error: deleteError } = await supabase.from('expenses').delete().eq('id', expenseId).eq('user_id', userId);
      if (deleteError && removed) {
        addError('transactions', t('deleteExpenseFailed'));
        setExpenses((current) => [removed as Expense, ...current]);
      }
    },
    [addError, clearError, t, userId],
  );

  const refreshBudget = useCallback(async () => {
    if (!userId) {
      return;
    }

    setIsSyncing(true);
    clearError();

    try {
      const [settingsResult, expensesResult, categoriesResult, incomesResult] = await withTimeout(
        Promise.all([
          supabase.from('user_settings').select('monthly_income, currency').eq('user_id', userId).maybeSingle(),
          supabase
            .from('expenses')
            .select('id, title, amount, currency, category, spent_on, created_at')
            .eq('user_id', userId)
            .order('spent_on', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase
            .from('expense_categories')
            .select('id, name, color, soft_color, icon, is_default')
            .eq('user_id', userId)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: true }),
          supabase.from('monthly_incomes').select('month_key, amount, currency').eq('user_id', userId),
        ]),
        BUDGET_REQUEST_TIMEOUT_MS,
        'Budget refresh timed out.',
      );

      if (settingsResult.error || expensesResult.error || categoriesResult.error || incomesResult.error) {
        addError('general', t('remoteRefreshFailed'));
        return;
      }

      const remoteCurrency = settingsResult.data?.currency as CurrencyCode | undefined;
      if (remoteCurrency) {
        setCurrencyState(remoteCurrency);
      }

      setExpenses(normalizeExpenses(expensesResult.data?.map(fromRemoteExpense) ?? []));
      setMonthlyIncomes(fromRemoteMonthlyIncomes(incomesResult.data ?? []));

      const remoteCategories = categoriesResult.data?.map(fromRemoteCategory) ?? [];
      if (remoteCategories.length > 0) {
        setCategories(remoteCategories);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Budget refresh failed', error);
      }

      addError('general', t('remoteRefreshFailed'));
    } finally {
      setIsSyncing(false);
    }
  }, [addError, clearError, t, userId]);

  return {
    incomeEntry,
    incomeInTry,
    currency,
    expenses: periodExpenses,
    categories,
    categoryStats,
    selectedPeriod,
    monthOptions,
    defaultExpenseDate,
    isHydrating,
    isSyncing,
    error: errors.general[0] ?? null,
    errors: errors.general,
    expenseFormErrors: errors.expenseForm,
    transactionErrors: errors.transactions,
    totalExpense: totals.totalExpense,
    remainingBalance: totals.remainingBalance,
    spendRatio: totals.spendRatio,
    updateIncome,
    updateCurrency,
    addExpense,
    deleteExpense,
    addCategory,
    deleteCategory,
    refreshBudget,
    selectMonth: setSelectedMonthKey,
    clearError,
  };
}
