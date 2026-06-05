import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { CATEGORIES, CATEGORY_COLORS, DEFAULT_EXPENSES } from '../constants/categories';
import { useI18n } from '../i18n';
import { readBudgetSnapshot, writeBudgetSnapshot } from '../lib/storage';
import { supabase } from '../lib/supabase';
import type { BudgetPeriod, BudgetSnapshot, CategoryName, CurrencyCode, Expense, ExpenseCategory } from '../types/budget';

type ExpenseInsert = {
  title: string;
  amount: number;
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
  category: CategoryName;
  spent_on: string;
  created_at: string;
}): Expense => ({
  id: row.id,
  title: row.title,
  amount: Number(row.amount),
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

export function useBudget(session: Session | null) {
  const { locale, t } = useI18n();
  const userId = session?.user.id;
  const fallbackBudgetStartDate = dateKeyFromIso(session?.user.created_at);
  const [currency, setCurrencyState] = useState<CurrencyCode>('TRY');
  const [expenses, setExpenses] = useState<Expense[]>(DEFAULT_EXPENSES);
  const [categories, setCategories] = useState<ExpenseCategory[]>(CATEGORIES);
  const [monthlyIncomes, setMonthlyIncomes] = useState<Record<string, number>>({});
  const [budgetStartDate, setBudgetStartDate] = useState(fallbackBudgetStartDate);
  const [selectedMonthKey, setSelectedMonthKey] = useState(monthKeyFromDateKey(today()));
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errors, setErrors] = useState<BudgetErrors>(createEmptyErrors);

  const income = monthlyIncomes[selectedMonthKey] ?? 0;

  const snapshot = useMemo<BudgetSnapshot>(
    () => ({
      income,
      currency,
      expenses,
      categories,
      budgetStartDate,
      monthlyIncomes,
      updatedAt: new Date().toISOString(),
    }),
    [budgetStartDate, categories, currency, expenses, income, monthlyIncomes],
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

      const cached = await readBudgetSnapshot(userId);
      if (mounted && cached) {
        setCurrencyState(cached.currency);
        setExpenses(cached.expenses);
        setMonthlyIncomes(cached.monthlyIncomes ?? {});
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
        setIsHydrating(false);
        return;
      }

      setIsSyncing(true);
      const [settingsResult, expensesResult, categoriesResult] = await Promise.all([
        supabase.from('user_settings').select('monthly_income, currency').eq('user_id', userId).maybeSingle(),
        supabase
          .from('expenses')
          .select('id, title, amount, category, spent_on, created_at')
          .eq('user_id', userId)
          .order('spent_on', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('expense_categories')
          .select('id, name, color, soft_color, icon, is_default')
          .eq('user_id', userId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true }),
      ]);

      if (!mounted) {
        return;
      }

      if (settingsResult.error || expensesResult.error || categoriesResult.error) {
        addError('general', t('remoteFetchFailed'));
      } else {
        const remoteCurrency = settingsResult.data?.currency as CurrencyCode | undefined;
        const remoteExpenses = expensesResult.data?.map(fromRemoteExpense) ?? [];
        const remoteCategories = categoriesResult.data?.map(fromRemoteCategory) ?? [];

        if (remoteCurrency) {
          setCurrencyState(remoteCurrency);
        }
        setExpenses(remoteExpenses);
        if (remoteCategories.length > 0) {
          setCategories(remoteCategories);
        } else {
          await Promise.all(
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
          );
        }

        if (!settingsResult.data) {
          await supabase.from('user_settings').upsert({
            user_id: userId,
            monthly_income: 0,
            currency: cached?.currency ?? 'TRY',
          });
        }
      }

      setIsSyncing(false);
      setIsHydrating(false);
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
    const totalExpense = periodExpenses.reduce((sum, item) => sum + item.amount, 0);
    return {
      totalExpense,
      remainingBalance: income - totalExpense,
      spendRatio: income > 0 ? Math.round((totalExpense / income) * 100) : 0,
    };
  }, [periodExpenses, income]);

  const categoryStats = useMemo(() => {
    return categories.map((category) => {
      const total = periodExpenses
        .filter((item) => item.category === category.name)
        .reduce((sum, item) => sum + item.amount, 0);

      return {
        name: category.name,
        color: category.color,
        icon: category.icon,
        total,
        percentage: totals.totalExpense > 0 ? Math.round((total / totals.totalExpense) * 100) : 0,
      };
    }).filter((item) => item.total > 0).sort((first, second) => second.total - first.total);
  }, [categories, periodExpenses, totals.totalExpense]);

  const updateIncome = useCallback(
    async (nextIncome: number) => {
      setMonthlyIncomes((current) => ({
        ...current,
        [selectedMonthKey]: nextIncome,
      }));
    },
    [selectedMonthKey],
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
        category: input.category,
        spentOn: input.spentOn || today(),
        createdAt: new Date().toISOString(),
        pending: Boolean(userId),
      };

      setExpenses((current) => [newExpense, ...current]);

      if (!userId) {
        return;
      }

      const { error: insertError } = await supabase.from('expenses').insert({
        id: newExpense.id,
        user_id: userId,
        title: newExpense.title,
        amount: newExpense.amount,
        category: newExpense.category,
        spent_on: newExpense.spentOn,
      });

      if (insertError) {
        addError('expenseForm', t('expenseSaveFailed'));
        setExpenses((current) => current.map((item) => (item.id === newExpense.id ? { ...item, pending: true } : item)));
        return;
      }

      setExpenses((current) => current.map((item) => (item.id === newExpense.id ? { ...item, pending: false } : item)));
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

      const isCategoryInUse = expenses.some((expense) => expense.category === category.name);
      if (isCategoryInUse) {
        addError('expenseForm', t('categoryInUse'));
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
    [addError, categories, clearError, expenses, t, userId],
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

    const [settingsResult, expensesResult, categoriesResult] = await Promise.all([
      supabase.from('user_settings').select('monthly_income, currency').eq('user_id', userId).maybeSingle(),
      supabase
        .from('expenses')
        .select('id, title, amount, category, spent_on, created_at')
        .eq('user_id', userId)
        .order('spent_on', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('expense_categories')
        .select('id, name, color, soft_color, icon, is_default')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true }),
    ]);

    if (settingsResult.error || expensesResult.error || categoriesResult.error) {
      addError('general', t('remoteRefreshFailed'));
      setIsSyncing(false);
      return;
    }

    const remoteCurrency = settingsResult.data?.currency as CurrencyCode | undefined;
    if (remoteCurrency) {
      setCurrencyState(remoteCurrency);
    }

    setExpenses(expensesResult.data?.map(fromRemoteExpense) ?? []);

    const remoteCategories = categoriesResult.data?.map(fromRemoteCategory) ?? [];
    if (remoteCategories.length > 0) {
      setCategories(remoteCategories);
    }

    setIsSyncing(false);
  }, [addError, clearError, t, userId]);

  return {
    income,
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
