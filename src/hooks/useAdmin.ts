import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

export type AdminRole = 'user' | 'admin';

export type AdminUserSummary = {
  id: string;
  fullName: string;
  email: string;
  role: AdminRole;
  createdAt: string;
};

export type AdminStats = {
  users: number;
  expenses: number;
  categories: number;
  settings: number;
};

export type AdminErrorKey = 'adminRoleLoadFailed' | 'adminDataLoadFailed';

const emptyStats: AdminStats = {
  users: 0,
  expenses: 0,
  categories: 0,
  settings: 0,
};

const normalizeRole = (role?: string | null): AdminRole => (role === 'admin' ? 'admin' : 'user');

const countRows = async (tableName: 'user_settings' | 'expenses' | 'expense_categories') => {
  const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });

  return { count: count ?? 0, error };
};

export function useAdmin(session: Session | null) {
  const userId = session?.user.id;
  const [role, setRole] = useState<AdminRole | null>(null);
  const [stats, setStats] = useState<AdminStats>(emptyStats);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorKey, setErrorKey] = useState<AdminErrorKey | null>(null);

  const loadAdmin = useCallback(
    async (refreshing = false) => {
      if (!userId) {
        setRole(null);
        setStats(emptyStats);
        setUsers([]);
        setIsLoading(false);
        setIsRefreshing(false);
        setErrorKey(null);
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorKey(null);

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        setRole('user');
        setStats(emptyStats);
        setUsers([]);
        setErrorKey('adminRoleLoadFailed');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const nextRole = normalizeRole(profile?.role);
      setRole(nextRole);

      if (nextRole !== 'admin') {
        setStats(emptyStats);
        setUsers([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const [usersResult, expensesResult, categoriesResult, settingsResult] = await Promise.all([
        supabase
          .from('users')
          .select('id, full_name, email, role, created_at', { count: 'exact' })
          .order('created_at', { ascending: false }),
        countRows('expenses'),
        countRows('expense_categories'),
        countRows('user_settings'),
      ]);

      if (usersResult.error || expensesResult.error || categoriesResult.error || settingsResult.error) {
        setErrorKey('adminDataLoadFailed');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      setStats({
        users: usersResult.count ?? usersResult.data?.length ?? 0,
        expenses: expensesResult.count,
        categories: categoriesResult.count,
        settings: settingsResult.count,
      });
      setUsers(
        (usersResult.data ?? []).map((user) => ({
          id: user.id,
          fullName: user.full_name || '-',
          email: user.email || '-',
          role: normalizeRole(user.role),
          createdAt: user.created_at,
        })),
      );
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [userId],
  );

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  const refreshAdmin = useCallback(() => loadAdmin(true), [loadAdmin]);

  return {
    role,
    isAdmin: role === 'admin',
    stats,
    users,
    isLoading,
    isRefreshing,
    errorKey,
    refreshAdmin,
  };
}
