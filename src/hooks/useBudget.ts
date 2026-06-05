import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { CATEGORIES, CATEGORY_COLORS, DEFAULT_EXPENSES, DEFAULT_INCOME } from '../constants/categories';
import { readBudgetSnapshot, writeBudgetSnapshot } from '../lib/storage';
import { supabase } from '../lib/supabase';
import type { BudgetSnapshot, CategoryName, CurrencyCode, Expense, ExpenseCategory } from '../types/budget';

type ExpenseInsert = {
  title: string;
  amount: number;
  category: CategoryName;
  spentOn: string;
};

const today = () => new Date().toISOString().slice(0, 10);

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

export function useBudget(session: Session | null) {
  const userId = session?.user.id;
  const [income, setIncomeState] = useState(DEFAULT_INCOME);
  const [currency, setCurrencyState] = useState<CurrencyCode>('TRY');
  const [expenses, setExpenses] = useState<Expense[]>(DEFAULT_EXPENSES);
  const [categories, setCategories] = useState<ExpenseCategory[]>(CATEGORIES);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const snapshot = useMemo<BudgetSnapshot>(
    () => ({
      income,
      currency,
      expenses,
      categories,
      updatedAt: new Date().toISOString(),
    }),
    [categories, currency, expenses, income],
  );

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      setIsHydrating(true);
      setError(null);

      const cached = await readBudgetSnapshot(userId);
      if (mounted && cached) {
        setIncomeState(cached.income);
        setCurrencyState(cached.currency);
        setExpenses(cached.expenses);
        if (cached.categories?.length) {
          setCategories(cached.categories);
        }
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
        setError('Bulut verileri alınamadı, yerel verilerle devam ediliyor.');
      } else {
        const remoteIncome = settingsResult.data?.monthly_income;
        const remoteCurrency = settingsResult.data?.currency as CurrencyCode | undefined;
        const remoteExpenses = expensesResult.data?.map(fromRemoteExpense) ?? [];
        const remoteCategories = categoriesResult.data?.map(fromRemoteCategory) ?? [];

        if (remoteIncome !== undefined && remoteIncome !== null) {
          setIncomeState(Number(remoteIncome));
        }
        if (remoteCurrency) {
          setCurrencyState(remoteCurrency);
        }
        if (remoteExpenses.length > 0) {
          setExpenses(remoteExpenses);
        }
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
            monthly_income: cached?.income ?? DEFAULT_INCOME,
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
  }, [userId]);

  useEffect(() => {
    if (!isHydrating) {
      writeBudgetSnapshot(userId, snapshot).catch(() => {
        setError('Yerel kayıt güncellenemedi.');
      });
    }
  }, [isHydrating, snapshot, userId]);

  const totals = useMemo(() => {
    const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
    return {
      totalExpense,
      remainingBalance: income - totalExpense,
      spendRatio: income > 0 ? Math.round((totalExpense / income) * 100) : 0,
    };
  }, [expenses, income]);

  const categoryStats = useMemo(() => {
    return categories.map((category) => {
      const total = expenses
        .filter((item) => item.category === category.name)
        .reduce((sum, item) => sum + item.amount, 0);

      return {
        name: category.name,
        color: category.color,
        icon: category.icon,
        total,
        percentage: totals.totalExpense > 0 ? Math.round((total / totals.totalExpense) * 100) : 0,
      };
    }).filter((item) => item.total > 0);
  }, [categories, expenses, totals.totalExpense]);

  const updateIncome = useCallback(
    async (nextIncome: number) => {
      setIncomeState(nextIncome);

      if (!userId) {
        return;
      }

      setIsSyncing(true);
      const { error: updateError } = await supabase.from('user_settings').upsert({
        user_id: userId,
        monthly_income: nextIncome,
        currency,
      });
      setIsSyncing(false);

      if (updateError) {
        setError('Gelir buluta kaydedilemedi, yerel kayıt korundu.');
      }
    },
    [currency, userId],
  );

  const updateCurrency = useCallback(
    async (nextCurrency: CurrencyCode) => {
      setCurrencyState(nextCurrency);

      if (!userId) {
        return;
      }

      const { error: updateError } = await supabase.from('user_settings').upsert({
        user_id: userId,
        monthly_income: income,
        currency: nextCurrency,
      });

      if (updateError) {
        setError('Para birimi buluta kaydedilemedi, yerel kayıt korundu.');
      }
    },
    [income, userId],
  );

  const addExpense = useCallback(
    async (input: ExpenseInsert) => {
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
        setError('Gider buluta kaydedilemedi, yerel kayıt korundu.');
        setExpenses((current) => current.map((item) => (item.id === newExpense.id ? { ...item, pending: true } : item)));
        return;
      }

      setExpenses((current) => current.map((item) => (item.id === newExpense.id ? { ...item, pending: false } : item)));
    },
    [userId],
  );

  const addCategory = useCallback(
    async (name: string, icon = 'briefcase', selectedColor?: string) => {
      const normalizedName = normalizeCategoryName(name);
      if (normalizedName.length < 2) {
        setError('Kategori adı en az 2 karakter olmalı.');
        return false;
      }

      const duplicate = categories.some(
        (category) => category.name.toLocaleLowerCase('tr-TR') === normalizedName.toLocaleLowerCase('tr-TR'),
      );
      if (duplicate) {
        setError('Bu kategori zaten var.');
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
        setError('Kategori buluta kaydedilemedi, yerel kayıt korundu.');
        return true;
      }

      setCategories((current) =>
        current.map((category) => (category.id === newCategory.id ? { ...category, pending: false } : category)),
      );
      return true;
    },
    [categories, userId],
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      const category = categories.find((item) => item.id === categoryId);
      if (!category) {
        return false;
      }

      const isUsed = expenses.some((expense) => expense.category === category.name);
      if (isUsed) {
        setError('Bu kategori giderlerde kullanılıyor. Önce ilgili giderleri silmelisiniz.');
        return false;
      }

      if (categories.length <= 1) {
        setError('En az bir kategori kalmalı.');
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
        setError('Kategori silinemedi, kayıt geri yüklendi.');
        setCategories((current) => [...current, category]);
        return false;
      }

      return true;
    },
    [categories, expenses, userId],
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
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
        setError('Gider silinemedi, kayıt geri yüklendi.');
        setExpenses((current) => [removed as Expense, ...current]);
      }
    },
    [userId],
  );

  const refreshBudget = useCallback(async () => {
    if (!userId) {
      return;
    }

    setIsSyncing(true);
    setError(null);

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
      setError('Veriler yenilenemedi, yerel veriler korunuyor.');
      setIsSyncing(false);
      return;
    }

    if (settingsResult.data?.monthly_income !== undefined && settingsResult.data.monthly_income !== null) {
      setIncomeState(Number(settingsResult.data.monthly_income));
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
  }, [userId]);

  return {
    income,
    currency,
    expenses,
    categories,
    categoryStats,
    isHydrating,
    isSyncing,
    error,
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
    clearError: () => setError(null),
  };
}
