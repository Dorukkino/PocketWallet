import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BudgetSnapshot } from '../types/budget';

const STORAGE_PREFIX = 'pocketwallet_budget_v1';

const keyForUser = (userId?: string) => `${STORAGE_PREFIX}:${userId ?? 'guest'}`;

export async function readBudgetSnapshot(userId?: string): Promise<BudgetSnapshot | null> {
  const raw = await AsyncStorage.getItem(keyForUser(userId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as BudgetSnapshot;
  } catch {
    await AsyncStorage.removeItem(keyForUser(userId));
    return null;
  }
}

export async function writeBudgetSnapshot(userId: string | undefined, snapshot: BudgetSnapshot) {
  await AsyncStorage.setItem(keyForUser(userId), JSON.stringify(snapshot));
}

export async function removeBudgetSnapshot(userId?: string) {
  await AsyncStorage.removeItem(keyForUser(userId));
}
